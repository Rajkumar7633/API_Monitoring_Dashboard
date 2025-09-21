# Environment Configuration

Configure these variables in your shell or in a local env file (e.g., `.env.local` for Next.js, or export before starting the server).

Frontend (Next.js):
- NEXT_PUBLIC_API_URL: Base URL of the Express backend (default http://localhost:3001)

Backend (Express):
- PORT: Port for the Express server (default 3001)
- FRONTEND_URL: CORS origin for the dashboard (default http://localhost:3000)
- ENABLE_SIMULATION: "true" to enable demo/simulated endpoints and DB queries (default false)
- ENABLE_RANDOM_ALERTS: "true" to generate random alerts periodically (default false)
- THRESHOLD_ERROR_RATE: Error rate threshold percent (default 5)
- THRESHOLD_RESPONSE_TIME: Average response time threshold ms (default 500)
- THRESHOLD_CPU: CPU usage threshold percent (default 80)
- THRESHOLD_MEMORY: Memory usage threshold percent (default 75)
- THRESHOLD_DB_QUERY: DB query time threshold ms (default 500)
- ALERT_CHECK_INTERVAL_MS: Interval for alert evaluation (default 60000)
- HEALTHCHECK_INTERVAL_MS: Interval for service health checks (default 30000)
- SERVICES_JSON: JSON array of services with name and url, e.g.
  [{"name":"User Service","url":"http://localhost:3002/health"}]

Notes:
- When ENABLE_SIMULATION is false, only real traffic updates metrics (middleware-based) and real service healthchecks run.
- Use NEXT_PUBLIC_API_URL in the Next.js app to point to your backend when not on the same origin.
