import { useEffect, useRef, useCallback, useState } from 'react';

export type WSStatus = 'connecting' | 'open' | 'closed';

export function useWebSocket(url: string, onMessage: (raw: string) => void) {
  const [status, setStatus] = useState<WSStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      setStatus('open');
      retryRef.current = 0;
    };

    ws.onmessage = (e) => onMessageRef.current(e.data as string);

    ws.onclose = () => {
      setStatus('closed');
      const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
      retryRef.current++;
      setTimeout(connect, delay);
    };
  }, [url]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: string) => {
    // Use numeric value 1 (OPEN) to avoid referencing WebSocket.OPEN on the stubbed global in tests
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(data);
    }
  }, []);

  return { send, status };
}
