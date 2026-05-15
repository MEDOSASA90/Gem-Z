/**
 * GEM Z — Corporate Wellness Service
 *
 * Business logic for corporate wellness programs:
 * - Company registration and management
 * - Employee enrollment and engagement tracking
 * - HR dashboard with analytics
 * - Wellness plan assignment
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ForbiddenError,
    ErrorCode,
} from '../../core/errors';

const log = createLogger('corporate-service');

// ─── Types ──────────────────────────────────────────────────────

export interface CorporateCompany {
    id: string;
    name: string;
    industry: string | null;
    size: number;
    adminUserId: string | null;
    contactEmail: string;
    contactPhone: string | null;
    subscriptionPlan: string;
    monthlyCostEgp: number;
    isActive: boolean;
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface CorporateEmployee {
    id: string;
    companyId: string;
    userId: string | null;
    email: string;
    fullName: string;
    department: string | null;
    jobTitle: string | null;
    engagementScore: number;
    workoutsCompleted: number;
    lastActiveAt: Date | null;
    assignedPlanId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DashboardStats {
    totalEmployees: number;
    activeEmployees: number;
    avgEngagementScore: number;
    totalWorkoutsCompleted: number;
    monthlyCost: number;
    departments: { name: string; count: number; avgEngagement: number }[];
    engagementTrend: { month: string; score: number }[];
}

// ─── Service ────────────────────────────────────────────────────

export class CorporateService {
    constructor(private pool: Pool) {}

    // ─── Company Registration ─────────────────────────────────

    async registerCompany(data: {
        name: string;
        industry?: string;
        size: number;
        adminUserId: string;
        contactEmail: string;
        contactPhone?: string;
        subscriptionPlan?: string;
    }): Promise<CorporateCompany> {
        const { name, industry, size, adminUserId, contactEmail, contactPhone, subscriptionPlan } = data;

        if (!name || name.trim().length === 0) {
            throw new ValidationError('Company name is required', ErrorCode.INVALID_INPUT);
        }
        if (!size || size < 1) {
            throw new ValidationError('Company size must be at least 1', ErrorCode.INVALID_INPUT);
        }
        if (!contactEmail || !contactEmail.includes('@')) {
            throw new ValidationError('Valid contact email is required', ErrorCode.INVALID_INPUT);
        }

        // Check if user already admin of a company
        const existing = await this.pool.query(
            'SELECT id FROM corporate_companies WHERE admin_user_id = $1 AND is_active = true',
            [adminUserId]
        );
        if (existing.rows.length > 0) {
            throw new ValidationError('User already admin of an active company', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        const planCosts: Record<string, number> = { basic: 500, standard: 1500, premium: 5000 };
        const plan = subscriptionPlan || 'basic';
        const monthlyCost = planCosts[plan] || 500;

        const result = await this.pool.query(
            `
            INSERT INTO corporate_companies (
                id, name, industry, size, admin_user_id, contact_email,
                contact_phone, subscription_plan, monthly_cost_egp, is_active, settings
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, '{}')
            RETURNING
                id, name, industry, size, admin_user_id as "adminUserId",
                contact_email as "contactEmail", contact_phone as "contactPhone",
                subscription_plan as "subscriptionPlan", monthly_cost_egp as "monthlyCostEgp",
                is_active as "isActive", settings, created_at as "createdAt", updated_at as "updatedAt"
            `,
            [uuidv4(), name.trim(), industry || null, size, adminUserId, contactEmail.trim(), contactPhone || null, plan, monthlyCost]
        );

        log.info({ companyId: result.rows[0].id, name }, 'Company registered');
        return result.rows[0];
    }

    // ─── Get Company ──────────────────────────────────────────

    async getCompany(companyId: string, adminUserId: string): Promise<CorporateCompany> {
        const result = await this.pool.query(
            `
            SELECT
                id, name, industry, size, admin_user_id as "adminUserId",
                contact_email as "contactEmail", contact_phone as "contactPhone",
                subscription_plan as "subscriptionPlan", monthly_cost_egp as "monthlyCostEgp",
                is_active as "isActive", settings, created_at as "createdAt", updated_at as "updatedAt"
            FROM corporate_companies
            WHERE id = $1 AND admin_user_id = $2 AND is_active = true
            `,
            [companyId, adminUserId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Company not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        return result.rows[0];
    }

    // ─── Add Employee ─────────────────────────────────────────

    async addEmployee(data: {
        companyId: string;
        email: string;
        fullName: string;
        department?: string;
        jobTitle?: string;
        adminUserId: string;
    }): Promise<CorporateEmployee> {
        const { companyId, email, fullName, department, jobTitle, adminUserId } = data;

        // Verify admin owns the company
        const companyCheck = await this.pool.query(
            'SELECT id FROM corporate_companies WHERE id = $1 AND admin_user_id = $2 AND is_active = true',
            [companyId, adminUserId]
        );
        if (companyCheck.rows.length === 0) {
            throw new ForbiddenError('Not authorized for this company', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        if (!email || !email.includes('@')) {
            throw new ValidationError('Valid email is required', ErrorCode.INVALID_INPUT);
        }
        if (!fullName || fullName.trim().length === 0) {
            throw new ValidationError('Full name is required', ErrorCode.INVALID_INPUT);
        }

        // Check duplicate email in company
        const duplicate = await this.pool.query(
            'SELECT id FROM corporate_employees WHERE company_id = $1 AND email = $2',
            [companyId, email.toLowerCase()]
        );
        if (duplicate.rows.length > 0) {
            throw new ValidationError('Employee with this email already exists', ErrorCode.CONFLICT_DUPLICATE_RESOURCE);
        }

        const result = await this.pool.query(
            `
            INSERT INTO corporate_employees (
                id, company_id, email, full_name, department, job_title, engagement_score, workouts_completed, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0, true)
            RETURNING
                id, company_id as "companyId", user_id as "userId", email, full_name as "fullName",
                department, job_title as "jobTitle", engagement_score as "engagementScore",
                workouts_completed as "workoutsCompleted", last_active_at as "lastActiveAt",
                assigned_plan_id as "assignedPlanId", is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
            `,
            [uuidv4(), companyId, email.toLowerCase(), fullName.trim(), department || null, jobTitle || null]
        );

        log.info({ employeeId: result.rows[0].id, companyId, email }, 'Employee added');
        return result.rows[0];
    }

    // ─── List Employees ───────────────────────────────────────

    async listEmployees(companyId: string, adminUserId: string): Promise<CorporateEmployee[]> {
        // Verify admin owns the company
        const companyCheck = await this.pool.query(
            'SELECT id FROM corporate_companies WHERE id = $1 AND admin_user_id = $2 AND is_active = true',
            [companyId, adminUserId]
        );
        if (companyCheck.rows.length === 0) {
            throw new ForbiddenError('Not authorized for this company', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const result = await this.pool.query(
            `
            SELECT
                id, company_id as "companyId", user_id as "userId", email, full_name as "fullName",
                department, job_title as "jobTitle", engagement_score as "engagementScore",
                workouts_completed as "workoutsCompleted", last_active_at as "lastActiveAt",
                assigned_plan_id as "assignedPlanId", is_active as "isActive",
                created_at as "createdAt", updated_at as "updatedAt"
            FROM corporate_employees
            WHERE company_id = $1
            ORDER BY created_at DESC
            `,
            [companyId]
        );

        return result.rows;
    }

    // ─── Assign Wellness Plan ─────────────────────────────────

    async assignPlan(companyId: string, employeeId: string, planId: string, adminUserId: string): Promise<void> {
        // Verify admin owns the company
        const companyCheck = await this.pool.query(
            'SELECT id FROM corporate_companies WHERE id = $1 AND admin_user_id = $2 AND is_active = true',
            [companyId, adminUserId]
        );
        if (companyCheck.rows.length === 0) {
            throw new ForbiddenError('Not authorized for this company', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const result = await this.pool.query(
            `
            UPDATE corporate_employees
            SET assigned_plan_id = $1, updated_at = NOW()
            WHERE id = $2 AND company_id = $3
            RETURNING id
            `,
            [planId, employeeId, companyId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Employee not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ employeeId, companyId, planId }, 'Wellness plan assigned');
    }

    // ─── HR Dashboard ─────────────────────────────────────────

    async getDashboard(companyId: string, adminUserId: string): Promise<DashboardStats> {
        // Verify admin owns the company
        const companyCheck = await this.pool.query(
            'SELECT id, monthly_cost_egp FROM corporate_companies WHERE id = $1 AND admin_user_id = $2 AND is_active = true',
            [companyId, adminUserId]
        );
        if (companyCheck.rows.length === 0) {
            throw new ForbiddenError('Not authorized for this company', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const monthlyCost = Number(companyCheck.rows[0].monthly_cost_egp);

        // Aggregate stats
        const statsResult = await this.pool.query(
            `
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_active = true) as active,
                COALESCE(AVG(engagement_score), 0) as avg_engagement,
                COALESCE(SUM(workouts_completed), 0) as total_workouts
            FROM corporate_employees
            WHERE company_id = $1
            `,
            [companyId]
        );

        const stats = statsResult.rows[0];

        // Department breakdown
        const deptResult = await this.pool.query(
            `
            SELECT
                COALESCE(department, 'Unassigned') as name,
                COUNT(*) as count,
                COALESCE(AVG(engagement_score), 0) as avg_engagement
            FROM corporate_employees
            WHERE company_id = $1
            GROUP BY department
            ORDER BY count DESC
            `,
            [companyId]
        );

        // Mock engagement trend (last 6 months)
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                month: d.toLocaleString('en', { month: 'short', year: 'numeric' }),
                score: Math.round(40 + Math.random() * 50),
            });
        }

        return {
            totalEmployees: parseInt(stats.total),
            activeEmployees: parseInt(stats.active),
            avgEngagementScore: Math.round(Number(stats.avg_engagement)),
            totalWorkoutsCompleted: parseInt(stats.total_workouts),
            monthlyCost,
            departments: deptResult.rows.map(r => ({
                name: r.name,
                count: parseInt(r.count),
                avgEngagement: Math.round(Number(r.avg_engagement)),
            })),
            engagementTrend: months,
        };
    }

    // ─── Remove Employee ──────────────────────────────────────

    async removeEmployee(companyId: string, employeeId: string, adminUserId: string): Promise<void> {
        const companyCheck = await this.pool.query(
            'SELECT id FROM corporate_companies WHERE id = $1 AND admin_user_id = $2 AND is_active = true',
            [companyId, adminUserId]
        );
        if (companyCheck.rows.length === 0) {
            throw new ForbiddenError('Not authorized', ErrorCode.FORBIDDEN_RESOURCE_ACCESS);
        }

        const result = await this.pool.query(
            'UPDATE corporate_employees SET is_active = false, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
            [employeeId, companyId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Employee not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ employeeId, companyId }, 'Employee deactivated');
    }
}
