import { Repository, DataSource, Brackets, IsNull } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Product } from './product.entity';
import { ProductCategory } from './category.entity';
import { ProductStatus } from '../../../common/enums';

/**
 * مستودع المنتجات - Product Repository
 */
@Injectable()
export class ProductRepository extends Repository<Product> {
  constructor(private dataSource: DataSource) {
    super(Product, dataSource.createEntityManager());
  }

  /**
   * إيجاد منتج بالمعرف مع الفئة
   */
  async findById(id: string): Promise<Product | null> {
    return this.findOne({
      where: { id },
      relations: ['category'],
    });
  }

  /**
   * إيجاد منتج بالـ slug
   */
  async findBySlug(slug: string): Promise<Product | null> {
    return this.findOne({
      where: { slug },
      relations: ['category'],
    });
  }

  /**
   * إيجاد منتجات بائع
   */
  async findBySellerId(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Product[], number]> {
    return this.findAndCount({
      where: { seller_id: sellerId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * البحث في المنتجات
   */
  async search(filters: {
    search?: string;
    seller_id?: string;
    category_id?: string;
    type?: string;
    min_price?: number;
    max_price?: number;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<[Product[], number]> {
    const {
      search,
      seller_id,
      category_id,
      type,
      min_price,
      max_price,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = filters;

    const qb = this.createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.deleted_at IS NULL')
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE });

    if (search) {
      qb.andWhere(
        new Brackets((qb2) => {
          qb2
            .where('p.name ILIKE :search', { search: `%${search}%` })
            .orWhere('p.description ILIKE :search', { search: `%${search}%` })
            .orWhere('p.tags::text ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (seller_id) qb.andWhere('p.seller_id = :sellerId', { sellerId: seller_id });
    if (category_id) qb.andWhere('p.category_id = :categoryId', { categoryId: category_id });
    if (type) qb.andWhere('p.type = :type', { type });
    if (min_price !== undefined) qb.andWhere('p.price >= :minPrice', { minPrice: min_price });
    if (max_price !== undefined) qb.andWhere('p.price <= :maxPrice', { maxPrice: max_price });

    qb.orderBy(`p.${sort_by}`, sort_order)
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  /**
   * تحديث كمية المنتج
   */
  async updateQuantity(id: string, quantity: number): Promise<void> {
    await this.update(id, { quantity });
  }

  /**
   تحديث تقييم المنتج
   */
  async updateRating(id: string, rating: number): Promise<void> {
    const product = await this.findById(id);
    if (!product) return;

    const newCount = product.rating_count + 1;
    const newAverage =
      (product.rating_average * product.rating_count + rating) / newCount;

    await this.update(id, {
      rating_average: parseFloat(newAverage.toFixed(2)),
      rating_count: newCount,
    });
  }

  /**
   * زيادة عدد المبيعات
   */
  async incrementSales(id: string, count: number = 1): Promise<void> {
    await this.increment({ id }, 'sales_count', count);
  }
}

/**
 * مستودع الفئات - Category Repository
 */
@Injectable()
export class CategoryRepository extends Repository<ProductCategory> {
  constructor(private dataSource: DataSource) {
    super(ProductCategory, dataSource.createEntityManager());
  }

  /**
   * إيجاد فئة بالمعرف مع الفئات الفرعية
   */
  async findByIdWithChildren(id: string): Promise<ProductCategory | null> {
    return this.findOne({
      where: { id },
      relations: ['children'],
    });
  }

  /**
   * إيجاد جميع الفئات النشطة
   */
  async findActive(): Promise<ProductCategory[]> {
    return this.find({
      where: { is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  /**
   * إيجاد فئات المستوى الأعلى (بدون أب)
   */
  async findRootCategories(): Promise<ProductCategory[]> {
    return this.find({
      where: { parent_id: IsNull(), is_active: true },
      order: { sort_order: 'ASC', name: 'ASC' },
      relations: ['children'],
    });
  }
}
