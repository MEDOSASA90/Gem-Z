/**
 * GEM Z — Corporate Wellness Controller
 *
 * Handles company registration, employee management, and HR dashboard.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { CorporateService } from './corporate.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const corporateService = new CorporateService(db);
const log = createLogger('corporate-controller');

export class CorporateController {
    /**
     * POST /api/v1/corporate/register
     * Register a new company.
     */
    static async registerCompany(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { name, industry, size, contact_email, contact_phone, subscription_plan } = req.body;

            log.info({ userId, name }, 'Registering company');

            const company = await corporateService.registerCompany({
                name,
                industry,
                size,
                adminUserId: userId,
                contactEmail: contact_email,
                contactPhone: contact_phone,
                subscriptionPlan: subscription_plan,
            });

            res.status(201).json(success(company, 'Company registered'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/corporate/dashboard
     * Get HR dashboard with stats.
     */
    static async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { company_id } = req.query;

            if (!company_id) {
                return res.status(400).json({ success: false, message: 'company_id is required', code: 'INVALID_INPUT', statusCode: 400 });
            }

            const dashboard = await corporateService.getDashboard(company_id as string, userId);
            res.status(200).json(success(dashboard, 'Dashboard retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/corporate/employees
     * List employees for a company.
     */
    static async listEmployees(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { company_id } = req.query;

            if (!company_id) {
                return res.status(400).json({ success: false, message: 'company_id is required', code: 'INVALID_INPUT', statusCode: 400 });
            }

            const employees = await corporateService.listEmployees(company_id as string, userId);
            res.status(200).json(success(employees, 'Employees retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/corporate/employees
     * Add an employee.
     */
    static async addEmployee(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { company_id, email, full_name, department, job_title } = req.body;

            const employee = await corporateService.addEmployee({
                companyId: company_id,
                email,
                fullName: full_name,
                department,
                jobTitle: job_title,
                adminUserId: userId,
            });

            res.status(201).json(success(employee, 'Employee added'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/corporate/assign-plan
     * Assign a wellness plan to an employee.
     */
    static async assignPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { company_id, employee_id, plan_id } = req.body;

            await corporateService.assignPlan(company_id, employee_id, plan_id, userId);
            res.status(200).json(success(null, 'Plan assigned'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/corporate/employees/:id
     * Remove an employee.
     */
    static async removeEmployee(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { company_id } = req.query;

            await corporateService.removeEmployee(company_id as string, id, userId);
            res.status(200).json(success(null, 'Employee removed'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/corporate/companies
     * Get companies for the authenticated user.
     */
    static async getCompanies(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const result = await db.query(
                `
                SELECT
                    id, name, industry, size, admin_user_id as "adminUserId",
                    contact_email as "contactEmail", contact_phone as "contactPhone",
                    subscription_plan as "subscriptionPlan", monthly_cost_egp as "monthlyCostEgp",
                    is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
                FROM corporate_companies
                WHERE admin_user_id = $1 AND is_active = true
                ORDER BY created_at DESC
                `,
                [userId]
            );
            res.status(200).json(success(result.rows, 'Companies retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
