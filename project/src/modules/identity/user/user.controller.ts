/**
 * ============================================================================
 * GEM Z - Identity Module
 * UserController - متحكم إدارة المستخدمين
 * ============================================================================
 * CRUD endpoints للمستخدمين - تتطلب صلاحيات إدارية
 * ============================================================================
 */

import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  UserResponseDto, UserFilterDto, UpdateUserDto, UpdateUserStatusDto,
  UpdateUserSettingsDto, UserProfileDto,
} from './user.dto';
import { User } from './user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'الحصول على ملف المستخدم الشخصي' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getMe(@Param('userId') userId: string): Promise<User> {
    return this.userService.findById(userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'تحديث بيانات المستخدم' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(@Param('userId') userId: string, @Body() dto: UpdateUserDto): Promise<User> {
    return this.userService.update(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة المستخدمين (ادمن)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(@Query() filters: UserFilterDto): Promise<{ items: User[]; total: number }> {
    return this.userService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'الحصول على مستخدم بواسطة ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.userService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'تحديث مستخدم' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(id, dto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'تحديث حالة المستخدم' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<User> {
    return this.userService.updateStatus(id, dto);
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'تحديث اعدادات المستخدم' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserSettingsDto,
  ): Promise<User> {
    return this.userService.updateSettings(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'حذف مستخدم (soft delete)' })
  @ApiResponse({ status: 204 })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.softDelete(id);
  }
}
