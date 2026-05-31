/**
 * Employee Module - وحدة إدارة الموظفين
 * تشمل: الموظفين + الأقسام
 * كل موظف لازم يكون له role و department
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import {
  EmployeeRepository,
  DepartmentRepository,
} from './employee.repository';
import { Employee } from './employee.entity';
import { Department } from './department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Department])],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeRepository,
    DepartmentRepository,
  ],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
