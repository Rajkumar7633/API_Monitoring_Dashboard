const EventEmitter = require('events');

// Central event bus for real-time updates across modules
class MetricsEventBus extends EventEmitter {}

const eventBus = new MetricsEventBus();

module.exports = { eventBus };
