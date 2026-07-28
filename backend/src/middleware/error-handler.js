export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: {
      message: error.message || "Internal server error",
      details: error.details,
    },
  });
}
