function setupLogging(app) {
  // Middleware for request logging
  app.use((req, res, next) => {
    // Skip logging for static assets
    if (req.path.startsWith("/static") || req.path.startsWith("/favicon")) {
      return next()
    }

    // Generate request ID if not present
    const requestId = req.headers["x-request-id"] || require("crypto").randomUUID()
    req.headers["x-request-id"] = requestId

    // Log request
    console.log({
      type: "request",
      method: req.method,
      path: req.path,
      requestId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    })

    // Log response
    res.on("finish", () => {
      console.log({
        type: "response",
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        requestId,
        responseTime: 0, // Will be set below
      })
    })

    next()
  })

  // Error logging middleware
  app.use((err, req, res, next) => {
    console.error({
      type: "error",
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      requestId: req.headers["x-request-id"],
    })

    res.status(500).json({ error: "Internal Server Error" })
  })
}

module.exports = { setupLogging }

