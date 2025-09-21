# API Monitoring Dashboard: Design & Implementation

## Project Overview

The **API Monitoring Dashboard** is a comprehensive solution designed to provide real-time monitoring and observability for APIs, databases, and services. It leverages a hybrid architecture combining client-side rendering (Next.js) with server-side data collection (Express.js). The dashboard offers insights into system performance, errors, and service health, enabling teams to detect and resolve issues proactively.

---

## What's New (Realtime Features)

- Error Snapshots pipeline with in-memory fallback and HTTP APIs
- Alerts page improvements: Acknowledge/Resolve actions, View Snapshot modal, Snapshots tab with filters
- Services Telemetry card showing OTLP endpoint and snapshots count
- Tracing bootstrap (OpenTelemetry, best-effort/no-op if deps missing)
- Appearance settings that apply instantly and persist client-side
- Dashboard and Alerts KPIs: Total/Active/Ack/Resolved, Solve rate, MTTA/MTTR, and 1h deltas
- MTTA/MTTR mini sparklines (Alerts page) computed from live alert timestamps

---

## Major Design Decisions and Tradeoffs

### **Architecture Approach**

1. **Real-time Monitoring with Fallback**:  
   The dashboard uses real-time data from the server but falls back to mock data when the server is unavailable, ensuring continuous visibility during outages.

2. **Separation of Concerns**:  
   The architecture separates the presentation layer (Next.js frontend) from the data collection layer (Express.js backend), allowing independent scalability.

3. **Modular Monitoring Components**:  
   The backend includes distinct modules for:
   - API monitoring
   - Database monitoring
   - Service health checks
   - Alerting mechanisms  
   This modularity ensures extensibility and maintainability.

4. **Stateless Design**:  
   The dashboard retrieves metrics on demand rather than maintaining complex client-side states, simplifying implementation and reducing bugs.

### **Key Tradeoffs**

1. **In-Memory vs. Persistent Storage**:  
   Metrics are stored in memory for fast access but limit historical data retention. This prioritizes performance over long-term analysis.

2. **Comprehensive vs. Focused Monitoring**:  
   The dashboard provides a holistic view of APIs, databases, and services rather than specializing in one area, trading depth for breadth.

3. **Real-time Updates vs. Network Efficiency**:  
   Frequent polling ensures near-real-time updates but increases network traffic.

4. **Simplicity vs. Advanced Features**:  
   The focus is on core monitoring capabilities rather than advanced features like anomaly detection or predictive analytics.

---

## Proof of Solution

The API Monitoring Dashboard addresses modern observability needs with the following features:

1. **Comprehensive Visibility**:  
   Unified insights into API performance, errors, system resources, and service health.

2. **Real-time Monitoring**:  
   Near-real-time metrics capture and display for immediate issue detection.

3. **Multi-dimensional Analysis**:  
   Analyze metrics across endpoints, time ranges, and error types to identify patterns and correlations.

4. **Alerting Capabilities**:  
   Threshold-based alerts notify teams of potential issues before they escalate.

5. **Adaptability**:  
   Modular design supports monitoring diverse APIs and services without code changes.

---

## Known Gaps and Limitations

1. **Limited Historical Analysis**:  
   Focuses on recent metrics rather than long-term trends, suitable for operational monitoring.

2. **Basic Alerting Logic**:  
   Uses simple threshold-based rules instead of complex anomaly detection.

3. **No Distributed Tracing Integration**:  
   While trace IDs are captured, full tracing visualization is not implemented.

4. **Limited Customization**:  
   Fixed visualizations simplify implementation but lack user-defined customization options.

5. **No User Management**:  
   Lacks role-based access control; suitable for internal team use only.

---

## Getting Started

### Quick Start (two terminals)

Terminal 1 – start backend server:

```bash
cd server
node index.js
```

Terminal 2 – start frontend (Next.js):

```bash
npm install   # if not done already
npm run dev
```

Notes:
- Frontend runs at http://localhost:3000
- Backend runs at http://localhost:3001 (default in `server/index.js`)
- If your backend host/port differs, set in the second terminal before `npm run dev`:
  ```bash
  export NEXT_PUBLIC_API_URL="http://localhost:3001"
  ```

### Backend Setup (Express server with real-time SSE)

Environment configuration variables are documented in `docs/ENV.md`.

1. Ensure you're at the project root and install dependencies (root already contains express dependency):
   ```bash
   npm install
   ```

2. Start the backend server (choose one):
   ```bash
   # Option A: from project root, uses package script
   npm run server

   # Option B: manual start from the server directory
   cd server
   node index.js
   ```
   Defaults:
   - Server listens on `PORT=3001`
   - CORS allows `FRONTEND_URL=http://localhost:3000`
   - SSE stream available at `GET /api/stream`
   - Aggregated snapshot at `GET /api/dashboard-data`

3. Optional: Enable persistent error snapshots with SQLite (recommended)
   - Install native dependency:
     ```bash
     npm install better-sqlite3
     ```
   - If Xcode CLI tools are missing on macOS:
     ```bash
     xcode-select --install
     ```
   - Restart the backend.

4. Optional: Enable tracing export (OpenTelemetry)
   - Install OTel deps (best-effort; code no-ops if absent):
     ```bash
     npm i @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
     ```
   - Configure an OTLP collector endpoint (either):
     ```bash
     export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
     ```
     Or set in Settings JSON/UI: `tracing.otlpEndpoint`.
   - Restart the backend; logs will show `[tracing] OpenTelemetry started …` if active.

### Frontend Setup

