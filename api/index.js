"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./core/middlewares/error.middleware");
const socket_1 = require("./core/sockets/socket");
const rate_limit_middleware_1 = require("./core/middlewares/rate-limit.middleware");
const email_service_1 = require("./services/email.service");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Initialize WebSockets
exports.socketService = new socket_1.SocketService(server);
// ─── Security Middleware ─────────────────────────────────────
// Helmet: sets secure HTTP headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow image serving
}));
// CORS: restrict to known frontend origins
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));
// ─── General Middleware ──────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// ─── Global Rate Limiter ─────────────────────────────────────
// Apply to all API routes — 100 req/min per IP
app.use('/api/', rate_limit_middleware_1.generalLimiter);
// ─── Static Files ────────────────────────────────────────────
// Serve uploaded files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../public/uploads')));
// ─── Main API Router ─────────────────────────────────────────
app.use('/api/v1', routes_1.default);
// ─── Global Error Handler ────────────────────────────────────
app.use(error_middleware_1.errorHandler);
// ─── Server Start ────────────────────────────────────────────
server.listen(PORT, async () => {
    console.log(`[Server] GEM Z Backend running on http://localhost:${PORT}`);
    console.log(`[Socket] WebSocket engine initialized successfully.`);
    console.log(`[ENV]    NODE_ENV = ${process.env.NODE_ENV || 'development'}`);
    // Verify email connection on startup (non-blocking)
    (0, email_service_1.verifyEmailConnection)().catch(() => {
        console.warn('[Email]  SMTP not configured — email features will be disabled.');
    });
});
