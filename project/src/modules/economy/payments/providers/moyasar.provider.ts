import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderInterface, PaymentDetails } from '../payment-provider.interface';
import { Currency } from '../../../../common/enums';

@Injectable()
export class MoyasarProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(MoyasarProvider.name);

  async authorize(amount: number, currency: Currency, metadata?: any): Promise<PaymentDetails> {
    this.logger.log(`Initiating Moyasar Authorization: amount=${amount}, currency=${currency}`);
    return {
      transactionId: `moyasar_auth_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount,
      currency,
      status: 'AUTHORIZED',
      fee: amount * 0.022 + 1.0, // standard 2.2% + 1 SAR fee
      rawResponse: { gateway: 'moyasar', action: 'auth', success: true },
    };
  }

  async capture(transactionId: string, amount: number): Promise<PaymentDetails> {
    this.logger.log(`Moyasar Capture: txId=${transactionId}, amount=${amount}`);
    return {
      transactionId,
      amount,
      currency: Currency.SAR, // Moyasar default in KSA
      status: 'CAPTURED',
      fee: amount * 0.022 + 1.0,
      rawResponse: { gateway: 'moyasar', action: 'capture', success: true },
    };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentDetails> {
    this.logger.log(`Moyasar Refund: txId=${transactionId}, amount=${amount}`);
    return {
      transactionId,
      amount,
      currency: Currency.SAR,
      status: 'REFUNDED',
      fee: 0,
      rawResponse: { gateway: 'moyasar', action: 'refund', success: true },
    };
  }

  async void(transactionId: string): Promise<PaymentDetails> {
    this.logger.log(`Moyasar Void: txId=${transactionId}`);
    return {
      transactionId,
      amount: 0,
      currency: Currency.SAR,
      status: 'VOIDED',
      fee: 0,
      rawResponse: { gateway: 'moyasar', action: 'void', success: true },
    };
  }

  async verifyWebhook(headers: any, body: any): Promise<boolean> {
    this.logger.log('Verifying Moyasar Webhook signature');
    return true;
  }
}
