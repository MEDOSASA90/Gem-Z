/**
 * =============================================================================
 * Event Decorators - Decorators للاشتراك التلقائي في الأحداث
 * =============================================================================
 */

import 'reflect-metadata';
import { EventHandler, EventType } from './event.types';

/** مفتاح الـ metadata للأحداث */
export const ON_EVENT_METADATA = '__onEventHandlers__';

/**
 * Decorator للاشتراك التلقائي في حدث معين
 * يُستخدم على methods داخل الـ providers
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @OnEvent(EventType.USER_REGISTERED)
 *   async handleUserRegistered(envelope: EventEnvelope<UserRegisteredPayload>) {
 *     // معالجة الحدث
 *   }
 * }
 * ```
 */
export function OnEvent(eventType: EventType | string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingHandlers = Reflect.getMetadata(ON_EVENT_METADATA, target) || [];

    existingHandlers.push({
      eventType,
      methodName: propertyKey,
      handler: descriptor.value as EventHandler,
    });

    Reflect.defineMetadata(ON_EVENT_METADATA, existingHandlers, target);
    return descriptor;
  };
}

/**
 * Decorator للاشتراك في عدة أحداث مرة واحدة
 * 
 * @example
 * ```typescript
 * @OnEvents([EventType.WALLET_DEBITED, EventType.WALLET_CREDITED])
 * async handleWalletChanges(envelope: EventEnvelope) { }
 * ```
 */
export function OnEvents(eventTypes: EventType[]): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingHandlers = Reflect.getMetadata(ON_EVENT_METADATA, target) || [];

    for (const eventType of eventTypes) {
      existingHandlers.push({
        eventType,
        methodName: propertyKey,
        handler: descriptor.value as EventHandler,
      });
    }

    Reflect.defineMetadata(ON_EVENT_METADATA, existingHandlers, target);
    return descriptor;
  };
}

/**
 * Decorator للاشتراك في wildcard pattern
 * يشترك في كل الأحداث المتطابقة مع الـ pattern
 * 
 * @example
 * ```typescript
 * @OnEventPattern('events:WALLET_*')
 * async handleWalletEvents(envelope: EventEnvelope) { }
 * ```
 */
export function OnEventPattern(pattern: string): MethodDecorator {
  return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const existingHandlers = Reflect.getMetadata(ON_EVENT_METADATA, target) || [];

    existingHandlers.push({
      eventType: pattern,
      methodName: propertyKey,
      handler: descriptor.value as EventHandler,
      isPattern: true,
    });

    Reflect.defineMetadata(ON_EVENT_METADATA, existingHandlers, target);
    return descriptor;
  };
}

/**
 * Decorator للاشتراك في كل الأحداث (catch-all)
 * 
 * @example
 * ```typescript
 * @OnAnyEvent()
 * async logAllEvents(envelope: EventEnvelope) { }
 * ```
 */
export function OnAnyEvent(): MethodDecorator {
  return OnEventPattern('events:*');
}

/** الحصول على handlers المسجلة من metadata */
export function getEventHandlers(target: object): Array<{
  eventType: string;
  methodName: string | symbol;
  handler: EventHandler;
  isPattern?: boolean;
}> {
  return Reflect.getMetadata(ON_EVENT_METADATA, target) || [];
}
