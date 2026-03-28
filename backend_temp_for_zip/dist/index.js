"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./core/middlewares/error.middleware");
const socket_1 = require("./core/sockets/socket");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
// Initialize WebSockets
exports.socketService = new socket_1.SocketService(server);
// Middleware
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../../public/uploads')));
// Main Router V1
app.use('/api/v1', routes_1.default);
// Global Error Handler
app.use(error_middleware_1.errorHandler);
server.listen(PORT, () => {
    console.log(`[Server] GEM Z Backend running on http://localhost:${PORT}`);
    console.log(`[Socket] WebSocket engine initialized successfully.`);
});
