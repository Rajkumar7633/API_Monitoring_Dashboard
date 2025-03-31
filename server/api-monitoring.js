function setupApiMonitoring(app, metricsCollector) {
  // Middleware to monitor API requests
  app.use((req, res, next) => {
    // Skip monitoring for static assets
    if (req.path.startsWith("/static") || req.path.startsWith("/favicon")) {
      return next();
    }

    // Add trace ID for distributed tracing
    const traceId = require("crypto").randomUUID();
    req.headers["x-trace-id"] = traceId;

    // Record start time
    const startTime = Date.now();

    // Process after response is sent
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const endpoint = req.path;
      const status = res.statusCode;

      // Record the API request
      metricsCollector.recordApiRequest(endpoint, duration, status);
    });

    next();
  });

  // Sample API endpoints for testing
  app.get("/api/users", (req, res) => {
    setTimeout(() => {
      res.json({
        users: [
          { id: 1, name: "John Doe" },
          { id: 2, name: "Jane Smith" },
        ],
      });
    }, Math.random() * 200);
  });

  app.get("/api/products", (req, res) => {
    setTimeout(() => {
      res.json({
        products: [
          { id: 1, name: "Product A" },
          { id: 2, name: "Product B" },
        ],
      });
    }, Math.random() * 300);
  });

  app.get("/api/orders", (req, res) => {
    setTimeout(() => {
      res.json({ orders: [{ id: 1, product: "Product A", quantity: 2 }] });
    }, Math.random() * 250);
  });

  app.post("/api/auth", (req, res) => {
    setTimeout(() => {
      // Randomly generate errors for testing
      if (Math.random() < 0.1) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      res.json({ token: "sample-token" });
    }, Math.random() * 150);
  });

  app.post("/api/payments", (req, res) => {
    setTimeout(() => {
      // Randomly generate errors for testing
      if (Math.random() < 0.05) {
        return res.status(500).json({ error: "Payment processing failed" });
      }
      res.json({ success: true, transactionId: "tx-123456" });
    }, Math.random() * 400);
  });
}

module.exports = { setupApiMonitoring };
