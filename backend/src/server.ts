import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { registerChatHandler } from './sockets/chatHandler';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
const allowedOrigins: string[] = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [];

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io accessible to route handlers
app.set('io', io);

// Register Socket.IO chat handler (/chat namespace)
registerChatHandler(io);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

export { server, io };
