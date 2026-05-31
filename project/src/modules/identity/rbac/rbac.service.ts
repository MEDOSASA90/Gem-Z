/**
 * ============================================================================
 * GEM Z - Identity Module
 * RBACService - خدمة التحكم بالوصول القائم على الأدوار
 * ============================================================================
 * مسؤولة عن:
 * - تعيين/الغاء الأدوار للمستخدمين
 * - التحقق من الصلاحيات
 * - استرجاع أدوار وصلاحيات المستخدم
 * - التهيئة (Seed) بالأدوار والصلاحيات الافتراضية
 * ============================================================================
 */

import {
  Injectable, Logger, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource } from 'typeorm';
import { Role } from './role.entity';
import { Permission, PermissionCategory } from './permission.entity';
import { UserRole } from './user-role.entity';
import { CreateRoleDto, UpdateRoleDto, CreatePermissionDto, AssignRoleDto } from './rbac.dto';

/** الصلاحيات الافتراضية */
export const DEFAULT_PERMISSIONS: Array<{
  scope: string; action: string; resource: string; description: string; category: PermissionCategory;
}> = [
  // Finance
  { scope: 'wallet:read', action: 'read', resource: 'wallet', description: 'قراءة محفظة المستخدم', category: PermissionCategory.FINANCE },
  { scope: 'wallet:reconcile', action: 'reconcile', resource: 'wallet', description: 'تسوية محفظة', category: PermissionCategory.FINANCE },
  { scope: 'payout:approve', action: 'approve', resource: 'payout', description: 'الموافقة على دفعة', category: PermissionCategory.FINANCE },
  { scope: 'refund:approve', action: 'approve', resource: 'refund', description: 'الموافقة على استرداد', category: PermissionCategory.FINANCE },
  { scope: 'transaction:read', action: 'read', resource: 'transaction', description: 'قراءة المعاملات', category: PermissionCategory.FINANCE },
  { scope: 'transaction:reverse', action: 'reverse', resource: 'transaction', description: 'عكس معاملة', category: PermissionCategory.FINANCE },
  // KYC
  { scope: 'kyc:review', action: 'review', resource: 'kyc', description: 'مراجعة KYC', category: PermissionCategory.KYC },
  { scope: 'kyc:escalate', action: 'escalate', resource: 'kyc', description: 'تصعيد KYC', category: PermissionCategory.KYC },
  { scope: 'kyc:override', action: 'override', resource: 'kyc', description: 'تجاوز KYC', category: PermissionCategory.KYC },
  // Operations
  { scope: 'gym:approve', action: 'approve', resource: 'gym', description: 'الموافقة على صالة رياضية', category: PermissionCategory.OPERATIONS },
  { scope: 'store:approve', action: 'approve', resource: 'store', description: 'الموافقة على متجر', category: PermissionCategory.OPERATIONS },
  { scope: 'logistics:manage', action: 'manage', resource: 'logistics', description: 'ادارة الخدمات اللوجستية', category: PermissionCategory.OPERATIONS },
  { scope: 'booking:manage', action: 'manage', resource: 'booking', description: 'ادارة الحجوزات', category: PermissionCategory.OPERATIONS },
  // Security
  { scope: 'fraud:investigate', action: 'investigate', resource: 'fraud', description: 'التحقيق في الاحتيال', category: PermissionCategory.SECURITY },
  { scope: 'device:block', action: 'block', resource: 'device', description: 'حظر جهاز', category: PermissionCategory.SECURITY },
  { scope: 'user:suspend', action: 'suspend', resource: 'user', description: 'تعليق مستخدم', category: PermissionCategory.SECURITY },
  { scope: 'user:read', action: 'read', resource: 'user', description: 'قراءة بيانات المستخدمين', category: PermissionCategory.SECURITY },
  { scope: 'user:manage', action: 'manage', resource: 'user', description: 'ادارة المستخدمين', category: PermissionCategory.SECURITY },
  // Content
  { scope: 'reels:moderate', action: 'moderate', resource: 'reels', description: 'الاشراف على الريلز', category: PermissionCategory.CONTENT },
  { scope: 'creator:suspend', action: 'suspend', resource: 'creator', description: 'تعليق منشئ محتوى', category: PermissionCategory.CONTENT },
  { scope: 'ads:approve', action: 'approve', resource: 'ads', description: 'الموافقة على اعلان', category: PermissionCategory.CONTENT },
  // System
  { scope: 'role:manage', action: 'manage', resource: 'role', description: 'ادارة الادوار', category: PermissionCategory.SYSTEM },
  { scope: 'permission:manage', action: 'manage', resource: 'permission', description: 'ادارة الصلاحيات', category: PermissionCategory.SYSTEM },
  { scope: 'audit:read', action: 'read', resource: 'audit', description: 'قراءة سجلات التدقيق', category: PermissionCategory.SYSTEM },
  { scope: 'system:config', action: 'config', resource: 'system', description: 'اعدادات النظام', category: PermissionCategory.SYSTEM },
];

