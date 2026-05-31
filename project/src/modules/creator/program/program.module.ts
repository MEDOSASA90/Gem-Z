/**
 * =============================================================================
 * Program Module - موديول البرامج
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramService } from './program.service';
import { ProgramController } from './program.controller';
import { CreatorProgram } from './creator-program.entity';
import { ProgramEnrollment } from './program-enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreatorProgram, ProgramEnrollment])],
  providers: [ProgramService],
  controllers: [ProgramController],
  exports: [ProgramService],
})
export class ProgramModule {}
