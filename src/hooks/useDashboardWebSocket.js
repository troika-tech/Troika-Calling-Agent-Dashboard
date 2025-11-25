import { useEffect, useRef, useState } from 'react';
import { getApiBaseUrl } from '../config/api.config';

/**
 * Custom hook for WebSocket connection to dashboard analytics
 * Provides real-time updates instead of polling
 */
export const useDashboardWebSocket = (userId, onDataUpdate) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const getWebSocketUrl = () => {
    const apiUrl = getApiBaseUrl();
    // Convert HTTP URL to WebSocket URL
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws/dashboard?userId=${userId}`;
  };

  const connect = () => {
    if (!userId) {
      console.warn('No userId provided for WebSocket connection');
      return;
    }

    try {
      const wsUrl = getWebSocketUrl();
      console.log('🔌 Connecting to dashboard WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Dashboard WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Dashboard message received:', message.type);

          switch (message.type) {
            case 'dashboard:connected':
              console.log('✅ Dashboard session established');
              break;

            case 'dashboard:initial_data':
              console.log('📊 Received initial dashboard data');
              if (onDataUpdate) {
                onDataUpdate(message.data);
              }
              break;

            case 'dashboard:update':
              console.log('🔄 Dashboard data updated');
              if (onDataUpdate) {
                onDataUpdate(message.data);
              }
              break;

            case 'dashboard:call_completed':
            case 'dashboard:call_failed':
            case 'dashboard:campaign_updated':
              console.log('🔔 Event notification:', message.type);
              // These events can trigger a manual refresh if needed
              // For now, the server will send dashboard:update automatically
              break;

            case 'dashboard:error':
              console.error('❌ Dashboard error:', message.data);
              setError(message.data.error);
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Dashboard WebSocket error:', error);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('🔌 Dashboard WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(`🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          setError('Unable to connect to dashboard updates');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('🔌 Closing dashboard WebSocket connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  const sendMessage = (type, data = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  };

  const refreshDashboard = () => {
    sendMessage('dashboard:refresh');
  };

  useEffect(() => {
    connect();

    // Heartbeat to keep connection alive
    const heartbeatInterval = setInterval(() => {
      sendMessage('ping');
    }, 25000); // Send ping every 25 seconds

    return () => {
      clearInterval(heartbeatInterval);
      disconnect();
    };
  }, [userId]);

  return {
    isConnected,
    error,
    refreshDashboard,
    disconnect
  };
};
