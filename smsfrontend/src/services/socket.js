import { io } from 'socket.io-client';
import { API_BASE_URL, getAccessToken } from './api.js';

function resolveSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;

  try {
    const url = new URL(API_BASE_URL);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return 'http://localhost:5000';
  }
}

export function connectNotificationSocket({ onNotification, onConnectError } = {}) {
  const socket = io(resolveSocketUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 4,
    reconnectionDelay: 2500,
    reconnectionDelayMax: 10000,
    timeout: 6000,
    auth(callback) {
      callback({ token: getAccessToken() });
    },
  });

  socket.on('notification:new', (notification) => {
    onNotification?.(notification);
  });

  socket.on('connect_error', (error) => {
    onConnectError?.(error);
  });

  socket.connect();

  return () => {
    socket.disconnect();
  };
}
