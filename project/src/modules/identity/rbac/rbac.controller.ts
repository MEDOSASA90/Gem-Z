/**
 * ============================================================================
 * GEM Z - Identity Module
 * RBACController - متحكم التحكم بالوصول
 * ============================================================================
 */

import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RBACService } from './rbac.service';
import {
  CreateRoleDto, UpdateRoleDto, CreatePermissionDto,
  AssignRoleDto, RevokeRoleDto, CheckPermissionDto,
  RoleResponseDto, PermissionResponseDto, UserRoleResponseDto,
  UserPermissionsResponseDto,
} from './rbac.dto';
import { AuthWithPermissions } from './rbac.decorator';

@ApiTags('RBAC')
@ApiBearerAuth()
@Controller()
export class RBACController {
  constructor(private readonly rbacService: RBACService) {}

  // ============================================================================
  // Permissions
  // ============================================================================

  @Post('admin/permissions')
  @AuthWithPermissions('permission:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'انشاء صلاحية جديدة' })
  async createPermission(@Body() dto: CreatePermissionDto): Promise<PermissionResponseDto> {
    const perm = await this.rbacService.createPermission(dto);
    return { ...perm } as PermissionResponseDto;
  }

  @Get('admin/permissions')
  @AuthWithPermissions('permission:manage', 'role:manage')
  @ApiOperation({ summary: 'قائمة الصلاحيات' })
  async findAllPermissions(): Promise<PermissionResponseDto[]> {
    const perms = await this.rbacService.findAllPermissions();
    return perms as PermissionResponseDto[];
  }

  // ============================================================================
  // Roles
  // ============================================================================

  @Get('admin/roles')
  @AuthWithPermissions('role:manage')
  @ApiOperation({ summary: 'قائمة الادوار' })
  async findAllRoles(): Promise<RoleResponseDto[]> {
    return await this.rbacService.findAllRoles() as RoleResponseDto[];
  }

  @Post('admin/roles')
  @AuthWithPermissions('role:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'انشاء دور جديد' })
  async createRole(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.rbacService.createRole(dto);
    return role as unknown as RoleResponseDto;
  }

  @Put('admin/roles/:id')
  @AuthWithPermissions('role:manage')
  @ApiOperation({ summary: 'تحديث دور' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.rbacService.updateRole(id, dto);
    return role as unknown as RoleResponseDto;
  }

  @Delete('admin/roles/:id')
  @AuthWithPermissions('role:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف دور' })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rbacService.deleteRole(id);
  }

  // ============================================================================
  // Role Assignment
  // ============================================================================

  @Post('admin/roles/assign')
  @AuthWithPermissions('role:manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تعيين دور لمستخدم' })
  async assignRole(@Body() dto: AssignRoleDto): Promise<UserRoleResponseDto> {
    const ur = await this.rbacService.assignRole(dto);
    return ur as UserRoleResponseDto;
  }

  @Post('admin/roles/revoke')
  @AuthWithPermissions('role:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'الغاء دور من مستخدم' })
  async revokeRole(@Body() dto: RevokeRoleDto): Promise<{ message: string }> {
    await this.rbacService.revokeRole(dto.userId, dto.roleId);
    return { message: 'تم الغاء الدور بنجاح' };
  }

  // ============================================================================
  // User Roles & Permissions
  // ============================================================================

  @Get('users/:id/roles')
  @AuthWithPermissions('role:manage', 'user:read')
  @ApiOperation({ summary: 'ادوار المستخدم' })
  async getUserRoles(@Param('id', ParseUUIDPipe) userId: string): Promise<UserRoleResponseDto[]> {
    const roles = await this.rbacService.getUserRoles(userId);
    return roles as UserRoleResponseDto[];
  }

  @Get('users/:id/permissions')
  @AuthWithPermissions('role:manage', 'user:read')
  @ApiOperation({ summary: 'صلاحيات المستخدم' })
  async getUserPermissions(
    @Param('id', ParseUUIDPipe) userId: string,
  ): Promise<UserPermissionsResponseDto> {
    const scopes = await this.rbacService.getUserPermissions(userId);
    const roles = await this.rbacService.getUserRoleNames(userId);
    return { userId, scopes, roles };
  }

  @Post('permissions/check')
  @AuthWithPermissions('role:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'التحقق من صلاحية مستخدم' })
  async checkPermission(@Body() dto: CheckPermissionDto): Promise<{ hasPermission: boolean }> {
    const result = await this.rbacService.checkPermission(dto.userId, dto.scope);
    return { hasPermission: result };
  }

  // ============================================================================
  // Seeding
  // ============================================================================

  @Post('admin/roles/seed')
  @AuthWithPermissions('system:config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تهيئة الادوار والصلاحيات الافتراضية' })
  async seed(): Promise<{ message: string }> {
    await this.rbacService.seedDefaults();
    return { message: 'تمت التهيئة بنجاح' };
  }
}
