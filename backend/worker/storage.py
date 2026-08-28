"""
Storage for the worker's two file types, deployed on Backblaze B2 (PDFs)
and Cloudinary (diagram images) respectively - see backend/src/lib for
the Node side of the same split.

Why two different services for two file types, not one: PDFs are large,
private, and only ever need to be *fetched by the worker itself* to
process - B2's plain object storage is exactly that. Diagram images are
small, need to be served to end users on every question-editor/exam-play
page load, and benefit from Cloudinary's CDN + on-the-fly image handling
in a way a bare object store doesn't offer for free.

This module is the one place in the worker that talks to either service -
everything else (worker.py, db.py, asset_extractor.py) calls through
download_pdf_to_temp_file / upload_diagram, never boto3/cloudinary
directly.
"""

import tempfile
from pathlib import Path

import boto3
import botocore.exceptions
import cloudinary
import cloudinary.uploader

from .config import (
    B2_APPLICATION_KEY,
    B2_BUCKET,
    B2_ENDPOINT_URL,
    B2_KEY_ID,
    B2_REGION,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_URL,
)

_b2_client = None


def is_b2_configured():
    return bool(B2_ENDPOINT_URL and B2_BUCKET and B2_KEY_ID and B2_APPLICATION_KEY)


def is_cloudinary_configured():
    if CLOUDINARY_URL:
        return True
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)


def _get_b2_client():
    # Lazy + cached rather than built at import time - importing this
    # module (e.g. from a one-off diagnose_*.py script) shouldn't require
    # B2 credentials to be configured if that script never actually
    # touches storage.
    global _b2_client
    if _b2_client is None:
        missing = []
        if not B2_ENDPOINT_URL:
            missing.append("B2_ENDPOINT_URL")
        if not B2_BUCKET:
            missing.append("B2_BUCKET")
        if not B2_KEY_ID:
            missing.append("B2_KEY_ID")
        if not B2_APPLICATION_KEY:
            missing.append("B2_APPLICATION_KEY")

        if missing:
            raise RuntimeError(
                f"Backblaze B2 cloud storage is not configured. Missing required environment variables: {', '.join(missing)}"
            )

        _b2_client = boto3.client(
            "s3",
            endpoint_url=B2_ENDPOINT_URL,
            region_name=B2_REGION or None,
            aws_access_key_id=B2_KEY_ID,
            aws_secret_access_key=B2_APPLICATION_KEY,
            config=botocore.config.Config(s3={"addressing_style": "path"}),
        )
    return _b2_client


# CLOUDINARY_URL (if set) configures the SDK globally as a side effect of
# import - cloudinary.uploader picks it up from cloudinary.config() the
# same way it would from the CLOUDINARY_URL env var directly, but reading
# it through our own config.py keeps every env var this app uses defined
# in one place instead of half in config.py and half implicitly read by
# a third-party SDK.
if CLOUDINARY_URL:
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
elif CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
    )


def download_pdf_to_temp_file(storage_key):
    """
    Downloads the PDF at `storage_key` (processing_jobs.input_config.storageKey
    - see mock-tests.service.js#uploadDocument/reprocessMockTest, which sets
    this on every job regardless of upload vs reprocess) from B2 into a
    fresh temp file, and returns its Path.

    The caller owns cleanup - see worker.py#process_job's finally block.
    A temp file (not a fixed path under some "downloads/" dir) because
    this worker may process several jobs per run (WORKER_MAX_JOBS_PER_RUN)
    and two jobs downloading the same storage_key concurrently - or a
    reprocess job re-downloading a key an earlier job already fetched -
    must never collide on the same path.
    """
    if not storage_key:
        raise RuntimeError("PDF storage key is empty or missing from processing job")

    suffix = Path(storage_key).suffix or ".pdf"
    handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    handle.close()
    local_path = Path(handle.name)

    try:
        _get_b2_client().download_file(B2_BUCKET, storage_key, str(local_path))
        return local_path
    except botocore.exceptions.ClientError as error:
        local_path.unlink(missing_ok=True)
        error_code = error.response.get("Error", {}).get("Code", "")
        if error_code in ("NoSuchKey", "404"):
            raise RuntimeError(
                f"PDF document was not found in B2 cloud storage (key: {storage_key})"
            ) from error
        if error_code in ("NoSuchBucket",):
            raise RuntimeError(
                f"Backblaze B2 bucket '{B2_BUCKET}' does not exist or cannot be accessed"
            ) from error
        if error_code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
            raise RuntimeError(
                "Backblaze B2 authentication failed (Access Denied). Please check B2_KEY_ID and B2_APPLICATION_KEY."
            ) from error
        raise RuntimeError(
            f"Failed to download PDF from Backblaze B2 cloud storage: {error}"
        ) from error
    except botocore.exceptions.EndpointConnectionError as error:
        local_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"Could not connect to Backblaze B2 endpoint ({B2_ENDPOINT_URL}). Please verify your internet connection."
        ) from error
    except Exception as error:
        local_path.unlink(missing_ok=True)
        if isinstance(error, RuntimeError):
            raise
        raise RuntimeError(
            f"Failed to download PDF from cloud storage: {error}"
        ) from error


def upload_diagram(png_bytes, public_id):
    """
    Uploads a cropped/manually-provided diagram PNG to Cloudinary under
    `public_id`, overwriting whatever was already there under that exact
    id (a re-extraction or a manual crop edit reuses the SAME public_id on
    purpose - see asset_extractor.py#build_diagram_public_id).

    `invalidate=True` asks Cloudinary to purge CDN copies of that
    public_id. The Node side also puts a version (`created_at`) on the
    delivery URL, because CDN invalidation is best-effort and an
    unversioned URL is what made replace/crop keep showing the old image.
    """
    if not is_cloudinary_configured():
        raise RuntimeError(
            "Cloud image storage (Cloudinary) is not configured in worker environment. "
            "Please configure CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
        )

    try:
        cloudinary.uploader.upload(
            png_bytes,
            public_id=public_id,
            overwrite=True,
            invalidate=True,
            unique_filename=False,
            resource_type="image",
            format="png",
        )
        return public_id
    except Exception as error:
        raise RuntimeError(
            f"Failed to upload diagram image to Cloudinary ({public_id}): {error}"
        ) from error

