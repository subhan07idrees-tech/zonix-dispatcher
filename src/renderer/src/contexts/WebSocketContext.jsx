import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) return;

    const wsUrl = `wss://zonix-backend-ouhi.onrender.com/ws?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to ZONIX backend');
        setConnected(true);
        ws.send(JSON.stringify({ type: 'sessions:subscribe' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.error('[WS] Message parse error:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setConnected(false);
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        setConnected(false);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      scheduleReconnect();
    }
  }, [token, isAuthenticated]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    reconnectTimer.current = setTimeout(() => {
      if (isAuthenticated) connect();
    }, 5000);
  }, [connect, isAuthenticated]);

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'sessions:update':
        setSessions(msg.data);
        break;
      case 'alert:proxy':
      case 'alert:system':
        setAlerts(prev => [msg.data, ...prev].slice(0, 50));
        break;
      case 'sessions:cleanup':
        break;
      case 'connected':
        console.log('[WS] Client ID:', msg.data.clientId);
        break;
      default:
        break;
    }
  }, []);

  const sendCommand = useCallback((type, payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const value = {
    connected,
    sessions,
    alerts,
    sendCommand,
    clearAlerts,
    refreshSessions: () => sendCommand('sessions:subscribe')
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
