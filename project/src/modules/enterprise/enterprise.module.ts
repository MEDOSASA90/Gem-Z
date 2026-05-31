/**
 * Enterprise Module - الوحدة الرئيسية للمؤسسة
 * تجمع: Employee + Operations Center
 */
import { Module } from '@nestjs/common';
import { EmployeeModule } from './employee/employee.module';
import { OpsModule } from './ops/ops.module';

@Module({
  imports: [
    EmployeeModule,
    OpsModule,
  ],
  exports: [
    EmployeeModule,
    OpsModule,
  ],
})
export class EnterpriseModule {}
