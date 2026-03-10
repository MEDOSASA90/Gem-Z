import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_gem_z_super_secure';

interface AuthenticatedSocket extends Socket {
    user?: {
        userId: string;
        role: string;
    };
}

export class SocketService {
    private io: Server;

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.initializeMiddlewares();
        this.initializeEvents();
    }

    private initializeMiddlewares() {
        this.io.use((socket: AuthenticatedSocket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication Error: Token missing'));
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET) as any;
                socket.user = decoded;
                next();
            } catch (err) {
                return next(new Error('Authentication Error: Invalid token'));
            }
        });
    }

    private initializeEvents() {
        this.io.on('connection', (socket: AuthenticatedSocket) => {
            const userId = socket.user?.userId;
            console.log(`[Socket] User Connected: ${userId} (${socket.id})`);

            // Join personal room for private notifications
            if (userId) socket.join(`user_${userId}`);

            socket.on('join_squad', (squadId: string) => {
                socket.join(`squad_${squadId}`);
                console.log(`User ${userId} joined squad ${squadId}`);
            });

            socket.on('squad_message', (data: { squadId: string, message: string }) => {
                // Broadcast to everyone in squad EXCEPT sender
                socket.to(`squad_${data.squadId}`).emit('new_squad_message', {
                    senderId: userId,
                    message: data.message,
                    timestamp: new Date()
                });
            });

            socket.on('disconnect', () => {
                console.log(`[Socket] User Disconnected: ${userId}`);
            });
        });
    }

    // Utility methods to emit events from HTTP Controllers
    public notifyUser(userId: string, event: string, payload: any) {
        this.io.to(`user_${userId}`).emit(event, payload);
    }

    public notifySquad(squadId: string, event: string, payload: any) {
        this.io.to(`squad_${squadId}`).emit(event, payload);
    }
}
