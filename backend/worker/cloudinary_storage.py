"""Cloudinary diagram storage for the Python worker - Node's counterpart is
src/lib/cloudinary-storage.js, which this deliberately mirrors: same
public_id convention (build_diagram_public_id), same "default slot has no
suffix" backward-compat rule, so an extracted diagram and a manually
uploaded one for the same question+slot always land at the exact same
Cloudinary location, and either one can overwrite the other in place.

Implemented via Cloudinary's plain HTTP upload API + a hand-rolled signed
request, not the official cloudinary Python SDK - this worker already
avoids heavy SDKs everywhere else (see gemini_provider.py's raw urllib
calls instead of google-generativeai), and one more dependency isn't worth
it for a single upload endpoint.

This closes a real, separate bug found while building multi-image support:
before this module existed, replace_questions wrote extracted diagrams to
LOCAL DISK (asset_extractor.py's now-removed build_diagram_storage_path),
while the Node backend's serving code
(question-assets.controller.js#streamDiagram) and manual-upload path both
treat question_assets.storage_path as a Cloudinary public_id
unconditionally - meaning every extracted diagram was unservable in any
deployment where the Node app and the worker don't share a filesystem
(i.e. most real deployments, and definitely any container-based one).
worker.py now uploads through this module instead.
"""

import base64
import hashlib
import json
import time
from urllib import request
from urllib.parse import urlencode

from .config import CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME


def cloudinary_configured():
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)


def build_diagram_public_id(workspace_id, mock_test_id, question_id, slot_key="default"):
    """
    Mirrors src/lib/cloudinary-storage.js#buildDiagramPublicId exactly,
    including the "default slot gets no suffix" backward-compat rule - see
    that function's own comment for why: every question_assets row that
    already existed before multi-image keeps resolving to the exact
    Cloudinary asset it always has, with zero migration/backfill needed.
    """
    base = f"paperflow/{workspace_id}/{mock_test_id}/diagrams/{question_id}"
    return base if slot_key == "default" else f"{base}/{slot_key}"


def _sign_params(params, api_secret):
    # Cloudinary's signing spec: hash of every param EXCEPT file/
    # cloud_name/resource_type/api_key, sorted alphabetically by key,
    # joined as "key=value&key=value...", with api_secret appended - a
    # plain hash over the params-string + secret, not HMAC. Cloudinary's
    # SDKs default to SHA-1 here, but their API accepts and auto-detects
    # SHA-256 digests too (see "Generating authentication signatures" in
    # their docs), so we use SHA-256 rather than the weaker SHA-1
    # (python:S4790) - no signature_algorithm param needs to be sent
    # since Cloudinary validates based on the digest's length.
    to_sign = "&".join(f"{key}={params[key]}" for key in sorted(params))
    return hashlib.sha256((to_sign + api_secret).encode("utf-8")).hexdigest()


def upload_diagram_buffer(image_bytes, public_id):
    """
    Uploads (or, with overwrite=true, replaces in place) a PNG at the
    given public_id. Raises RuntimeError if Cloudinary isn't configured or
    the API call itself fails - callers already wrap the whole
    per-diagram write in a best-effort try/except (see worker.py), so a
    real exception here is the correct way to signal "this one diagram's
    upload failed," not a silent no-op.
    """
    if not cloudinary_configured():
        raise RuntimeError(
            "Cloudinary is not configured (set CLOUDINARY_URL, or all of "
            "CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET) "
            "- cannot upload extracted diagrams"
        )

    timestamp = str(int(time.time()))
    signed_params = {
        "public_id": public_id,
        "overwrite": "true",
        "timestamp": timestamp,
    }
    signature = _sign_params(signed_params, CLOUDINARY_API_SECRET)

    data_uri = "data:image/png;base64," + base64.b64encode(image_bytes).decode("ascii")

    form_data = urlencode(
        {
            **signed_params,
            "file": data_uri,
            "api_key": CLOUDINARY_API_KEY,
            "signature": signature,
        }
    ).encode("utf-8")

    req = request.Request(
        f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/image/upload",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with request.urlopen(req, timeout=30) as response:
        body = json.loads(response.read().decode("utf-8"))

    return body.get("public_id", public_id)
