import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';

export class ChallengeController {
    static async listChallenges(req: AuthRequest, res: Response) {
        try {
            // Fetch real DB leaderboards
            // 1. Top by Total Points
            const topPointsQuery = await db.query(`
                SELECT u.full_name as name, tp.total_points as score 
                FROM trainee_profiles tp
                JOIN users u ON tp.user_id = u.id
                ORDER BY tp.total_points DESC LIMIT 10
            `);

            // 2. Top by Streak Days
            const topStreakQuery = await db.query(`
                SELECT u.full_name as name, tp.streak_days as days 
                FROM trainee_profiles tp
                JOIN users u ON tp.user_id = u.id
                ORDER BY tp.streak_days DESC LIMIT 10
            `);

            const mapLeaderboard = (rows: any[], scoreKey: string, scoreSuffix: string = '') => 
                rows.map((r, i) => ({
                    rank: i + 1,
                    name: r.name,
                    [scoreKey]: `${r[scoreKey]}${scoreSuffix}`,
                    medal: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐',
                    isMe: false // in a real app, check against req.user.userId
                }));

            const challenges = [
                {
                    id: 1, emoji: '🔥', color: '#FF6B35',
                    titleEn: '30-Day Fat Loss Challenge', titleAr: 'تحدي خسارة دهون 30 يوم',
                    descEn: 'Lose 2-4 kg in 30 days with structured workouts and diet plan.', descAr: 'اخسر 2-4 كيلو في 30 يوماً ببرنامج تمارين ونظام غذائي منظم.',
                    prize: 'EGP 500 Wallet Credit', prizeAr: '500 ج.م رصيد محفظة',
                    participants: 2840, goal: 'Lose 2kg+', goalAr: 'خسارة 2كج+',
                    daysLeft: 18, totalDays: 30, joined: true,
                    leaderboard: [
                        { rank: 1, name: 'Sara K.', lost: '3.8 kg', medal: '🥇' },
                        { rank: 2, name: 'Ahmed M.', lost: '3.2 kg', medal: '🥈' },
                        { rank: 3, name: 'Nour H.', lost: '2.9 kg', medal: '🥉' },
                        { rank: 12, name: 'You', lost: '1.4 kg', medal: '⭐', isMe: true },
                    ]
                },
                {
                    id: 2, emoji: '💪', color: '#00FFA3',
                    titleEn: 'Global Streak Challenge', titleAr: 'تحدي السلاسل العالمي',
                    descEn: 'Maintain the highest streak of consecutive gym days.', descAr: 'حافظ على أعلى سلسلة من الأيام المتتالية في الصالة الرياضية.',
                    prize: 'Gold Badge + 200 pts', prizeAr: 'شارة ذهبية + 200 نقطة',
                    participants: topStreakQuery.rowCount || 5120, goal: 'Max streak days', goalAr: 'أقصى سلسلة أيام',
                    daysLeft: 7, totalDays: 21, joined: true,
                    leaderboard: mapLeaderboard(topStreakQuery.rows, 'days', ' Days')
                },
                {
                    id: 3, emoji: '⭐', color: '#00B8FF',
                    titleEn: 'Top Point Earners', titleAr: 'أعلى محصلي النقاط',
                    descEn: 'Global Leaderboard tracking the highest earned gamification points.', descAr: 'لوحة الصدارة العالمية لتتبع أعلى نقاط مسجلة.',
                    prize: 'Platinum Badge', prizeAr: 'شارة بلاتينية',
                    participants: topPointsQuery.rowCount || 12400, goal: 'Max points', goalAr: 'أقصى نقاط',
                    daysLeft: 24, totalDays: 30, joined: false,
                    leaderboard: mapLeaderboard(topPointsQuery.rows, 'score', ' pts')
                }
            ];

            return res.status(200).json({ success: true, challenges });
        } catch (error) {
            console.error('[ChallengeController] listChallenges:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async joinChallenge(req: AuthRequest, res: Response) {
        try {
            return res.status(200).json({ success: true, message: 'Joined challenge successfully' });
        } catch (error) {
            console.error('[ChallengeController] joinChallenge:', error);
            return res.status(500).json({ success: false, message: 'Failed to join challenge' });
        }
    }

    static async createLiveSquadChallenge(req: AuthRequest, res: Response) {
        try {
            const { squadId, challengeType, goal, durationDays } = req.body;
            if (!squadId || !challengeType || !goal) {
                return res.status(400).json({ success: false, message: 'Missing required parameters' });
            }
            // Mock logic for creating a squad challenge
            return res.status(201).json({ 
                success: true, 
                message: 'Live squad challenge created successfully',
                challenge: { squadId, challengeType, goal, durationDays, status: 'active' }
            });
        } catch (error) {
            console.error('[ChallengeController] createLiveSquadChallenge:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async trackUserHabit(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const { habitType, amount } = req.body; // e.g., 'water', 'fasting_hours'
            if (!habitType || amount === undefined) {
                return res.status(400).json({ success: false, message: 'Missing habit data' });
            }
            // Mock logic for tracking habit and rewarding coins/points
            return res.status(200).json({ 
                success: true, 
                message: `${habitType} tracked successfully! You earned 10 coins.`,
                coinsEarned: 10
            });
        } catch (error) {
            console.error('[ChallengeController] trackUserHabit:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    }

    static async getCorporateLeaderboard(req: AuthRequest, res: Response) {
        try {
            // Mock corporate B2B leaderboard data
            const corporateLeaderboard = [
                { rank: 1, companyName: 'TechCorp Egypt', points: 15400, topDepartment: 'Engineering' },
                { rank: 2, companyName: 'Innovate LLC', points: 12100, topDepartment: 'Sales' },
                { rank: 3, companyName: 'GemZ Internal', points: 9800, topDepartment: 'Marketing' }
            ];
            return res.status(200).json({ success: true, corporateLeaderboard });
        } catch (error) {
            console.error('[ChallengeController] getCorporateLeaderboard:', error);
            return res.status(500).json({ success: false, message: 'Server Error' });
        }
    }
}

