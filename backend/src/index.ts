import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import routes from './routes';
import { errorHandler } from './core/middlewares/error.middleware';
import { SocketService } from './core/sockets/socket';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSockets
export const socketService = new SocketService(server);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// Main Router V1
app.use('/api/v1', routes);

// Global Error Handler
app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`[Server] GEM Z Backend running on http://localhost:${PORT}`);
    console.log(`[Socket] WebSocket engine initialized successfully.`);
});
