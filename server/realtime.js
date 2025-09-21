const { eventBus } = require('./event-bus');

function setupRealtime(app) {
  const clients = new Set();

  // SSE endpoint
  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');

    res.flushHeaders && res.flushHeaders();

    const client = res;
    clients.add(client);

    // Send initial event to confirm connection
    client.write(`event: connected\n`);
    client.write(`data: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

    // Heartbeat to keep the connection alive
    const heartbeat = setInterval(() => {
      if (!client.writable) return;
      client.write(`event: ping\n`);
      client.write(`data: ${Date.now()}\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(client);
    });
  });

  // Broadcast helper
  const broadcast = (event, payload) => {
    const data = `event: ${event}\n` + `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of clients) {
      if (client.writable) {
        client.write(data);
      }
    }
  };

  // Subscribe to event bus
  eventBus.on('metrics:api', (p) => broadcast('metrics:api', p));
  eventBus.on('metrics:stats', (p) => broadcast('metrics:stats', p));
  eventBus.on('metrics:db', (p) => broadcast('metrics:db', p));
  eventBus.on('metrics:service', (p) => broadcast('metrics:service', p));
  eventBus.on('metrics:alert', (p) => broadcast('metrics:alert', p));
  eventBus.on('metrics:log', (p) => broadcast('metrics:log', p));
  eventBus.on('metrics:resources', (p) => broadcast('metrics:resources', p));
}

module.exports = { setupRealtime };
