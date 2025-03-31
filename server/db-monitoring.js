function setupDatabaseMonitoring(metricsCollector) {
  // Simulate database queries for testing
  setInterval(() => {
    // Simulate various database queries
    const queries = [
      "SELECT * FROM users WHERE id = 1",
      "SELECT * FROM products ORDER BY created_at DESC LIMIT 10",
      "UPDATE orders SET status = 'shipped' WHERE id = 123",
      "INSERT INTO logs (message, level) VALUES ('User login', 'info')",
      "SELECT COUNT(*) FROM orders WHERE status = 'pending'",
    ]

    const randomQuery = queries[Math.floor(Math.random() * queries.length)]
    const simulatedDuration = Math.random() * 200

    // Simulate slow queries occasionally
    const isSlow = Math.random() < 0.1
    const duration = isSlow ? simulatedDuration + 300 : simulatedDuration

    metricsCollector.recordDatabaseQuery(randomQuery, duration)
  }, 2000) // Simulate a query every 2 seconds
}

module.exports = { setupDatabaseMonitoring }

