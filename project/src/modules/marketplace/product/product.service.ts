import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductRepository, CategoryRepository } from './product.repository';
import { Product } from './product.entity';
import { ProductCategory } from './category.entity';
import { ProductStatus, ProductType, Currency } from '../../../common/enums';
import { CreateProductDto, UpdateProductDto, ProductFiltersDto } from './product.dto';

/**
 * خدمة المنتجات - إدارة كتالوج المنتجات
 * Product Service - Product catalog management
 * 
 * - CRUD للمنتجات
 * - البحث والتصفية
 * - إدارة الكميات والتقييمات
 * - التكامل مع Elasticsearch للبحث
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  // =========================================================================
  // Product CRUD
  // =========================================================================

  /**
   * إنشاء منتج جديد
   */
  async create(dto: CreateProductDto): Promise<Product> {
    // التحقق من عدم تكرار slug
    const existing = await this.productRepo.findBySlug(dto.slug);
    if (existing) {
      throw new BadRequestException('slug مستخدم مسبقاً');
    }

    const product = this.productRepo.create({
      seller_id: dto.seller_id,
      store_id: dto.store_id ?? null,
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      type: dto.type ?? ProductType.PHYSICAL,
      category_id: dto.category_id ?? null,
      price: dto.price,
      currency: dto.currency ?? Currency.EGP,
      compare_at_price: dto.compare_at_price ?? null,
      cost_per_item: dto.cost_per_item ?? null,
      sku: dto.sku ?? null,
      barcode: dto.barcode ?? null,
      track_quantity: dto.track_quantity ?? true,
      quantity: dto.quantity ?? 0,
      weight: dto.weight ?? null,
      images: dto.images ?? [],
      attributes: dto.attributes ?? {},
      status: ProductStatus.DRAFT,
      seo_title: dto.seo_title ?? null,
      seo_description: dto.seo_description ?? null,
      tags: dto.tags ?? [],
      rating_average: 0,
      rating_count: 0,
      sales_count: 0,
    });

    const saved = await this.productRepo.save(product);
    this.logger.log(`Product created: ${saved.id} - ${saved.name}`);
    return saved;
  }

  /**
   * تحديث منتج
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('المنتج غير موجود');

    await this.productRepo.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.category_id !== undefined && { category_id: dto.category_id }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.compare_at_price !== undefined && { compare_at_price: dto.compare_at_price }),
      ...(dto.cost_per_item !== undefined && { cost_per_item: dto.cost_per_item }),
      ...(dto.quantity !== undefined && { quantity: dto.quantity }),
      ...(dto.images !== undefined && { images: dto.images }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.seo_title !== undefined && { seo_title: dto.seo_title }),
      ...(dto.seo_description !== undefined && { seo_description: dto.seo_description }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
    });

    const updated = await this.productRepo.findById(id);
    if (!updated) throw new NotFoundException('المنتج غير موجود');

    this.logger.log(`Product updated: ${id}`);
    return updated;
  }

  /**
   * الحصول على منتج بالمعرف
   */
  async getById(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('المنتج غير موجود');
    return product;
  }

  /**
   * قائمة المنتجات مع تصفية
   */
  async list(filters: ProductFiltersDto): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const [products, total] = await this.productRepo.search({
      ...filters,
      page,
      limit,
    });

    return { products, total, page, limit };
  }

  /**
   * حذف منتج (soft delete)
   */
  async delete(id: string): Promise<void> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('المنتج غير موجود');

    await this.productRepo.softDelete(id);
    this.logger.log(`Product soft-deleted: ${id}`);
  }

  // =========================================================================
  // Inventory
  // =========================================================================

  /**
   * تحديث كمية المنتج
   */
  async updateQuantity(id: string, quantity: number): Promise<void> {
    if (quantity < 0) {
      throw new BadRequestException('الكمية يجب أن تكون 0 أو أكبر');
    }

    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('المنتج غير موجود');

    await this.productRepo.updateQuantity(id, quantity);
    this.logger.log(`Product ${id} quantity updated: ${quantity}`);
  }

  /**
   * حجز كمية (تقليص المخزون)
   */
  async holdInventory(id: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new BadRequestException('الكمية يجب أن تكون أكبر من صفر');
    }

    const product = await this.productRepo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');

    if (!product.track_quantity) return; // لا يتتبع الكمية

    if (product.quantity < quantity) {
      throw new BadRequestException(
        `المخزون غير كافٍ: المتاح ${product.quantity}، المطلوب ${quantity}`,
      );
    }

    await this.productRepo.decrement({ id }, 'quantity', quantity);
    this.logger.log(`Inventory held: ${id} -${quantity}`);
  }

  /**
   * إرجاع كمية للمخزون
   */
  async releaseInventory(id: string, quantity: number): Promise<void> {
    await this.productRepo.increment({ id }, 'quantity', quantity);
    this.logger.log(`Inventory released: ${id} +${quantity}`);
  }

  // =========================================================================
  // Rating
  // =========================================================================

  /**
   * تحديث تقييم المنتج
   */
  async updateRating(id: string, rating: number): Promise<void> {
    if (rating < 0 || rating > 5) {
      throw new BadRequestException('التقييم يجب أن يكون بين 0 و 5');
    }

    await this.productRepo.updateRating(id, rating);
    this.logger.log(`Product ${id} rating updated: ${rating}`);
  }

  /**
   * زيادة عدد المبيعات
   */
  async incrementSales(id: string): Promise<void> {
    await this.productRepo.incrementSales(id, 1);
  }

  // =========================================================================
  // Category
  // =========================================================================

  /**
   * إنشاء فئة جديدة
   */
  async createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
    const category = this.categoryRepo.create(data);
    return this.categoryRepo.save(category);
  }

  /**
   * جميع الفئات النشطة
   */
  async getCategories(): Promise<ProductCategory[]> {
    return this.categoryRepo.findRootCategories();
  }

  /**
   * فئة بالمعرف
   */
  async getCategoryById(id: string): Promise<ProductCategory | null> {
    return this.categoryRepo.findByIdWithChildren(id);
  }
}
