import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';
import path from 'path';
import routes from './routes';
import { errorHandler } from './core/middlewares/error.middleware';
import { SocketService } from './core/sockets/socket';
import { generalLimiter } from './core/middlewares/rate-limit.middleware';
import { verifyEmailConnection } from './services/email.service';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSockets
export const socketService = new SocketService(server);

// ─── Security Middleware ─────────────────────────────────────

// Helmet: sets secure HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
}));

// CORS: restrict to known frontend origins
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// ─── General Middleware ──────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Global Rate Limiter ─────────────────────────────────────

// Apply to all API routes — 100 req/min per IP
app.use('/api/', generalLimiter);

// ─── Static Files ────────────────────────────────────────────

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// ─── Main API Router ─────────────────────────────────────────

app.use('/api/v1', routes);

// ─── Global Error Handler ────────────────────────────────────

app.use(errorHandler);

// ─── Server Start ────────────────────────────────────────────

server.listen(PORT, async () => {
    console.log(`[Server] GEM Z Backend running on http://localhost:${PORT}`);
    console.log(`[Socket] WebSocket engine initialized successfully.`);
    console.log(`[ENV]    NODE_ENV = ${process.env.NODE_ENV || 'development'}`);

    // Verify email connection on startup (non-blocking)
    verifyEmailConnection().catch(() => {
        console.warn('[Email]  SMTP not configured — email features will be disabled.');
    });
});
