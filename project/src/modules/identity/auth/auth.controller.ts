/**
 * ============================================================================
 * GEM Z - Identity Module
 * AuthController - متحكم المصادقة
 * ============================================================================
 * endpoints: /register, /login, /refresh, /logout, /mfa, /password
 * ============================================================================
 */

import {
  Controller, Post, Get, Delete, Body, HttpCode, HttpStatus,
  UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { MFAService } from './mfa.service';
import { AuthGuard } from './auth.guard';
import { Public, CurrentUser } from './auth.decorator';
import {
  RegisterDto, LoginDto, MFAVerifyDto, MFASetupDto, RefreshTokenDto,
  LogoutDto, ForgotPasswordDto, ResetPasswordDto,
  LoginResponseDto, MFASetupResponseDto,
  SessionListResponseDto,
} from './auth.dto';
import { User } from '../user/user.entity';
import { SessionService } from '../session/session.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MFAService,
    private readonly sessionService: SessionService,
  ) {}

  // ============================================================================
  // Registration
  // ============================================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'تسجيل مستخدم جديد' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  async register(@Body() dto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(dto);
  }

  // ============================================================================
  // Login
  // ============================================================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل الدخول' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  // ============================================================================
  // Token Refresh
  // ============================================================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث Access Token' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.authService.refresh(dto);
  }

  // ============================================================================
  // Logout
  // ============================================================================

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل الخروج' })
  @ApiBearerAuth()
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: LogoutDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, dto);
    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  @Delete('sessions')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل الخروج من جميع الاجهزة' })
  @ApiBearerAuth()
  async logoutAll(@CurrentUser('id') userId: string): Promise<{ message: string }> {
    await this.authService.logoutAll(userId);
    return { message: 'تم تسجيل الخروج من جميع الاجهزة' };
  }

  // ============================================================================
  // MFA
  // ============================================================================

  @Post('mfa/setup')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'اعداد MFA' })
  @ApiBearerAuth()
  async setupMFA(
    @CurrentUser('id') userId: string,
    @Body() dto: MFASetupDto,
  ): Promise<MFASetupResponseDto> {
    return this.mfaService.setup(userId, dto.method);
  }

  @Post('mfa/verify')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'التحقق من رمز MFA' })
  @ApiBearerAuth()
  async verifyMFA(
    @CurrentUser('id') userId: string,
    @Body() dto: MFAVerifyDto,
  ): Promise<{ verified: boolean }> {
    const result = await this.mfaService.verify(userId, dto.code, dto.method);
    return { verified: result.verified };
  }

  @Post('mfa/disable')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تعطيل MFA' })
  @ApiBearerAuth()
  async disableMFA(
    @CurrentUser('id') userId: string,
    @Body() dto: { method: 'sms' | 'email' | 'totp' },
  ): Promise<{ message: string }> {
    await this.mfaService.disableMFA(userId, dto.method);
    return { message: `تم تعطيل ${dto.method} MFA` };
  }

  // ============================================================================
  // Password Recovery
  // ============================================================================

  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'طلب استعادة كلمة المرور' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'اعادة تعيين كلمة المرور' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return { message: 'تم اعادة تعيين كلمة المرور بنجاح' };
  }

  // ============================================================================
  // Sessions
  // ============================================================================

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'الجلسات النشطة' })
  @ApiBearerAuth()
  async getSessions(@CurrentUser('id') userId: string): Promise<{ sessions: SessionListResponseDto[] }> {
    const sessions = await this.sessionService.listActive(userId);
    return { sessions: sessions.map(s => ({
      id: s.id,
      deviceFingerprint: s.deviceFingerprint,
      userAgent: s.userAgent ?? undefined,
      geoCountry: s.geoCountry ?? undefined,
      lastActiveAt: s.lastActiveAt,
      mfaVerified: s.mfaVerified,
      createdAt: s.createdAt,
    })) };
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'الغاء جلسة محددة' })
  @ApiBearerAuth()
  async revokeSession(@Req() req: Request & { params: { id: string } }): Promise<{ message: string }> {
    await this.sessionService.revoke(req.params.id);
    return { message: 'تم الغاء الجلسة' };
  }
}
