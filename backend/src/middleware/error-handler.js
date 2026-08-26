// Postgres error codes that can legitimately reach here from a repository
// call that DIDN'T already convert them to an httpError in its service
// (see e.g. cohorts.service.js / auth.service.js for the usual pattern of
// catching these close to the write with a specific, worded message).
// This is the last-resort safety net for whichever one we missed, not the
// primary way these are meant to be handled.
const PG_ERROR_MAP = {
  23505: { statusCode: 409, message: "This already exists." },
  23503: {
    statusCode: 400,
    message: "This refers to something that doesn't exist or was deleted.",
  },
  23502: { statusCode: 400, message: "A required field is missing." },
  "22P02": {
    statusCode: 400,
    message: "One of the values in this request is the wrong type.",
  },
};

export function errorHandler(error, _req, res, _next) {
  // `httpError(...)` (src/lib/http-error.js) is the only thing that
  // deliberately sets .statusCode - every other error reaching here
  // (a bug, a raw pg error, a library throw) is unexpected, so its
  // statusCode/message can't be trusted to be either accurate or safe to
  // show a user.
  const isDeliberate = Number.isInteger(error.statusCode);

  let statusCode = isDeliberate ? error.statusCode : 500;
  let message = isDeliberate
    ? error.message || "Internal server error"
    : "Something went wrong on our end. Please try again in a moment.";

  if (!isDeliberate) {
    if (error.code && PG_ERROR_MAP[error.code]) {
      statusCode = PG_ERROR_MAP[error.code].statusCode;
      message = PG_ERROR_MAP[error.code].message;
    } else if (error.name === "MulterError") {
      statusCode = 400;
      if (error.code === "LIMIT_FILE_SIZE") {
        message = "File is too large. Please upload a smaller file.";
      } else {
        message = `File upload error: ${error.message}`;
      }
    } else if (
      error.message &&
      (error.message.includes("Cloudinary") ||
        error.message.includes("Backblaze") ||
        error.message.includes("B2") ||
        error.message.includes("cloud storage"))
    ) {
      statusCode = 502;
      message = error.message;
    }
  }

  // Always log the real error server-side, regardless of what the client
  // sees - this is the only place that would otherwise be lost once the
  // response above is sanitized.
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      details: isDeliberate ? error.details : undefined,
    },
  });
}

