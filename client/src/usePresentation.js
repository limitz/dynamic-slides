import { useState, useEffect, useRef, useCallback } from 'react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const WS_URL = SERVER_URL.replace(/^http/, 'ws');

export function usePresentation() {
  const [state, setState] = useState({ slides: [], currentIndex: 0, meta: {} });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 2000);
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATE') setState(msg.state);
      };
    }
    connect();
    return () => wsRef.current?.close();
  }, []);

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const next = useCallback(() => send({ type: 'NEXT' }), [send]);
  const prev = useCallback(() => send({ type: 'PREV' }), [send]);
  const goTo = useCallback((index) => send({ type: 'GOTO', index }), [send]);

  return { state, connected, next, prev, goTo };
}
