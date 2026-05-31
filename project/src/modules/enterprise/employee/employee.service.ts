/**
 * EmployeeService - خدمة إدارة الموظفين
 * تدير: الموظفين + الأقسام + التعيين والإنهاء
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  EmployeeRepository,
  DepartmentRepository,
} from './employee.repository';
import { Employee } from './employee.entity';
import { Department } from './department.entity';
import { EmployeeStatus } from '../../../common/enums/gym.enum';

/** بيانات إنشاء موظف */
export interface CreateEmployeeDto {
  user_id: string;
  employee_code: string;
  department_id?: string;
  role_id?: string;
  permission_scopes?: string[];
  region_scopes?: string[];
  mfa_required?: boolean;
  hired_at?: string;
}

/** بيانات تحديث موظف */
export interface UpdateEmployeeDto {
  department_id?: string;
  role_id?: string;
  permission_scopes?: string[];
  region_scopes?: string[];
  mfa_required?: boolean;
}

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly empRepo: EmployeeRepository,
    private readonly deptRepo: DepartmentRepository,
  ) {}

  /** إنشاء موظف جديد */
  async create(dto: CreateEmployeeDto): Promise<Employee> {
    // التحقق من عدم تكرار كود الموظف
    const existing = await this.empRepo.findByCode(dto.employee_code);
    if (existing) {
      throw new ConflictException(`Employee code ${dto.employee_code} already exists`);
    }

    // التحقق من القسم إذا وُجد
    if (dto.department_id) {
      const dept = await this.deptRepo.findOne({ where: { id: dto.department_id } });
      if (!dept) throw new NotFoundException('Department not found');
    }

    // كل موظف لازم يكون له role
    if (!dto.role_id) {
      throw new Error('Employee must be assigned a role');
    }

    const employee = this.empRepo.create({
      user_id: dto.user_id,
      employee_code: dto.employee_code,
      department_id: dto.department_id || null,
      role_id: dto.role_id,
      permission_scopes: dto.permission_scopes || [],
      region_scopes: dto.region_scopes || [],
      mfa_required: dto.mfa_required ?? true,
      status: EmployeeStatus.ACTIVE,
      hired_at: dto.hired_at ? new Date(dto.hired_at) : new Date(),
    });

    const saved = await this.empRepo.save(employee);
    this.logger.log(`Employee created: ${saved.employee_code} (user: ${saved.user_id})`);
    return saved;
  }

  /** تحديث بيانات موظف */
  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const emp = await this.empRepo.findOne({ where: { id } });
    if (!emp) throw new NotFoundException('Employee not found');

    Object.assign(emp, dto);
    return this.empRepo.save(emp);
  }

  /** قائمة الموظفين مع فلترة */
  async list(filters: {
    department_id?: string;
    role_id?: string;
    status?: EmployeeStatus;
    page?: number;
    limit?: number;
  }) {
    const [items, total] = await this.empRepo.findWithFilters(filters);
    return { items, total, page: filters.page ?? 1, limit: filters.limit ?? 20 };
  }

  /** جلب موظف بالتفاصيل */
  async getById(id: string): Promise<Employee> {
    const emp = await this.empRepo.findByIdWithDetails(id);
    if (!emp) throw new NotFoundException('Employee not found');
    return emp;
  }

  /** جلب موظفين قسم */
  async getByDepartment(departmentId: string): Promise<Employee[]> {
    return this.empRepo.findByDepartment(departmentId);
  }

  /** تحديث حالة موظف */
  async updateStatus(id: string, status: EmployeeStatus): Promise<Employee> {
    const emp = await this.getById(id);
    emp.status = status;
    return this.empRepo.save(emp);
  }

  /** تعيين مناطق لموظف */
  async assignRegions(id: string, regions: string[]): Promise<Employee> {
    const emp = await this.getById(id);
    emp.region_scopes = regions;
    return this.empRepo.save(emp);
  }

  // ─── Departments ────────────────────────────────────────────────

  /** إنشاء قسم */
  async createDepartment(name: string, description?: string, parentId?: string): Promise<Department> {
    const exists = await this.deptRepo.existsByName(name);
    if (exists) {
      throw new ConflictException(`Department '${name}' already exists`);
    }

    const dept = this.deptRepo.create({
      name,
      description: description || null,
      parent_id: parentId || null,
    });
    return this.deptRepo.save(dept);
  }

  /** زرع الأقسام الافتراضية */
  async seedDepartments(): Promise<void> {
    const defaults = [
      { name: 'Finance', description: 'إدارة المالية والمحاسبة' },
      { name: 'KYC', description: 'التحقق من هوية العملاء' },
      { name: 'Operations', description: 'إدارة العمليات اليومية' },
      { name: 'Security', description: 'الأمن والحماية ومكافحة الاحتيال' },
      { name: 'Content', description: 'إدارة المحتوى والإشراف' },
      { name: 'Technology', description: 'تقنية المعلومات والتطوير' },
      { name: 'HR', description: 'الموارد البشرية' },
      { name: 'Legal', description: 'الشؤون القانونية' },
    ];

    for (const dept of defaults) {
      const exists = await this.deptRepo.existsByName(dept.name);
      if (!exists) {
        await this.deptRepo.save(this.deptRepo.create(dept));
        this.logger.log(`Seeded department: ${dept.name}`);
      }
    }
  }

  /** قائمة الأقسام */
  async listDepartments(): Promise<Department[]> {
    return this.deptRepo.findRootDepartments();
  }
}
