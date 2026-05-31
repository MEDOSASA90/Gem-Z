import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderFiltersDto,
} from './order.dto';

/**
 * متحكم الطلبات - Order Controller
 */
@ApiTags('الطلبات - Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء طلب جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({ status: 400, description: 'مخزون غير كافٍ' })
  async create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل الطلب' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'الطلب غير موجود' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.getById(id);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث حالة الطلب' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'انتقال غير صالح' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto);
  }

  @Get('buyer/:userId')
  @ApiOperation({ summary: 'طلبات المشتري' })
  async listByBuyer(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.listByBuyer(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('seller/:userId')
  @ApiOperation({ summary: 'طلبات البائع' })
  async listBySeller(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orderService.listBySeller(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إلغاء طلب' })
  @ApiResponse({ status: 200 })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason?: string,
  ) {
    await this.orderService.cancel(id, reason);
    return { order_id: id, status: 'CANCELLED', reason };
  }
}
