import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  CreateWalletDto,
  WalletResponseDto,
  DepositDto,
  WithdrawDto,
  TransferDto,
  FreezeWalletDto,
  TransactionFiltersDto,
} from './wallet.dto';
import { Currency } from '../../../common/enums';

/**
 * متحكم المحفظة - نقاط النهاية REST API
 * Wallet Controller - REST API endpoints
 */
@ApiTags('المحافظ - Wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * إنشاء محفظة جديدة
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء محفظة جديدة' })
  @ApiResponse({ status: 201, description: 'تم إنشاء المحفظة بنجاح', type: WalletResponseDto })
  @ApiResponse({ status: 409, description: 'المستخدم لديه محفظة بنفس العملة' })
  async create(@Body() dto: CreateWalletDto) {
    const wallet = await this.walletService.create(dto.user_id, dto.currency, dto.type);
    return {
      id: wallet.id,
      user_id: wallet.user_id,
      currency: wallet.currency,
      balance: wallet.balance,
      held_balance: wallet.held_balance,
      available_balance: wallet.availableBalance,
      status: wallet.status,
      type: wallet.type,
      snapshot_version: wallet.snapshot_version,
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
    };
  }

  /**
   * قائمة محافظ المستخدم
   */
  @Get('user/:userId')
  @ApiOperation({ summary: 'محافظ مستخدم' })
  @ApiResponse({ status: 200, description: 'قائمة المحافظ', type: [WalletResponseDto] })
  async getUserWallets(@Param('userId', ParseUUIDPipe) userId: string) {
    const wallets = await this.walletService.getUserWallets(userId);
    return wallets.map((w) => ({
      id: w.id,
      user_id: w.user_id,
      currency: w.currency,
      balance: w.balance,
      held_balance: w.held_balance,
      available_balance: w.availableBalance,
      status: w.status,
      type: w.type,
      snapshot_version: w.snapshot_version,
      created_at: w.created_at,
      updated_at: w.updated_at,
    }));
  }

  /**
   * الحصول على محفظة بالمعرف
   */
  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل المحفظة' })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  @ApiResponse({ status: 404, description: 'المحفظة غير موجودة' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const balance = await this.walletService.getBalance(id);
    return balance;
  }

  /**
   * الحصول على رصيد المحفظة
   */
  @Get(':id/balance')
  @ApiOperation({ summary: 'رصيد المحفظة' })
  @ApiResponse({ status: 200 })
  async getBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletService.getBalance(id);
  }

  /**
   * إيداع في المحفظة
   */
  @Post(':id/deposit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إيداع مبلغ في المحفظة' })
  @ApiResponse({ status: 200, description: 'تم الإيداع بنجاح' })
  async deposit(
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body() dto: DepositDto,
  ) {
    const tx = await this.walletService.deposit(
      walletId,
      dto.amount,
      dto.reference_id ?? null,
      dto.reference_type ?? null,
      dto.description,
    );
    return {
      transaction_id: tx.id,
      wallet_id: walletId,
      amount: dto.amount,
      status: tx.status,
      created_at: tx.created_at,
    };
  }

  /**
   * سحب من المحفظة
   */
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'سحب مبلغ من المحفظة' })
  @ApiResponse({ status: 200, description: 'تم السحب بنجاح' })
  @ApiResponse({ status: 400, description: 'رصيد غير كافٍ' })
  async withdraw(
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body() dto: WithdrawDto,
  ) {
    const tx = await this.walletService.withdraw(
      walletId,
      dto.amount,
      dto.reference_id ?? null,
      dto.reference_type ?? null,
      dto.description,
    );
    return {
      transaction_id: tx.id,
      wallet_id: walletId,
      amount: dto.amount,
      status: tx.status,
      created_at: tx.created_at,
    };
  }

  /**
   * تحويل بين محفظتين
   */
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحويل بين محفظتين' })
  @ApiResponse({ status: 200, description: 'تم التحويل بنجاح' })
  async transfer(@Body() dto: TransferDto) {
    const result = await this.walletService.transfer(
      dto.from_wallet_id,
      dto.to_wallet_id,
      dto.amount,
      dto.description,
    );
    return {
      debit_transaction_id: result.debitTx.id,
      credit_transaction_id: result.creditTx.id,
      from_wallet_id: dto.from_wallet_id,
      to_wallet_id: dto.to_wallet_id,
      amount: dto.amount,
      status: 'COMPLETED',
    };
  }

  /**
   * تجميد المحفظة
   */
  @Post(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تجميد المحفظة (admin)' })
  async freeze(
    @Param('id', ParseUUIDPipe) walletId: string,
    @Body() dto: FreezeWalletDto,
  ) {
    await this.walletService.freeze(walletId, dto.reason);
    return { wallet_id: walletId, status: 'FROZEN', reason: dto.reason };
  }

  /**
   * فك تجميد المحفظة
   */
  @Post(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'فك تجميد المحفظة (admin)' })
  async unfreeze(@Param('id', ParseUUIDPipe) walletId: string) {
    await this.walletService.unfreeze(walletId);
    return { wallet_id: walletId, status: 'ACTIVE' };
  }

  /**
   * معاملات المحفظة
   */
  @Get(':id/transactions')
  @ApiOperation({ summary: 'معاملات المحفظة' })
  @ApiResponse({ status: 200 })
  async getTransactions(
    @Param('id', ParseUUIDPipe) walletId: string,
    @Query() filters: TransactionFiltersDto,
  ) {
    return this.walletService.getTransactions(walletId, filters);
  }
}