1. Open a new terminal.
2. Make sure dependencies are installed (already done above at root): `npm install`.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

5. If your backend is not on the default port or host, set:
   ```bash
   export NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

---

## Environment Variables (.env)

Create a `.env` file at the project root with the following recommended defaults. The backend and frontend will read these at runtime where applicable.

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001

ENABLE_SIMULATION=false
ENABLE_RANDOM_ALERTS=false

THRESHOLD_ERROR_RATE=5
THRESHOLD_RESPONSE_TIME=500
THRESHOLD_CPU=85
THRESHOLD_MEMORY=85
THRESHOLD_DB_QUERY=500

ALERT_CHECK_INTERVAL_MS=30000
HEALTHCHECK_INTERVAL_MS=30000
ALERT_DEDUP_COOLDOWN_MS=60000
ALERT_IGNORE_ENDPOINTS=/api/stream,/api/thresholds

SIMULATOR_AUTOSTART=true
SIMULATOR_RPS=8
SIMULATOR_DB_QPS=3

SERVICES_JSON=[{"name":"User Service","url":"http://localhost:3002/health"},{"name":"Authentication Service","url":"http://localhost:3003/health"}]

OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Notes:
- Change `NEXT_PUBLIC_API_URL` if your backend is not on `http://localhost:3001`.
- If you enable tracing, ensure an OTLP collector is running at `OTEL_EXPORTER_OTLP_ENDPOINT`.

---

## Usage

- Ensure both the backend and frontend are running concurrently.
- Access the dashboard at `http://localhost:3000`.
- Real-time updates are delivered via Server-Sent Events from `GET /api/stream`.
- The backend collects real metrics from incoming requests (middleware), DB query records you feed, system resources, and periodic service health checks.
- Alerts evaluate thresholds against actual metrics. You can toggle demo modes:
  - `ENABLE_SIMULATION=true` to simulate API endpoints and DB queries
  - `ENABLE_RANDOM_ALERTS=true` to generate random alert checks

### Alerts (Realtime)

- Acknowledge/Resolve using buttons on `Alerts → Active Alerts`. Updates stream in via SSE.
- View Snapshot opens a modal with:
  - Redacted request headers, request body, and response snippet
  - Trace ID (when available)
  - “Copy cURL” to reproduce the request
- Snapshots tab lists recent snapshots with filters:
  - Endpoint contains, Status (All/4xx/5xx), Time window (1h/6h/12h/24h/72h)
  - Actions: Copy cURL, Open details
- KPIs at the top (Alerts):
  - Total, Active, Acknowledged, Resolved, Solve Rate
  - MTTA (avg time to acknowledge) and MTTR (avg time to resolve)
  - 1h deltas for Active and Resolved
  - MTTA/MTTR sparklines (last 60 min, 12 buckets)

Notes:
- MTTA/MTTR require new alerts that include `createdAt`, `acknowledgedAt`, and `resolvedAt` timestamps (added by the backend). If they appear blank initially, generate + acknowledge/resolve new alerts.

### Dashboard (Realtime)

- Mirrors Alerts KPIs (Total/Active/Ack/Resolved, Solve rate) plus MTTA/MTTR and 1h deltas.
- “Recent API Failures” table now includes a “View Snapshot” action that opens the same forensic modal when a snapshot is available.

### Services Telemetry

- Services page shows a “Telemetry” card with:
  - OTLP endpoint from `/api/settings`
  - Snapshots (24h) from `/api/errors/snapshots`
  - Link to Alerts Snapshots view

### Appearance Settings

- Settings → Appearance controls apply instantly and persist to localStorage:
  - Theme via `next-themes` (Dark/Light/System)
  - Display Density via `data-density` on `<body>`
  - Chart animations flag via `data-chart-anim` on `<body>`

### Tracing & Snapshots

- Tracing bootstraps on startup if OTel deps are present and an OTLP endpoint is configured, otherwise it safely no-ops.
- Request ID middleware adds/propagates `x-request-id` for correlation.
- Synthetics and API 4xx/5xx responses emit `errors:snapshot` with `traceId` when available.
- Endpoints:
  - `GET /api/errors/snapshots?hours=24` → list recent snapshots
  - `GET /api/errors/snapshots/:id` → snapshot details
  - `GET /api/errors/snapshots/:id/curl` → reproducible cURL

Correlation:
- UI matches alerts to snapshots by `traceId` first, then by normalized endpoint as a fallback.

Persistence fallback:
- If `better-sqlite3` is unavailable, the server uses an in-memory ring buffer for error snapshots so the UI still works.

---

## Future Enhancements

1. Add persistent storage for historical data analysis.
2. Implement advanced alerting with anomaly detection.
3. Enable distributed tracing visualization.
4. Introduce customizable dashboards for user-defined metrics.
5. Add user management with role-based access control for multi-team environments.

---

## Troubleshooting

- Alerts actions do nothing
  - Ensure backend is running on `http://localhost:3001` and `NEXT_PUBLIC_API_URL` points to it.
  - Check Network tab for `POST /api/alerts/:id/ack` or `/resolve` responses.

- “View Snapshot” shows no data
  - Generate a fresh failing synthetic or API error first; then reload Snapshots.
  - Verify `GET /api/errors/snapshots?hours=24` returns items.
  - If using in-memory fallback, snapshots do not persist across restarts.

- MTTA/MTTR are blank
  - Requires new alerts with `createdAt` and actions that set `acknowledgedAt`/`resolvedAt`.
  - Restart backend after updating server files and create/ack/resolve new alerts.

---

## License

This project is licensed under [MIT License](LICENSE).

