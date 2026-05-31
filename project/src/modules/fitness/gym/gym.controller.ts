/**
 * Gym Controller - نقاط النهاية للجيمات والفروع والعضويات
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { GymService, BranchService, MembershipService } from './gym.service';
import {
  CreateGymDto,
  UpdateGymDto,
  CreateBranchDto,
  UpdateBranchDto,
  SubscribeDto,
  GymFilterDto,
} from './gym.dto';
import { GymStatus } from '../../../common/enums/gym.enum';

@ApiTags('Gyms')
@ApiBearerAuth()
@Controller('api/v1/gyms')
export class GymController {
  constructor(
    private readonly gymService: GymService,
    private readonly branchService: BranchService,
    private readonly membershipService: MembershipService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء جيم جديد' })
  async create(@Body() dto: CreateGymDto) {
    return this.gymService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الجيمات' })
  async list(@Query() filters: GymFilterDto) {
    return this.gymService.list(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل جيم مع فروعه' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.gymService.getById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تحديث بيانات جيم' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGymDto,
  ) {
    return this.gymService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف جيم (ناعم)' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.gymService.softDelete(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'موافقة إدارية على جيم' })
  async approve(
    @Param('id', ParseUUIDPipe) gymId: string,
    @Body('approved_by', ParseUUIDPipe) approvedBy: string,
  ) {
    return this.gymService.approve(gymId, approvedBy);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'تحديث حالة جيم' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) gymId: string,
    @Body('status') status: GymStatus,
  ) {
    return this.gymService.updateStatus(gymId, status);
  }

  // ─── Branches ───────────────────────────────────────────────────

  @Get(':id/branches')
  @ApiOperation({ summary: 'فروع جيم' })
  async getBranches(@Param('id', ParseUUIDPipe) gymId: string) {
    return this.branchService.getByGym(gymId);
  }

  @Post(':id/branches')
  @ApiOperation({ summary: 'إضافة فرع لجيم' })
  async createBranch(
    @Param('id', ParseUUIDPipe) gymId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchService.create(gymId, dto);
  }

  @Put('branches/:branchId')
  @ApiOperation({ summary: 'تحديث فرع' })
  async updateBranch(
    @Param('branchId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, dto);
  }

  @Delete('branches/:branchId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف فرع' })
  async deleteBranch(@Param('branchId', ParseUUIDPipe) id: string) {
    await this.branchService.delete(id);
  }

  // ─── Memberships ────────────────────────────────────────────────

  @Post('plans/:planId/subscribe')
  @ApiOperation({ summary: 'الاشتراك في خطة عضوية' })
  async subscribe(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.membershipService.subscribe(userId, dto);
  }

  @Post('memberships/:id/cancel')
  @ApiOperation({ summary: 'إلغاء عضوية' })
  async cancelMembership(
    @Param('id', ParseUUIDPipe) membershipId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.cancel(membershipId, userId);
  }

  @Post('memberships/:id/renew')
  @ApiOperation({ summary: 'تجديد عضوية' })
  async renewMembership(
    @Param('id', ParseUUIDPipe) membershipId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.renew(membershipId, userId);
  }
}