/** الأدوار الافتراضية مع صلاحياتها */
export const DEFAULT_ROLES: Array<{
  name: string; slug: string; description: string; level: number; isSystem: boolean; permissions: string[];
}> = [
  {
    name: 'Super Admin', slug: 'super_admin', description: 'مدير النظام الاعلى - كل الصلاحيات',
    level: 1, isSystem: true,
    permissions: DEFAULT_PERMISSIONS.map(p => p.scope),
  },
  {
    name: 'Finance Officer', slug: 'finance_officer', description: 'مسؤول المالية',
    level: 2, isSystem: true,
    permissions: ['wallet:read', 'wallet:reconcile', 'payout:approve', 'refund:approve', 'transaction:read', 'transaction:reverse'],
  },
  {
    name: 'KYC Reviewer', slug: 'kyc_reviewer', description: 'مراجع KYC',
    level: 3, isSystem: true,
    permissions: ['kyc:review', 'kyc:escalate', 'user:read'],
  },
  {
    name: 'Moderator', slug: 'moderator', description: 'مشرف المحتوى',
    level: 4, isSystem: true,
    permissions: ['reels:moderate', 'creator:suspend', 'ads:approve'],
  },
  {
    name: 'Support Agent', slug: 'support_agent', description: 'وكيل الدعم',
    level: 5, isSystem: true,
    permissions: ['user:read', 'ticket:manage', 'refund:approve'],
  },
  {
    name: 'Regional Manager', slug: 'regional_manager', description: 'مدير اقليمي',
    level: 3, isSystem: true,
    permissions: ['gym:approve', 'store:approve', 'user:read', 'booking:manage', 'logistics:manage'],
  },
  {
    name: 'Operations Engineer', slug: 'operations_engineer', description: 'مهندس العمليات',
    level: 4, isSystem: true,
    permissions: ['logistics:manage', 'gym:approve', 'store:approve', 'system:config'],
  },
  {
    name: 'Fraud Analyst', slug: 'fraud_analyst', description: 'محلل الاحتيال',
    level: 3, isSystem: true,
    permissions: ['fraud:investigate', 'device:block', 'user:suspend', 'kyc:review', 'transaction:read'],
  },
];

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);

  constructor(
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // Permission Management
  // ============================================================================

  /** انشاء صلاحية جديدة */
  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({ where: { scope: dto.scope } });
    if (existing) throw new ConflictException('نطاق الصلاحية موجود مسبقاً');

    const permission = this.permissionRepository.create(dto);
    const saved = await this.permissionRepository.save(permission);
    this.logger.log(`Permission created: ${saved.scope}`);
    return saved;
  }

  /** قائمة الصلاحيات */
  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({ order: { category: 'ASC', scope: 'ASC' } });
  }

  /** العثور على صلاحية بواسطة scope */
  async findPermissionByScope(scope: string): Promise<Permission | null> {
    return this.permissionRepository.findOne({ where: { scope } });
  }

  // ============================================================================
  // Role Management
  // ============================================================================

  /** انشاء دور جديد */
  async createRole(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepository.findOne({ where: { slug: dto.slug }, withDeleted: true });
    if (existing) throw new ConflictException('Slug الدور موجود مسبقاً');

    const role = this.roleRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      level: dto.level,
      isSystem: dto.isSystem ?? false,
    });

    // ربط الصلاحيات
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findBy({ id: In(dto.permissionIds) });
      role.permissions = permissions;
    }

    const saved = await this.roleRepository.save(role);
    this.logger.log(`Role created: ${saved.slug}`);
    return saved;
  }

  /** تحديث دور */
  async updateRole(roleId: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId }, relations: ['permissions'] });
    if (!role) throw new NotFoundException('الدور غير موجود');
    if (role.isSystem) throw new BadRequestException('لا يمكن تعديل دور النظام');

    Object.assign(role, dto);

    if (dto.permissionIds) {
      const permissions = await this.permissionRepository.findBy({ id: In(dto.permissionIds) });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  /** حذف دور */
  async deleteRole(roleId: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('الدور غير موجود');
    if (role.isSystem) throw new BadRequestException('لا يمكن حذف دور النظام');
    await this.roleRepository.softDelete(roleId);
    this.logger.log(`Role deleted: ${roleId}`);
  }

  /** قائمة الأدوار */
  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'], order: { level: 'ASC' } });
  }

  /** العثور على دور بواسطة slug */
  async findRoleBySlug(slug: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { slug }, relations: ['permissions'] });
  }

  // ============================================================================
  // Role Assignment
  // ============================================================================

  /** تعيين دور لمستخدم */
  async assignRole(dto: AssignRoleDto): Promise<UserRole> {
    const role = await this.roleRepository.findOne({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('الدور غير موجود');

    // التحقق من عدم وجود تعيين مكرر
    const existing = await this.userRoleRepository.findOne({
      where: { userId: dto.userId, roleId: dto.roleId },
    });
    if (existing) throw new ConflictException('المستخدم لديه هذا الدور مسبقاً');

    const userRole = this.userRoleRepository.create({
      userId: dto.userId,
      roleId: dto.roleId,
      assignedBy: dto.assignedBy ?? null,
      scopeRegions: dto.scopeRegions ?? [],
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.userRoleRepository.save(userRole);
    this.logger.log(`Role ${role.slug} assigned to user ${dto.userId}`);
    return saved;
  }

  /** الغاء دور من مستخدم */
  async revokeRole(userId: string, roleId: string): Promise<void> {
    const result = await this.userRoleRepository.delete({ userId, roleId });
    if (result.affected === 0) throw new NotFoundException('التعيين غير موجود');
    this.logger.log(`Role ${roleId} revoked from user ${userId}`);
  }

  /** جلب أدوار المستخدم */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
      order: { createdAt: 'DESC' },
    });
  }

  // ============================================================================
  // Permission Checking
  // ============================================================================

  /** التحقق من صلاحية لمستخدم */
  async checkPermission(userId: string, scope: string): Promise<boolean> {
    // بناء استعلام مباشر لتحقق فعال
    const result = await this.dataSource.query(
      `SELECT 1 FROM user_roles ur
       INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
       INNER JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1 AND p.scope = $2
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       LIMIT 1`,
      [userId, scope],
    );
    return result.length > 0;
  }

  /** التحقق من عدة صلاحيات */
  async checkPermissions(userId: string, scopes: string[]): Promise<Record<string, boolean>> {
    const placeholders = scopes.map((_, i) => `$${i + 2}`).join(',');
    const result = await this.dataSource.query(
      `SELECT DISTINCT p.scope FROM user_roles ur
       INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
       INNER JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1 AND p.scope IN (${placeholders})
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [userId, ...scopes],
    );
    const granted = new Set(result.map((r: { scope: string }) => r.scope));
    return Object.fromEntries(scopes.map(s => [s, granted.has(s)]));
  }

  /** جلب كل صلاحيات المستخدم */
  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT DISTINCT p.scope FROM user_roles ur
       INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
       INNER JOIN permissions p ON rp.permission_id = p.id
       WHERE ur.user_id = $1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [userId],
    );
    return result.map((r: { scope: string }) => r.scope);
  }

  /** جلب أدوار المستخدم مع اسمائها */
  async getUserRoleNames(userId: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT r.slug FROM user_roles ur
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
      [userId],
    );
    return result.map((r: { slug: string }) => r.slug);
  }

  // ============================================================================
  // Seeding
  // ============================================================================

  /** تهيئة الصلاحيات والأدوار الافتراضية */
  async seedDefaults(): Promise<void> {
    // 1. انشاء الصلاحيات
    for (const perm of DEFAULT_PERMISSIONS) {
      const exists = await this.permissionRepository.findOne({ where: { scope: perm.scope } });
      if (!exists) {
        await this.permissionRepository.save(this.permissionRepository.create(perm));
        this.logger.log(`Permission seeded: ${perm.scope}`);
      }
    }

    // 2. انشاء الأدوار وربطها بالصلاحيات
    for (const roleDef of DEFAULT_ROLES) {
      let role = await this.roleRepository.findOne({ where: { slug: roleDef.slug }, withDeleted: true });

      if (!role) {
        role = this.roleRepository.create({
          name: roleDef.name,
          slug: roleDef.slug,
          description: roleDef.description,
          level: roleDef.level,
          isSystem: roleDef.isSystem,
        });

        // ايجاد وربط الصلاحيات
        if (roleDef.permissions.length > 0) {
          const permissions = await this.permissionRepository.find({
            where: { scope: In(roleDef.permissions) },
          });
          role.permissions = permissions;
        }

        await this.roleRepository.save(role);
        this.logger.log(`Role seeded: ${role.slug} with ${role.permissions?.length ?? 0} permissions`);
      }
    }

    this.logger.log('RBAC seeding completed');
  }
}
