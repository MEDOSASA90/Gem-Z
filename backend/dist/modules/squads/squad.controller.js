"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SquadController = void 0;
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const index_1 = require("../../index");
const pool = new pg_1.Pool();
class SquadController {
    /**
     * POST /api/v1/squads
     * Creates a new Squad (Guild)
     */
    static async createSquad(req, res) {
        const creatorId = req.user?.userId;
        const { name, description, isPublic } = req.body;
        try {
            // Mock DB: INSERT INTO squads ...
            const squadId = (0, uuid_1.v4)();
            return res.status(201).json({
                success: true,
                message: 'Squad created successfully',
                data: {
                    id: squadId,
                    name,
                    description,
                    isPublic,
                    creatorId,
                    membersCount: 1,
                    points: 0
                }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Squad creation failed' });
        }
    }
    /**
     * GET /api/v1/squads
     * List squads to join
     */
    static async listSquads(req, res) {
        try {
            const mockSquads = [
                { id: 'sq_01', name: 'Iron Lifters', members: 42, rank: 1, points: 15400, isJoined: true },
                { id: 'sq_02', name: 'Cardio Kings', members: 28, rank: 2, points: 12100, isJoined: false },
                { id: 'sq_03', name: 'Yoga Masters', members: 15, rank: 3, points: 8900, isJoined: false },
            ];
            res.status(200).json({ success: true, data: mockSquads });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to list squads' });
        }
    }
    /**
     * POST /api/v1/squads/:id/join
     */
    static async joinSquad(req, res) {
        const userId = req.user?.userId;
        const { id } = req.params;
        try {
            // Notify squad via websockets
            if (userId) {
                index_1.socketService.notifySquad(id, 'member_joined', { userId, timestamp: new Date() });
            }
            res.status(200).json({ success: true, message: 'Joined squad successfully' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to join squad' });
        }
    }
}
exports.SquadController = SquadController;
