import React, { useEffect, useState, useCallback } from 'react';
import { Database, Trash2, Plus, RefreshCw, Clock } from 'lucide-react';

interface CacheItem {
  key: string;
  value: string;
  ttl: number;
  age: number;
}

interface CacheStats {
  itemCount: number;
  items: CacheItem[];
}

function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [stats, setStats] = useState<CacheStats>({ itemCount: 0, items: [] });
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState('0');
  const [error, setError] = useState('');

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stats') {
        setStats(data);
      }
    };

    websocket.onerror = (error) => {
      setError('WebSocket connection error');
      console.error('WebSocket error:', error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  const handleSet = useCallback(() => {
    if (!key || !value) {
      setError('Key and value are required');
      return;
    }
    ws?.send(JSON.stringify({
      action: 'set',
      key,
      value,
      ttl: parseInt(ttl) || 0
    }));
    setKey('');
    setValue('');
    setTtl('0');
    setError('');
  }, [ws, key, value, ttl]);

  const handleDelete = useCallback((key: string) => {
    ws?.send(JSON.stringify({
      action: 'delete',
      key
    }));
  }, [ws]);

  const handleClear = useCallback(() => {
    ws?.send(JSON.stringify({
      action: 'clear'
    }));
  }, [ws]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Database className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">Memcached Server</h1>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Add New Cache Entry</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="TTL (seconds, 0 for infinite)"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Cache Entries ({stats.itemCount})</h2>
              <button
                onClick={handleClear}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear All
              </button>
            </div>
            <div className="space-y-3">
              {stats.items.map((item) => (
                <div
                  key={item.key}
                  className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-blue-400">{item.key}</div>
                    <div className="text-gray-400 text-sm truncate">{item.value}</div>
                    <div className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {item.ttl ? `TTL: ${item.ttl}ms` : 'No TTL'} | Age: {Math.round(item.age / 1000)}s
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.key)}
                    className="ml-4 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {stats.items.length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  No cache entries found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;