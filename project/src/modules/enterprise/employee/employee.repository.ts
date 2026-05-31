/**
 * Employee Repository - طبقة الوصول لبيانات الموظفين
 */
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Employee } from './employee.entity';
import { Department } from './department.entity';
import { EmployeeStatus } from '../../../common/enums/gym.enum';

@Injectable()
export class EmployeeRepository extends Repository<Employee> {
  constructor(private dataSource: DataSource) {
    super(Employee, dataSource.createEntityManager());
  }

  /** جلب موظف مع تفاصيل المستخدم (باستخدام relation) */
  async findByIdWithDetails(id: string): Promise<Employee | null> {
    return this.findOne({ where: { id } });
  }

  /** جلب موظفين بالقسم */
  async findByDepartment(departmentId: string): Promise<Employee[]> {
    return this.find({
      where: { department_id: departmentId },
      order: { created_at: 'DESC' },
    });
  }

  /** فلترة الموظفين */
  async findWithFilters(filters: {
    department_id?: string;
    role_id?: string;
    status?: EmployeeStatus;
    page?: number;
    limit?: number;
  }): Promise<[Employee[], number]> {
    const qb = this.createQueryBuilder('e')
      .orderBy('e.created_at', 'DESC')
      .skip(((filters.page ?? 1) - 1) * (filters.limit ?? 20))
      .take(filters.limit ?? 20);

    if (filters.department_id) {
      qb.andWhere('e.department_id = :dept', { dept: filters.department_id });
    }
    if (filters.role_id) {
      qb.andWhere('e.role_id = :role', { role: filters.role_id });
    }
    if (filters.status) {
      qb.andWhere('e.status = :status', { status: filters.status });
    }

    return qb.getManyAndCount();
  }

  /** التحقق من كود الموظف */
  async findByCode(code: string): Promise<Employee | null> {
    return this.findOne({ where: { employee_code: code } });
  }
}

@Injectable()
export class DepartmentRepository extends Repository<Department> {
  constructor(private dataSource: DataSource) {
    super(Department, dataSource.createEntityManager());
  }

  /** جلب الأقسام الرئيسية */
  async findRootDepartments(): Promise<Department[]> {
    return this.find({
      where: { parent_id: null as any },
      order: { name: 'ASC' },
    });
  }

  /** التحقق من وجود قسم */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.count({ where: { name } });
    return count > 0;
  }
}
