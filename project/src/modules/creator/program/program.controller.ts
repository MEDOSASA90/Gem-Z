/**
 * =============================================================================
 * Program Controller - متحكم البرامج
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProgramService } from './program.service';
import {
  CreateProgramDto,
  UpdateProgramDto,
  EnrollProgramDto,
  UpdateProgressDto,
  SearchProgramsDto,
  CreatorProgramResponseDto,
  ProgramEnrollmentResponseDto,
} from './program.dto';
import { CreatorProgram } from './creator-program.entity';
import { ProgramEnrollment, EnrollmentStatus } from './program-enrollment.entity';

@ApiTags('Creator Programs')
@Controller('creator/programs')
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  // ── إدارة البرامج ──────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a new program',
    description: 'إنشاء برنامج جديد (لصانع محتوى)',
  })
  @ApiResponse({ status: 201, description: 'Program created', type: CreatorProgramResponseDto })
  async createProgram(
    @Body('creator_id', ParseUUIDPipe) creatorId: string,
    @Body() dto: CreateProgramDto,
  ): Promise<CreatorProgram> {
    return this.programService.createProgram(creatorId, dto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search published programs',
    description: 'البحث في البرامج المنشورة مع دعم الفلترة',
  })
  @ApiResponse({ status: 200, description: 'List of programs' })
  async searchPrograms(@Query() query: SearchProgramsDto): Promise<{
    items: CreatorProgram[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.programService.searchPrograms(query);
  }

  @Get('creator/:creatorId')
  @ApiOperation({
    summary: "Get creator's programs",
    description: 'جلب برامج صانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'List of programs' })
  async getCreatorPrograms(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<CreatorProgram[]> {
    return this.programService.getCreatorPrograms(creatorId);
  }

  @Get(':programId')
  @ApiOperation({
    summary: 'Get program details',
    description: 'جلب تفاصيل برنامج',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Program details' })
  async getProgram(
    @Param('programId', ParseUUIDPipe) programId: string,
  ): Promise<CreatorProgram> {
    return this.programService.getProgram(programId);
  }

  @Patch(':programId')
  @ApiOperation({
    summary: 'Update program',
    description: 'تحديث برنامج',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Program updated' })
  async updateProgram(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<CreatorProgram> {
    return this.programService.updateProgram(programId, dto);
  }

  @Delete(':programId')
  @ApiOperation({
    summary: 'Soft delete program',
    description: 'حذف ناعم لبرنامج',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Program deleted' })
  async softDeleteProgram(
    @Param('programId', ParseUUIDPipe) programId: string,
  ): Promise<{ deleted: boolean }> {
    await this.programService.softDeleteProgram(programId);
    return { deleted: true };
  }

  // ── التسجيل ────────────────────────────────────────────────────

  @Post(':programId/enroll')
  @ApiOperation({
    summary: 'Enroll in a program',
    description: 'التسجيل في برنامج (الشراء والتسجيل)',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 201, description: 'Enrolled successfully' })
  @ApiResponse({ status: 409, description: 'Already enrolled' })
  async enroll(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body() dto: EnrollProgramDto,
  ): Promise<ProgramEnrollment> {
    return this.programService.enroll(dto.user_id, programId, dto);
  }

  @Post(':programId/progress')
  @ApiOperation({
    summary: 'Update lesson progress',
    description: 'تحديث تقدم الدرس في البرنامج',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body('enrollment_id', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ProgramEnrollment> {
    return this.programService.updateProgress(userId, enrollmentId, dto);
  }

  @Post(':programId/drop')
  @ApiOperation({
    summary: 'Drop enrollment',
    description: 'الانسحاب من برنامج',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Enrollment dropped' })
  async dropEnrollment(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body('enrollment_id', ParseUUIDPipe) enrollmentId: string,
  ): Promise<ProgramEnrollment> {
    return this.programService.dropEnrollment(userId, enrollmentId);
  }

  // ── استعراض تسجيلات المستخدم ──────────────────────────────────

  @Get('enrolled/:userId')
  @ApiOperation({
    summary: "Get user's enrolled programs",
    description: 'جلب البرامج المسجل فيها المستخدم',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  async getEnrolledPrograms(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('status') status?: EnrollmentStatus,
  ): Promise<ProgramEnrollment[]> {
    return this.programService.getEnrolledPrograms(userId, status);
  }

  @Get('enrollment/:enrollmentId')
  @ApiOperation({
    summary: 'Get enrollment details',
    description: 'جلب تفاصيل تسجيل',
  })
  @ApiParam({ name: 'enrollmentId', description: 'Enrollment ID' })
  @ApiResponse({ status: 200, description: 'Enrollment details' })
  async getEnrollment(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ): Promise<ProgramEnrollment> {
    return this.programService.getEnrollment(enrollmentId);
  }

  // ── تقييم ──────────────────────────────────────────────────────

  @Post(':programId/rate')
  @ApiOperation({
    summary: 'Rate a program',
    description: 'تقييم برنامج (1-5 نجوم)',
  })
  @ApiParam({ name: 'programId', description: 'Program ID' })
  @ApiResponse({ status: 200, description: 'Rating recorded' })
  async rateProgram(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Body('rating', ParseIntPipe) rating: number,
  ): Promise<CreatorProgram> {
    return this.programService.rateProgram(programId, rating);
  }
}
