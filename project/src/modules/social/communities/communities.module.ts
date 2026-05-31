/**
 * =============================================================================
 * CommunitiesModule - موديول المجتمعات
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';
import { Community } from './community.entity';
import { CommunityMember } from './community-member.entity';
import { CommunityPost } from './community-post.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Community, CommunityMember, CommunityPost]),
  ],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
