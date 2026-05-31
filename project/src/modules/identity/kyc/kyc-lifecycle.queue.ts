import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KYCSubmission } from './kyc.entity';
import { PrivateS3Service } from './private-s3.service';

@Injectable()
export class KycLifecycleQueue {
  private readonly logger = new Logger(KycLifecycleQueue.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    private readonly s3Service: PrivateS3Service,
    @InjectRepository(KYCSubmission)
    private readonly kycRepo: Repository<KYCSubmission>,
  ) {}

  /**
   * Schedule a file deletion job to run after 48 hours
   */
  async scheduleFileDeletion(kycId: string, s3Uri: string): Promise<void> {
    const runAt = Date.now() + 48 * 60 * 60 * 1000; // 48 hours from now
    const jobPayload = JSON.stringify({ kycId, s3Uri });
    
    // Add to Redis Sorted Set
    await this.redis.zadd('kyc:file-deletion:queue', runAt, jobPayload);
    this.logger.log(`Scheduled background deletion job for KYC [${kycId}] raw document in 48 hours.`);
  }

  /**
   * Periodically check and process scheduled deletion jobs using Redis ZSET (Polled queue worker)
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processExpiredDeletionJobs(): Promise<void> {
    const now = Date.now();
    
    // Get all jobs that are due
    const jobs = await this.redis.zrangebyscore('kyc:file-deletion:queue', 0, now);
    if (jobs.length === 0) return;

    this.logger.log(`Found ${jobs.length} expired KYC document lifecycle deletion jobs due for processing.`);
    
    for (const job of jobs) {
      try {
        const { kycId, s3Uri } = JSON.parse(job);
        this.logger.log(`Executing background private S3 file deletion for KYC [${kycId}]...`);
        
        // 1. Delete from S3
        await this.s3Service.deletePrivateFile(s3Uri);
        
        // 2. Clear document S3 URIs from PostgreSQL, leaving only metadata hash
        const submission = await this.kycRepo.findOne({ where: { id: kycId } });
        if (submission) {
          if (submission.documents) {
            submission.documents = submission.documents.map((doc: any) => ({
              ...doc,
              s3Uri: undefined, // Permanently remove private S3 path
              deletedFromS3: true,
              deletedAt: new Date().toISOString(),
            }));
            await this.kycRepo.save(submission);
          }
        }
        
        // 3. Remove job from queue
        await this.redis.zrem('kyc:file-deletion:queue', job);
        this.logger.log(`Successfully completed S3 raw file lifecycle purge for KYC [${kycId}]`);
      } catch (err: any) {
        this.logger.error(`Failed to process document deletion job: ${err.message}`);
      }
    }
  }
}
