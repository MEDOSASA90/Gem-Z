/**
 * ============================================================================
 * GEM Z - Identity Module
 * UserService - خدمة ادارة المستخدمين
 * ============================================================================
 */

import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, KYCStatus } from './user.entity';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, UpdateUserSettingsDto, UserFilterDto } from './user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email }, withDeleted: true });
    if (existing) throw new ConflictException('البريد الالكتروني مستخدم بالفعل');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email, phone: dto.phone ?? null, passwordHash,
      firstName: dto.firstName, lastName: dto.lastName,
      country: dto.country, timezone: dto.timezone ?? 'UTC', locale: dto.locale ?? 'en',
      status: UserStatus.ACTIVE, emailVerified: false, phoneVerified: false,
      kycStatus: KYCStatus.PENDING, kycLevel: 0, fraudScore: 0,
      trustedDevices: [], settings: {},
    });
    const saved = await this.userRepository.save(user);
    this.logger.log(`User created: ${saved.id}`);
    return saved;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) throw new ConflictException('البريد الالكتروني مستخدم بالفعل');
    }
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto): Promise<User> {
    const user = await this.findById(id);
    user.status = dto.status;
    this.logger.log(`User status: ${id} -> ${dto.status}`);
    return this.userRepository.save(user);
  }

  async updateSettings(id: string, dto: UpdateUserSettingsDto): Promise<User> {
    const user = await this.findById(id);
    user.settings = { ...user.settings, ...dto.settings };
    return this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async verifyEmail(id: string): Promise<User> {
    const user = await this.findById(id);
    user.emailVerified = true;
    return this.userRepository.save(user);
  }

  async verifyPhone(id: string): Promise<User> {
    const user = await this.findById(id);
    user.phoneVerified = true;
    return this.userRepository.save(user);
  }

  async updateKycStatus(id: string, status: KYCStatus, level: number): Promise<User> {
    const user = await this.findById(id);
    user.kycStatus = status;
    user.kycLevel = level;
    return this.userRepository.save(user);
  }

  async updateFraudScore(id: string, score: number): Promise<void> {
    await this.userRepository.update(id, { fraudScore: score });
  }

  async addTrustedDevice(id: string, device: { fingerprint: string; name: string }): Promise<void> {
    const user = await this.findById(id);
    const devices = user.trustedDevices || [];
    if (!devices.find(d => d.fingerprint === device.fingerprint)) {
      devices.push({ ...device, trustedAt: new Date().toISOString(), lastUsed: new Date().toISOString() });
      await this.userRepository.update(id, { trustedDevices: devices });
    }
  }

  async isTrustedDevice(id: string, fingerprint: string): Promise<boolean> {
    const user = await this.findById(id);
    return (user.trustedDevices || []).some(d => d.fingerprint === fingerprint);
  }

  async findAll(filters: UserFilterDto): Promise<{ items: User[]; total: number }> {
    const qb = this.userRepository.createQueryBuilder('user');
    if (filters.search) {
      qb.andWhere('(user.email ILIKE :s OR user.first_name ILIKE :s OR user.last_name ILIKE :s)', { s: `%${filters.search}%` });
    }
    if (filters.status) qb.andWhere('user.status = :st', { st: filters.status });
    if (filters.country) qb.andWhere('user.country = :c', { c: filters.country });
    if (filters.kycStatus) qb.andWhere('user.kyc_status = :k', { k: filters.kycStatus });
    qb.andWhere('user.deleted_at IS NULL');
    const [items, total] = await qb.skip((filters.page! - 1) * filters.limit!).take(filters.limit).orderBy('user.created_at', 'DESC').getManyAndCount();
    return { items, total };
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.userRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('المستخدم غير موجود');
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
