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

// 23514 (check_violation) is different from the codes above: the code
// alone doesn't say what's wrong, only error.constraint does, so it needs
// its own lookup rather than a flat { statusCode, message } entry. Named
// per the constraint that fires, not per table, since one table can have
// several. Every entry here is a constraint a normal user action (an
// editor save, a bad form value) can actually trigger - see each
// migration's own comment for why the constraint exists at all.
const CHECK_CONSTRAINT_MESSAGES = {
  // 050_written_answer_columns.sql - a question is missing the answer key
  // its own question_type requires (an MCQ with no correct option marked,
  // a fill-blank with no accepted answers, a numerical question with no
  // numeric answer). short_answer/long_answer have no such requirement,
  // so this can only fire for single/multi/fill_blank/numerical.
  question_contents_type_shape: {
    statusCode: 400,
    message:
      "This question is missing its answer key for its question type " +
      "(e.g. no correct option marked, or no accepted answer set).",
  },
  question_contents_accepted_answers_is_array: {
    statusCode: 400,
    message: "Accepted answers must be a list, not a single value.",
  },
  question_contents_grading_rubric_is_array: {
    statusCode: 400,
    message: "The grading rubric must be a list, not a single value.",
  },
  question_contents_answer_word_limit_nonneg: {
    statusCode: 400,
    message: "Word limit must be a positive number.",
  },
  question_contents_numeric_tolerance_nonneg: {
    statusCode: 400,
    message: "Numeric tolerance can't be negative.",
  },
  // 032_question_content_options.sql
  question_contents_options_is_array: {
    statusCode: 400,
    message: "Options must be a list, not a single value.",
  },
};

function checkViolationResponse(error) {
  const known = error.constraint && CHECK_CONSTRAINT_MESSAGES[error.constraint];
  if (known) return known;
  // An unnamed or not-yet-mapped constraint: still tell the user this was
  // a rejected value rather than falling through to the generic 500,
  // which would wrongly suggest a server bug rather than an invalid save.
  return {
    statusCode: 400,
    message: "This value isn't allowed here.",
  };
}

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
    if (error.code === "23514") {
      const mapped = checkViolationResponse(error);
      statusCode = mapped.statusCode;
      message = mapped.message;
    } else if (error.code && PG_ERROR_MAP[error.code]) {
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
  // sees. This used to only fire for statusCode >= 500 - but a raw,
  // unexpected pg error (a bug, not something a service deliberately
  // threw via httpError) can just as easily map down to a 400 through
  // PG_ERROR_MAP/checkViolationResponse above, and pg attaches exactly
  // the detail needed to pin those down (error.column, error.table,
  // error.constraint, error.detail) - discarding it because the mapped
  // status happens to be a 400 means the one place that could show WHICH
  // column/table was involved never gets the chance to.
  if (statusCode >= 500 || !isDeliberate) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message,
      details: isDeliberate ? error.details : undefined,
    },
  });
}
