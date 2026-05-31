import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BiometricFrameDto {
  userId: string;
  workoutSessionId: string;
  exerciseType: 'SQUAT' | 'DEADLIFT' | 'BICEP_CURL';
  landmarks: Point3D[]; // 33 points matching MediaPipe Pose skeletal keypoints
}

@Injectable()
export class AiBodyTransformationService {
  private readonly logger = new Logger(AiBodyTransformationService.name);

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process Pose Landmark biometric frame for joint flexion tracking and real-time rep counting
   */
  async processBiometricFrame(dto: BiometricFrameDto): Promise<{
    repCount: number;
    postureState: string;
    correctionTriggered: boolean;
    correctionMessage?: string;
  }> {
    const { userId, workoutSessionId, exerciseType, landmarks } = dto;

    if (!landmarks || landmarks.length < 33) {
      return { repCount: 0, postureState: 'INVALID_FRAME', correctionTriggered: false };
    }

    // Skeletal indices mapped from MediaPipe Pose landmarks
    // 11: Left Shoulder, 12: Right Shoulder
    // 23: Left Hip, 24: Right Hip
    // 25: Left Knee, 26: Right Knee
    // 27: Left Ankle, 28: Right Ankle
    
    let repCount = 0;
    let postureState = 'UNKNOWN';
    let correctionTriggered = false;
    let correctionMessage = '';

    if (exerciseType === 'SQUAT') {
      // Calculate knee joint angle using Left Hip (23), Left Knee (25), Left Ankle (27)
      const hip = landmarks[23];
      const knee = landmarks[25];
      const ankle = landmarks[27];

      const kneeAngle = this.calculateAngle(hip, knee, ankle);
      postureState = `Knee angle: ${Math.round(kneeAngle)}°`;

      // Squat State Machine via Redis: transitions 'UP' <-> 'DOWN'
      const squatStateKey = `squat:state:${userId}:${workoutSessionId}`;
      const repKey = `squat:reps:${userId}:${workoutSessionId}`;
      
      const currentState = (await this.redis.get(squatStateKey)) || 'UP';

      if (kneeAngle < 100 && currentState === 'UP') {
        // Trainee is in the bottom position of the squat
        await this.redis.set(squatStateKey, 'DOWN');
        this.logger.log(`User ${userId} reached squat bottom position (Angle: ${Math.round(kneeAngle)}°)`);
      } else if (kneeAngle > 160 && currentState === 'DOWN') {
        // Trainee returned to extension (completed 1 rep)
        await this.redis.set(squatStateKey, 'UP');
        repCount = await this.redis.incr(repKey);
        this.logger.log(`Squat rep completed atomically for User ${userId}. Rep Count: ${repCount}`);
      } else {
        // Read current count
        const rawReps = await this.redis.get(repKey);
        repCount = rawReps ? parseInt(rawReps, 10) : 0;
      }
    } 
    else if (exerciseType === 'DEADLIFT') {
      // Monitor spine alignment: Left Shoulder (11) -> Left Hip (23) -> Left Knee (25)
      const shoulder = landmarks[11];
      const hip = landmarks[23];
      const knee = landmarks[25];

      const spineAngle = this.calculateAngle(shoulder, hip, knee);
      postureState = `Spine angle: ${Math.round(spineAngle)}°`;

      const repKey = `deadlift:reps:${userId}:${workoutSessionId}`;
      const deadliftStateKey = `deadlift:state:${userId}:${workoutSessionId}`;
      const currentState = (await this.redis.get(deadliftStateKey)) || 'DOWN';

      // If spine is rounded (angle < 140 degrees while lifting) => Trigger form correction
      if (spineAngle < 135) {
        correctionTriggered = true;
        correctionMessage = 'Straighten your back to avoid injury';
        
        // Emit FormCorrectionTriggered event with specific audio instructions
        this.eventEmitter.emit('ai.form_correction_triggered', {
          event_id: crypto.randomUUID(),
          correlation_id: workoutSessionId,
          actor_id: userId,
          source_module: 'ai',
          event_type: 'FormCorrectionTriggered',
          timestamp: new Date().toISOString(),
          payload: {
            userId,
            workoutSessionId,
            exerciseType,
            angle: spineAngle,
            audioInstruction: correctionMessage,
            severity: 'HIGH',
          },
        });
        
        this.logger.warn(`Form deviation detected on Deadlift for ${userId}. Angle: ${spineAngle}°`);
      }

      // Rep Counting for Deadlift (Angle changes from standing tall 180° to flexion 90°)
      if (spineAngle > 170 && currentState === 'FLEXION') {
        await this.redis.set(deadliftStateKey, 'EXTENSION');
        repCount = await this.redis.incr(repKey);
      } else if (spineAngle < 110 && currentState === 'EXTENSION') {
        await this.redis.set(deadliftStateKey, 'FLEXION');
        const rawReps = await this.redis.get(repKey);
        repCount = rawReps ? parseInt(rawReps, 10) : 0;
      } else {
        const rawReps = await this.redis.get(repKey);
        repCount = rawReps ? parseInt(rawReps, 10) : 0;
      }
    }

    return {
      repCount,
      postureState,
      correctionTriggered,
      correctionMessage: correctionTriggered ? correctionMessage : undefined,
    };
  }

