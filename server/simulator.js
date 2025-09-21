const { randomUUID } = require('crypto')

function createSimulator(metricsCollector) {
  let intervalIds = []
  let running = false

  const endpoints = [
    '/api/users',
    '/api/products',
    '/api/orders',
    '/api/auth',
    '/api/payments',
    '/api/stream',
    '/api/thresholds',
  ]

  const start = (opts = {}) => {
    if (running) return { running }
    running = true

    const rps = Number(process.env.SIMULATOR_RPS || opts.rps || 5) // requests per second
    const dbQps = Number(process.env.SIMULATOR_DB_QPS || opts.dbQps || 2)

    // API traffic generator
    const apiInterval = setInterval(() => {
      for (let i = 0; i < rps; i++) {
        const ep = endpoints[Math.floor(Math.random() * endpoints.length)]
        const duration = Math.floor(50 + Math.random() * 600)
        const errRoll = Math.random()
        let status = 200
        if (errRoll < 0.03) status = 500
        else if (errRoll < 0.10) status = 404
        else if (errRoll < 0.14) status = 401
        metricsCollector.recordApiRequest(ep, duration, status)
      }
    }, 1000)
    intervalIds.push(apiInterval)

    // DB activity
    const dbInterval = setInterval(() => {
      const querySamples = [
        'SELECT * FROM users WHERE id = $1',
        'SELECT * FROM products ORDER BY created_at DESC LIMIT 20',
        'UPDATE orders SET status = $1 WHERE id = $2',
        'INSERT INTO audit_logs (message, level) VALUES ($1, $2)',
        'SELECT COUNT(*) FROM orders WHERE status = $1',
      ]
      for (let i = 0; i < dbQps; i++) {
        const q = querySamples[Math.floor(Math.random() * querySamples.length)]
        const duration = Math.random() < 0.15 ? 300 + Math.random() * 500 : 20 + Math.random() * 120
        metricsCollector.recordDatabaseQuery(q, duration)
      }
    }, 1000)
    intervalIds.push(dbInterval)

    // Occasional service blips via alerts/logs are handled by health-checks and alert engine

    return { running }
  }

  const stop = () => {
    for (const id of intervalIds) clearInterval(id)
    intervalIds = []
    running = false
    return { running }
  }

  const status = () => ({ running })

  return { start, stop, status }
}

module.exports = { createSimulator }
