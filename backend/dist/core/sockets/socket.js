"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';
class SocketService {
    io;
    constructor(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.initializeMiddlewares();
        this.initializeEvents();
    }
    initializeMiddlewares() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication Error: Token missing'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                socket.user = decoded;
                next();
            }
            catch (err) {
                return next(new Error('Authentication Error: Invalid token'));
            }
        });
    }
    initializeEvents() {
        this.io.on('connection', (socket) => {
            const userId = socket.user?.userId;
            console.log(`[Socket] User Connected: ${userId} (${socket.id})`);
            // Join personal room for private notifications
            if (userId)
                socket.join(`user_${userId}`);
            socket.on('join_squad', (squadId) => {
                socket.join(`squad_${squadId}`);
                console.log(`User ${userId} joined squad ${squadId}`);
            });
            socket.on('squad_message', (data) => {
                // Broadcast to everyone in squad EXCEPT sender
                socket.to(`squad_${data.squadId}`).emit('new_squad_message', {
                    senderId: userId,
                    message: data.message,
                    timestamp: new Date()
                });
            });
            socket.on('private_message', async (data) => {
                if (!userId || !data.receiverId || !data.content)
                    return;
                try {
                    // Import db dynamically or use query directly
                    const { db } = require('../../database/db');
                    // 1. Save to Database
                    const { rows } = await db.query(`
                        INSERT INTO chat_messages (sender_id, receiver_id, content) 
                        VALUES ($1, $2, $3) RETURNING *
                    `, [userId, data.receiverId, data.content]);
                    const msg = rows[0];
                    // 2. Emit to Receiver
                    socket.to(`user_${data.receiverId}`).emit('receive_message', msg);
                    // 3. Emit acknowledgement back to Sender
                    socket.emit('message_sent', msg);
                }
                catch (error) {
                    console.error('[Socket] private_message error:', error);
                }
            });
            socket.on('disconnect', () => {
                console.log(`[Socket] User Disconnected: ${userId}`);
            });
        });
    }
    // Utility methods to emit events from HTTP Controllers
    notifyUser(userId, event, payload) {
        this.io.to(`user_${userId}`).emit(event, payload);
    }
    notifySquad(squadId, event, payload) {
        this.io.to(`squad_${squadId}`).emit(event, payload);
    }
}
exports.SocketService = SocketService;
