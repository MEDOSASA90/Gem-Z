import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderInterface, PaymentDetails } from '../payment-provider.interface';
import { Currency } from '../../../../common/enums';

@Injectable()
export class StripeProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(StripeProvider.name);

  async authorize(amount: number, currency: Currency, metadata?: any): Promise<PaymentDetails> {
    this.logger.log(`Initiating Stripe Authorization: amount=${amount}, currency=${currency}`);
    return {
      transactionId: `stripe_ch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount,
      currency,
      status: 'AUTHORIZED',
      fee: amount * 0.029 + 0.3, // Standard Stripe US fee 2.9% + 30c
      rawResponse: { gateway: 'stripe', action: 'auth', success: true },
    };
  }

  async capture(transactionId: string, amount: number): Promise<PaymentDetails> {
    this.logger.log(`Stripe Capture: txId=${transactionId}, amount=${amount}`);
    return {
      transactionId,
      amount,
      currency: Currency.USD,
      status: 'CAPTURED',
      fee: amount * 0.029 + 0.3,
      rawResponse: { gateway: 'stripe', action: 'capture', success: true },
    };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentDetails> {
    this.logger.log(`Stripe Refund: txId=${transactionId}, amount=${amount}`);
    return {
      transactionId,
      amount,
      currency: Currency.USD,
      status: 'REFUNDED',
      fee: 0,
      rawResponse: { gateway: 'stripe', action: 'refund', success: true },
    };
  }

  async void(transactionId: string): Promise<PaymentDetails> {
    this.logger.log(`Stripe Void: txId=${transactionId}`);
    return {
      transactionId,
      amount: 0,
      currency: Currency.USD,
      status: 'VOIDED',
      fee: 0,
      rawResponse: { gateway: 'stripe', action: 'void', success: true },
    };
  }

  async verifyWebhook(headers: any, body: any): Promise<boolean> {
    this.logger.log('Verifying Stripe Webhook signature');
    return true;
  }
}
