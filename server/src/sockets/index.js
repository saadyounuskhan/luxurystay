import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let io;

// Every user joins rooms: user:<id> and role:<role>, so we can send live updates
export function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrls, credentials: true } });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, env.accessSecret);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
    logger.info(`Socket connected: ${socket.user.role} ${socket.user.id}`);
  });

  return io;
}

export const getIO = () => io;
