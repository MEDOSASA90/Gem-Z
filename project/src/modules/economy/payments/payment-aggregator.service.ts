import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PaymobProvider } from './providers/paymob.provider';
import { MoyasarProvider } from './providers/moyasar.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentDetails, PaymentProviderInterface } from './payment-provider.interface';
import { Currency } from '../../../common/enums';

@Injectable()
export class PaymentAggregatorService {
  private readonly logger = new Logger(PaymentAggregatorService.name);
  private providers = new Map<string, PaymentProviderInterface>();

  constructor(
    private readonly paymob: PaymobProvider,
    private readonly moyasar: MoyasarProvider,
    private readonly stripe: StripeProvider,
  ) {
    this.providers.set('paymob', this.paymob);
    this.providers.set('moyasar', this.moyasar);
    this.providers.set('stripe', this.stripe);
  }

  /**
   * Resolve appropriate payment provider based on provider name or currency context
   */
  resolveProvider(providerName?: string, currency?: Currency): PaymentProviderInterface {
    if (providerName && this.providers.has(providerName)) {
      return this.providers.get(providerName)!;
    }

    // Default heuristics based on currency
    if (currency === Currency.SAR) {
      return this.moyasar;
    } else if (currency === Currency.EGP) {
      return this.paymob;
    }

    // Fallback to Stripe for USD, EUR, etc.
    return this.stripe;
  }

  async authorize(
    amount: number,
    currency: Currency,
    providerName?: string,
    metadata?: any,
  ): Promise<PaymentDetails> {
    const provider = this.resolveProvider(providerName, currency);
    this.logger.log(`Aggregator -> Routing Authorize request`);
    return provider.authorize(amount, currency, metadata);
  }

  async capture(transactionId: string, amount: number, providerName: string): Promise<PaymentDetails> {
    const provider = this.resolveProvider(providerName);
    this.logger.log(`Aggregator -> Routing Capture request for [${transactionId}]`);
    return provider.capture(transactionId, amount);
  }

  async refund(transactionId: string, amount: number, providerName: string): Promise<PaymentDetails> {
    const provider = this.resolveProvider(providerName);
    this.logger.log(`Aggregator -> Routing Refund request for [${transactionId}]`);
    return provider.refund(transactionId, amount);
  }

  async void(transactionId: string, providerName: string): Promise<PaymentDetails> {
    const provider = this.resolveProvider(providerName);
    this.logger.log(`Aggregator -> Routing Void request for [${transactionId}]`);
    return provider.void(transactionId);
  }
}
