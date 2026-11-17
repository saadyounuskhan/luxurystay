import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

// Live updates: when the server says something changed, refresh that data on screen
export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;
    const url = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/api\/v1\/?$/, '') || undefined;
    const socket = io(url, { auth: { token }, transports: ['websocket'] });
    const refresh = (...keys) => () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    socket.on('room:status', refresh('rooms', 'kpis', 'tasks'));
    socket.on('booking:new', refresh('reservations', 'frontdesk', 'kpis', 'tape'));
    socket.on('task:updated', refresh('tasks', 'rooms'));
    socket.on('request:updated', refresh('services'));
    socket.on('notification:new', refresh('notifications', 'services', 'tickets', 'current'));
    return () => socket.disconnect();
  }, [token, qc]);
}
