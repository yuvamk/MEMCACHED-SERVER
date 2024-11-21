import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// In-memory cache storage
const cache = new Map();

// Cache item with TTL support
class CacheItem {
  constructor(value, ttl = 0) {
    this.value = value;
    this.createdAt = Date.now();
    this.ttl = ttl;
  }

  isExpired() {
    if (this.ttl === 0) return false;
    return Date.now() - this.createdAt > this.ttl;
  }
}

// Clean expired items periodically
setInterval(() => {
  for (const [key, item] of cache.entries()) {
    if (item.isExpired()) {
      cache.delete(key);
      broadcastStats();
    }
  }
}, 1000);

function broadcastStats() {
  const stats = {
    type: 'stats',
    itemCount: cache.size,
    items: Array.from(cache.entries()).map(([key, item]) => ({
      key,
      value: item.value,
      ttl: item.ttl,
      age: Date.now() - item.createdAt
    }))
  };
  
  wss.clients.forEach(client => {
    client.send(JSON.stringify(stats));
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  broadcastStats();

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.action) {
      case 'set':
        cache.set(data.key, new CacheItem(data.value, data.ttl * 1000));
        break;
      case 'get':
        const item = cache.get(data.key);
        if (item && !item.isExpired()) {
          ws.send(JSON.stringify({
            type: 'get',
            key: data.key,
            value: item.value
          }));
        } else {
          cache.delete(data.key);
          ws.send(JSON.stringify({
            type: 'get',
            key: data.key,
            value: null
          }));
        }
        break;
      case 'delete':
        cache.delete(data.key);
        break;
      case 'clear':
        cache.clear();
        break;
    }

    broadcastStats();
  });
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});