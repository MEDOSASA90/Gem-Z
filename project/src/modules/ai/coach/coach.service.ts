import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface UserPhysicalTraits {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string;
  fitnessCreditScore: number; // User credit score (e.g. 0-1000)
  goals: string[]; // e.g. ['gain_muscle', 'improve_cardio', 'lose_fat']
}

export interface WearableMetricsSummary {
  dailySteps: number;
  caloriesBurned: number;
  averageHeartRate: number;
  activeHours: number;
}

export interface CoachSessionDto {
  userId: string;
  sessionId: string;
  physicalTraits: UserPhysicalTraits;
  wearableMetrics: WearableMetricsSummary;
}

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiCoachService {
  private readonly logger = new Logger(AiCoachService.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  /**
   * Generates highly-contextualized custom daily workout and caloric nutrition templates
   * Ingesting physical traits, credit scores, goals, and active wearable metrics
   */
  async generateDailyPlan(dto: CoachSessionDto): Promise<{
    workoutTemplate: Record<string, any>;
    nutritionPlan: Record<string, any>;
    promptContext: string;
  }> {
    this.logger.log(`Compiling AI Coach context for user [${dto.userId}]...`);

    // 1. Build the contextual prompt pipeline
    const promptContext = this.buildPromptContext(dto);

    // 2. Structuring custom daily workout and nutritional caloric plans based on contextual metrics
    // Calculate custom base metabolic rate and targets programmatically
    const targetCalories = this.calculateCaloricTarget(dto);
    const proteinTarget = Math.round(dto.physicalTraits.weightKg * 2.0); // 2.0g per kg of bodyweight
    const carbsTarget = Math.round(dto.physicalTraits.weightKg * 3.5);
    const fatTarget = Math.round(dto.physicalTraits.weightKg * 0.9);

    // Design workout template matching credit score capability
    const intensity = dto.physicalTraits.fitnessCreditScore > 750 ? 'ADVANCED' : dto.physicalTraits.fitnessCreditScore > 500 ? 'INTERMEDIATE' : 'BEGINNER';
    const exercises = this.generateExercisesForGoals(dto.physicalTraits.goals, intensity);

    const workoutTemplate = {
      sessionId: dto.sessionId,
      intensity,
      focus: dto.physicalTraits.goals.join(', '),
      warmup: '10 minutes joint rotation & light jogging',
      exercises,
      coachingNotes: intensity === 'ADVANCED' 
        ? 'High physical capacity detected based on fitness credit score. Rest exactly 90s between sets.'
        : 'Moderate capability. Focus on core stability and form consistency.',
    };

    const nutritionPlan = {
      caloricGoal: targetCalories,
      macronutrients: {
        proteinGrams: proteinTarget,
        carbsGrams: carbsTarget,
        fatsGrams: fatTarget,
      },
      meals: [
        { name: 'Breakfast', suggestion: 'Egg white omelet with spinach and 1 cup of rolled oats' },
        { name: 'Lunch', suggestion: 'Grilled chicken breast (200g) with quinoa and steamed broccoli' },
        { name: 'Snack', suggestion: 'Whey protein isolate shake + 30g almonds' },
        { name: 'Dinner', suggestion: 'Seared salmon fillet (150g) with baked sweet potato and asparagus' },
      ],
      hydrationLitres: Number((dto.physicalTraits.weightKg * 0.035).toFixed(1)),
    };

    // 3. Save memory snapshot to Redis
    const memoryKey = `coach:memory:${dto.userId}:${dto.sessionId}`;
    await this.redis.setex(
      memoryKey,
      604800, // 7 days memory TTL
      JSON.stringify({ workoutTemplate, nutritionPlan, timestamp: new Date().toISOString() }),
    );

    this.logger.log(`Generated customized AI coaching template successfully for [${dto.userId}].`);

    return {
      workoutTemplate,
      nutritionPlan,
      promptContext,
    };
  }

  /**
   * Stateful contextual storage using Redis for real-time chat memories
   */
  async chatWithCoach(userId: string, sessionId: string, message: string): Promise<string> {
    const memoryKey = `coach:chat:${userId}:${sessionId}`;
    
    // 1. Retrieve prior chat history from Redis list (real-time session memories)
    const historyRaw = await this.redis.lrange(memoryKey, 0, -1);
    const chatHistory: ChatMessageDto[] = historyRaw.map((item) => JSON.parse(item));

    // 2. Load workout snapshot context to ground coach replies in trainee metrics
    const workoutSnapshot = await this.redis.get(`coach:memory:${userId}:${sessionId}`);
    let snapshotContext = '';
    if (workoutSnapshot) {
      const parsed = JSON.parse(workoutSnapshot);
      snapshotContext = `[CURRENT PLAN: ${parsed.workoutTemplate.focus} | Calories: ${parsed.nutritionPlan.caloricGoal} kcal | Intensity: ${parsed.workoutTemplate.intensity}]`;
    }

    // 3. Programmatic context grounding & LLM simulation
    this.logger.log(`Running grounded coach conversation. History depth: ${chatHistory.length} messages.`);
    
    // Simulate smart, contextual response
    let reply = `أهلاً بك يا بطل! بناءً على تمرينك الحالي المخصص لـ (${snapshotContext}), `;
    if (message.includes('تعب') || message.includes('تعبان') || message.includes('ارهاق')) {
      reply += 'أنصحك بزيادة فترة الراحة لـ 120 ثانية بين المجموعات والتركيز على الترطيب اليوم كونه يبدو أن نبض قلبك بالأمس كان مرتفعاً قليلاً.';
    } else if (message.includes('بروتين') || message.includes('اكل') || message.includes('تغذية')) {
      reply += 'من الضروري الالتزام بنظام الغذاء الموفر لك والمحافظة على مصادر البروتين الصافية (مثل الدجاج والبيض والسلمون) لضمان الاستشفاء العضلي الأمثل.';
    } else {
      reply += 'دعنا نركز اليوم على ضبط تكنيك الحركة في التمارين والالتزام بجدول المجموعات والتكرارات. هل أنت جاهز لبدء تمرينك اليوم؟';
    }

    // 4. Save new conversation exchanges to Redis list to maintain statefulness
    const userMsg: ChatMessageDto = { role: 'user', content: message };
    const assistantMsg: ChatMessageDto = { role: 'assistant', content: reply };
    
    await this.redis.rpush(memoryKey, JSON.stringify(userMsg));
    await this.redis.rpush(memoryKey, JSON.stringify(assistantMsg));
    await this.redis.expire(memoryKey, 86400 * 3); // 3 days expiry

    return reply;
  }

  /**
   * Clears conversational history
   */
  async clearChatHistory(userId: string, sessionId: string): Promise<void> {
    await this.redis.del(`coach:chat:${userId}:${sessionId}`);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * Context Prompt Compiler
   */
  private buildPromptContext(dto: CoachSessionDto): string {
    return `
      SYSTEM INSTRUCTIONS: Ingest trainee metrics, goals, and credit rating to synthesize a grounded, safe coaching matrix.
      USER DETAILS:
      - Age: ${dto.physicalTraits.age}
      - Weight: ${dto.physicalTraits.weightKg} kg
      - Height: ${dto.physicalTraits.heightCm} cm
      - Fitness Credit Score: ${dto.physicalTraits.fitnessCreditScore}/1000
      - Goals: ${dto.physicalTraits.goals.join(', ')}
      WEARABLE BIO-TELEMETRY:
      - Daily Steps: ${dto.wearableMetrics.dailySteps}
      - Daily Burned Calories: ${dto.wearableMetrics.caloriesBurned} kcal
      - Avg Heart Rate: ${dto.wearableMetrics.averageHeartRate} bpm
    `;
  }

  /**
   * Calorie logic
   */
  private calculateCaloricTarget(dto: CoachSessionDto): number {
    // Ingest weight, height, age for BMR estimation, adjust based on goals
    const isWeightLoss = dto.physicalTraits.goals.includes('lose_fat') || dto.physicalTraits.goals.includes('lose_weight');
    const isMuscleGain = dto.physicalTraits.goals.includes('gain_muscle') || dto.physicalTraits.goals.includes('hypertrophy');
    
    let base = Math.round(10 * dto.physicalTraits.weightKg + 6.25 * dto.physicalTraits.heightCm - 5 * dto.physicalTraits.age + 5);
    
    if (isWeightLoss) base = Math.round(base * 1.2 - 500); // 500 kcal deficit
    else if (isMuscleGain) base = Math.round(base * 1.35 + 300); // 300 kcal surplus
    else base = Math.round(base * 1.3);

    return Math.max(1200, base);
  }

  /**
   * Exercises compiler
   */
  private generateExercisesForGoals(goals: string[], intensity: string): Array<Record<string, any>> {
    const isMuscle = goals.includes('gain_muscle');
    const reps = intensity === 'ADVANCED' ? '4 sets x 10 reps (80% 1RM)' : '3 sets x 12 reps (70% 1RM)';
    
    if (isMuscle) {
      return [
        { name: 'Barbell Back Squat', setsReps: reps, target: 'Quads & Glutes' },
        { name: 'Conventional Deadlift', setsReps: intensity === 'ADVANCED' ? '4 sets x 6 reps' : '3 sets x 8 reps', target: 'Posterior Chain' },
        { name: 'Dumbbell Bench Press', setsReps: reps, target: 'Chest & Shoulders' },
      ];
    }

    return [
      { name: 'Bodyweight Squats', setsReps: '3 sets x 15 reps', target: 'Legs' },
      { name: 'Kettlebell Swings', setsReps: '3 sets x 20 reps', target: 'Cardio & Hips' },
      { name: 'Push-ups', setsReps: '3 sets x max reps', target: 'Upper Body' },
    ];
  }
}
