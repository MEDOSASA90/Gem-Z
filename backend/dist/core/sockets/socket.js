"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const db_1 = require("../database/db");
const token_service_1 = require("../../services/token.service");
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
                const decoded = (0, token_service_1.verifyAccessToken)(token);
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
                    const participants = [userId, data.receiverId].sort();
                    const roomResult = await db_1.db.query(`
                        INSERT INTO chat_rooms (participant_one, participant_two)
                        VALUES ($1, $2)
                        ON CONFLICT (participant_one, participant_two)
                        DO UPDATE SET last_message_at = NOW()
                        RETURNING id
                    `, [participants[0], participants[1]]);
                    const roomId = roomResult.rows[0].id;
                    const { rows } = await db_1.db.query(`
                        INSERT INTO chat_messages (room_id, sender_id, content)
                        VALUES ($1, $2, $3) RETURNING *
                    `, [roomId, userId, data.content]);
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