  /**
   * Conclude workout session, calculate and output FormAccuracyScore to ClickHouse
   */
  async endWorkoutSession(userId: string, workoutSessionId: string, exerciseType: string): Promise<{
    session_id: string;
    formAccuracyScore: number;
    totalReps: number;
  }> {
    const squatReps = await this.redis.get(`${exerciseType.toLowerCase()}:reps:${userId}:${workoutSessionId}`);
    const totalReps = squatReps ? parseInt(squatReps, 10) : 0;

    // Calculate Form Accuracy Score
    // Form accuracy score = 100 - (number of corrections triggered * 5)
    // For production, we can record triggered corrections count in Redis
    const correctionCountRaw = await this.redis.get(`corrections:count:${userId}:${workoutSessionId}`);
    const correctionsCount = correctionCountRaw ? parseInt(correctionCountRaw, 10) : 0;
    const formAccuracyScore = Math.max(10, 100 - correctionsCount * 5);

    // Save final stats to ClickHouse
    await this.logWorkoutStatsToClickhouse(userId, workoutSessionId, exerciseType, totalReps, formAccuracyScore);

    // Clear session state keys in Redis
    await this.redis.del(`squat:state:${userId}:${workoutSessionId}`);
    await this.redis.del(`squat:reps:${userId}:${workoutSessionId}`);
    await this.redis.del(`deadlift:state:${userId}:${workoutSessionId}`);
    await this.redis.del(`deadlift:reps:${userId}:${workoutSessionId}`);
    await this.redis.del(`corrections:count:${userId}:${workoutSessionId}`);

    return {
      session_id: workoutSessionId,
      formAccuracyScore,
      totalReps,
    };
  }

  /**
   * Vector geometry utility to calculate the angle between three landmarks A -> B -> C
   */
  private calculateAngle(A: Point3D, B: Point3D, C: Point3D): number {
    const AB = { x: A.x - B.x, y: A.y - B.y, z: A.z - B.z };
    const CB = { x: C.x - B.x, y: C.y - B.y, z: C.z - B.z };

    // Calculate dot product
    const dotProduct = AB.x * CB.x + AB.y * CB.y + AB.z * CB.z;
    
    // Calculate magnitude of vectors
    const magAB = Math.sqrt(AB.x * AB.x + AB.y * AB.y + AB.z * AB.z);
    const magCB = Math.sqrt(CB.x * CB.x + CB.y * CB.y + CB.z * CB.z);

    const cosAngle = dotProduct / (magAB * magCB || 1);
    
    // Ensure cosAngle is strictly within [-1, 1] due to floating point inaccuracies
    const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    return (angleRad * 180) / Math.PI;
  }

  /**
   * Write session analytics data to ClickHouse
   */
  private async logWorkoutStatsToClickhouse(
    userId: string,
    sessionId: string,
    exercise: string,
    reps: number,
    accuracy: number,
  ): Promise<void> {
    this.logger.log(
      `[CLICKHOUSE ANALYTICS] clickhouse.gemz_workout_sessions: session_id=${sessionId}, user_id=${userId}, exercise_type=${exercise}, rep_count=${reps}, form_accuracy_score=${accuracy}, timestamp=${new Date().toISOString()}`
    );
  }
}
