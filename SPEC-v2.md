# GEM Z - SPEC v2 - MISSING MODULES IMPLEMENTATION
## الأنظمة المفقودة - المرحلة 2

---

## الموديولات المفقودة (8 موديولات + تفعيل Core)

### 1. SOCIAL MODULE (`src/modules/social/`)
- **feed/**: Personalized feed, Following feed, Trending, Regional, AI ranked
  - Entities: posts, post_media, post_likes, post_comments, post_shares, post_views, post_reports
  - Events: PostCreated, PostLiked, PostShared, PostReported
- **reels/**: Short video upload, transcoding, adaptive streaming, watch time, completion rate
  - Events: ReelUploaded, ReelViewed, ReelCompleted
- **stories/**: 24-hour expiration, analytics, viewers, reactions
- **messaging/**: 1:1 messaging, group messaging, media messages, voice messages, message status (sent/delivered/seen)
- **communities/**: Public/private communities, challenge groups, gym communities, creator communities

### 2. CREATOR MODULE (`src/modules/creator/`)
- **profile/**: Creator profiles (Trainer, Nutritionist, Influencer, Fitness Creator)
- **dashboard/**: Revenue, subscribers, engagement, retention, growth analytics
- **subscription/**: Monthly plans, annual plans, free trials, renewal automation
- **program/**: Workout programs, nutrition programs, transformation programs
- **live/**: Paid live sessions, ticketing, session replay
- **payout/**: Revenue splitting, platform commission, tax deduction, settlement scheduling

### 3. CORPORATE MODULE (`src/modules/corporate/`)
- **company/**: Companies, departments, employees, HR managers
- **dashboard/**: Employee wellness, participation, challenges, attendance, engagement
- **challenge/**: Step challenges, team challenges, fitness competitions
- **wellness/**: Activity scoring, participation scoring, attendance scoring, consistency scoring

### 4. ADS MODULE (`src/modules/ads/`)
- **campaign/**: Campaign creation, budget allocation, daily caps, geographic targeting, audience targeting
- **ad/**: Sponsored gyms, trainers, stores, products, challenges, homepage banners
- **analytics/**: Impressions, clicks, CTR, conversions, revenue tracking
- **slot/**: Dynamic ad slots (hidden if no active campaigns)

### 5. SETTLEMENT MODULE (`src/modules/settlement/`)
- **payout/**: Payouts for gym owners, trainers, stores, creators, corporate partners
- **settlement/**: Gross revenue, VAT, platform commission, FX fees, gateway fees, net payout
- **withdrawal/**: Manual withdrawals, scheduled withdrawals, auto withdrawals
- **treasury/**: Daily reconciliation of wallet balances, escrow balances, settlement balances

### 6. COMPLIANCE MODULE (`src/modules/compliance/`)
- **gdpr/**: Data retention policies, right to be forgotten, account deletion
- **aml/**: Anti-money laundering checks, transaction monitoring
- **vat/**: VAT calculation per country (Egypt, Saudi Arabia, UAE)
- **regional/**: Country-specific rules engine (configurable, no hardcoded logic)

### 7. HEALTH MODULE (`src/modules/health/`)
- **sync/**: Apple HealthKit, Google Health Connect, Fitbit, Garmin integration
- **data/**: Steps, sleep, heart rate, calories, workouts collection
- **validation/**: Move-to-Earn validation (wearable data prioritized over GPS)

### 8. AI MODULE (`src/modules/ai/`)
- **coach/**: Workout planning, nutrition planning, recovery recommendations
- **recommendation/**: Gym recommendations, trainer recommendations, product recommendations, content recommendations
- **retention/**: Churn risk prediction, user inactivity detection, subscription cancellation prediction
- **support/**: Ticket automation, FAQ automation, escalation workflows
- **cost-router/**: Token tracking, usage tracking, cost tracking per user/gym/company/creator

---

## تفعيل Core Modules

في `app.module.ts`:
- EventBusModule - @Global()
- AuditModule - @Global()
- SecurityModule - @Global()
- HealthModule
- ComplianceModule
- SettlementModule

---

## قاعدة البيانات - جداول جديدة مطلوبة

### Social Tables
```sql
posts, post_media, post_likes, post_comments, post_shares, post_views, post_reports,
reels, reel_views, reel_engagements,
stories, story_views, story_reactions,
conversations, conversation_participants, messages, message_status, message_reactions,
communities, community_members, community_posts
```

### Creator Tables
```sql
creator_profiles, creator_subscriptions, creator_programs, creator_program_enrollments,
creator_live_sessions, creator_live_tickets, session_replays,
creator_payouts, creator_revenue_splits, creator_analytics
```

### Corporate Tables
```sql
corporations, corporation_departments, corporation_employees, hr_managers,
corporate_challenges, corporate_challenge_participants, corporate_wellness_scores
```

### Ads Tables
```sql
ad_campaigns, ad_creatives, ad_slots, ad_impressions, ad_clicks,
campaign_analytics, audience_targets
```

### Settlement Tables
```sql
settlement_batches, settlement_items, payout_requests, payout_schedules,
withdrawal_requests, treasury_snapshots, reconciliation_logs
```

### Compliance Tables
```sql
compliance_rules, compliance_audits, data_retention_policies,
deletion_requests, vat_records, aml_alerts
```

### Health Tables
```sql
health_connections, health_sync_logs, wearable_data,
move_to_earn_validations, activity_rewards
```

### AI Tables
```sql
ai_conversations, ai_recommendations, ai_predictions,
ai_support_tickets, ai_cost_records, ai_usage_logs
```

---

## Events جديدة مطلوبة

### Social Events
- PostCreated, PostLiked, PostShared, PostReported, PostDeleted
- ReelUploaded, ReelViewed, ReelCompleted, ReelLiked
- StoryCreated, StoryViewed, StoryExpired
- MessageSent, MessageDelivered, MessageSeen
- CommunityJoined, CommunityLeft

### Creator Events
- CreatorSubscribed, CreatorUnsubscribed, SubscriptionRenewed
- ProgramPurchased, ProgramCompleted
- LiveSessionStarted, LiveSessionEnded, TicketPurchased
- PayoutRequested, PayoutProcessed, PayoutPaid

### Corporate Events
- CorporateEnrolled, CorporateEmployeeAdded
- CorporateChallengeCreated, CorporateChallengeJoined
- WellnessScoreUpdated

### Ads Events
- CampaignCreated, CampaignStarted, CampaignPaused, CampaignEnded
- AdImpressionRecorded, AdClickRecorded, AdConversionRecorded

### Settlement Events
- SettlementBatchCreated, SettlementProcessed
- PayoutRequested, PayoutApproved, PayoutPaid, PayoutFailed
- WithdrawalRequested, WithdrawalProcessed

### Compliance Events
- ComplianceRuleTriggered, AMLAlertCreated
- DeletionRequested, DeletionCompleted
- VATCalculated

### Health Events
- HealthConnected, HealthSynced
- ActivityValidated, RewardGranted

### AI Events
- AIRecommendationGenerated, AIPredictionMade
- AISupportTicketResolved, AICostThresholdReached
