import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { CorporateClient } from '../company/corporate-client.entity';
import { EmployeeWellness } from '../wellness/employee-wellness.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CorporateClient, EmployeeWellness]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService, TypeOrmModule],
})
export class CorporateDashboardModule {}
