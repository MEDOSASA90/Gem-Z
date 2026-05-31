/**
 * ============================================================================
 * GEM Z - Identity Module
 * RBAC DTOs
 * ============================================================================
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsArray, IsNumber, Min, Max,
  IsBoolean, IsDateString, Length, ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PermissionCategory } from './permission.entity';

// ============================================================================
// Role DTOs
// ============================================================================

export class CreateRoleDto {
  @ApiProperty() @IsString() @Length(1, 100) name: string;
  @ApiProperty() @IsString() @Length(1, 100) slug: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() @Min(1) @Max(100) level: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSystem?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { each: true }) permissionIds?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 100) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) @Max(100) level?: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4', { each: true }) permissionIds?: string[];
}

// ============================================================================
// Permission DTOs
// ============================================================================

export class CreatePermissionDto {
  @ApiProperty() @IsString() @Length(1, 100) scope: string;
  @ApiProperty() @IsString() @Length(1, 50) action: string;
  @ApiProperty() @IsString() @Length(1, 50) resource: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty({ enum: PermissionCategory }) @IsEnum(PermissionCategory) category: PermissionCategory;
}

// ============================================================================
// Assignment DTOs
// ============================================================================

export class AssignRoleDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsUUID() roleId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString({ each: true }) scopeRegions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}

export class RevokeRoleDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsUUID() roleId: string;
}

// ============================================================================
// Check Permission DTO
// ============================================================================

export class CheckPermissionDto {
  @ApiProperty() @IsUUID() userId: string;
  @ApiProperty() @IsString() scope: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export class RoleResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() name: string;
  @Expose() @ApiProperty() slug: string;
  @Expose() @ApiPropertyOptional() description?: string;
  @Expose() @ApiProperty() level: number;
  @Expose() @ApiProperty() isSystem: boolean;
  @Expose() @ApiProperty() permissions: PermissionResponseDto[];
  @Expose() @ApiProperty() createdAt: Date;
}

export class PermissionResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() scope: string;
  @Expose() @ApiProperty() action: string;
  @Expose() @ApiProperty() resource: string;
  @Expose() @ApiPropertyOptional() description?: string;
  @Expose() @ApiProperty() category: PermissionCategory;
}

export class UserRoleResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() userId: string;
  @Expose() @ApiProperty() roleId: string;
  @Expose() @ApiPropertyOptional() roleName?: string;
  @Expose() @ApiPropertyOptional() assignedBy?: string;
  @Expose() @ApiProperty() scopeRegions: string[];
  @Expose() @ApiPropertyOptional() expiresAt?: Date;
  @Expose() @ApiProperty() createdAt: Date;
}

export class UserPermissionsResponseDto {
  @Expose() @ApiProperty() userId: string;
  @Expose() @ApiProperty({ type: [String] }) scopes: string[];
  @Expose() @ApiProperty({ type: [String] }) roles: string[];
}
