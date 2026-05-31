/**
 * Employee Controller - نقاط النهاية لإدارة الموظفين
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeeService, CreateEmployeeDto, UpdateEmployeeDto } from './employee.service';
import { EmployeeStatus } from '../../../common/enums/gym.enum';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('api/v1/admin')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ─── Employees ──────────────────────────────────────────────────

  @Post('employees')
  @ApiOperation({ summary: 'إنشاء موظف جديد' })
  async create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @Get('employees')
  @ApiOperation({ summary: 'قائمة الموظفين' })
  async list(
    @Query('department_id') departmentId?: string,
    @Query('role_id') roleId?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.employeeService.list({
      department_id: departmentId,
      role_id: roleId,
      status,
      page: +page,
      limit: +limit,
    });
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'تفاصيل موظف' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeeService.getById(id);
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'تحديث موظف' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, dto);
  }

  @Put('employees/:id/status')
  @ApiOperation({ summary: 'تحديث حالة موظف' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EmployeeStatus,
  ) {
    return this.employeeService.updateStatus(id, status);
  }

  @Post('employees/:id/regions')
  @ApiOperation({ summary: 'تعيين مناطق لموظف' })
  async assignRegions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('regions') regions: string[],
  ) {
    return this.employeeService.assignRegions(id, regions);
  }

  @Get('employees/department/:deptId')
  @ApiOperation({ summary: 'موظفو قسم معين' })
  async getByDepartment(@Param('deptId', ParseUUIDPipe) deptId: string) {
    return this.employeeService.getByDepartment(deptId);
  }

  // ─── Departments ────────────────────────────────────────────────

  @Post('departments')
  @ApiOperation({ summary: 'إنشاء قسم' })
  async createDepartment(
    @Body('name') name: string,
    @Body('description') description?: string,
    @Body('parent_id') parentId?: string,
  ) {
    return this.employeeService.createDepartment(name, description, parentId);
  }

  @Get('departments')
  @ApiOperation({ summary: 'الأقسام' })
  async listDepartments() {
    return this.employeeService.listDepartments();
  }

  @Post('departments/seed')
  @ApiOperation({ summary: 'زرع الأقسام الافتراضية (8 أقسام)' })
  async seedDepartments() {
    await this.employeeService.seedDepartments();
    return { message: 'Departments seeded successfully' };
  }
}
