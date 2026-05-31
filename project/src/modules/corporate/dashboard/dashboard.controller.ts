/**
 * =============================================================================
 * DashboardController - متحكم لوحة تحكم الشركات B2B
 * =============================================================================
 * يعالج طلبات تحليلات صحة الموظفين الخاصة بمديري الموارد البشرية (HR Admins)
 */

import {
  Controller,
  Get,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

/** حارس مبسط لمصادقة مدراء الشركات */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CorporateAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    // استخراج معرف مدير الـ HR من الهيدر أو المصادقة النشطة
    const userId = req.user?.id || req.headers['x-user-id'];
    if (userId) {
      req.user = { id: userId };
      return true;
    }
    return false;
  }
}

@Controller('corporate')
@UseGuards(CorporateAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * جلب تحليلات صحة ومشاركة شبكة الموظفين الخاصة بالشركة
   */
  @Get('hr/analytics')
  @HttpCode(HttpStatus.OK)
  async getHRAnalytics(@Request() req: any) {
    const analytics = await this.dashboardService.getHRAnalytics(req.user.id);
    return {
      success: true,
      data: analytics,
    };
  }
}
