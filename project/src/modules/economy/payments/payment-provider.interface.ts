import { Currency } from '../../../common/enums';

export interface PaymentDetails {
  transactionId: string;
  amount: number;
  currency: Currency;
  status: 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'VOIDED' | 'FAILED';
  fee: number;
  rawResponse?: any;
}

export interface PaymentProviderInterface {
  authorize(amount: number, currency: Currency, metadata?: any): Promise<PaymentDetails>;
  capture(transactionId: string, amount: number): Promise<PaymentDetails>;
  refund(transactionId: string, amount: number): Promise<PaymentDetails>;
  void(transactionId: string): Promise<PaymentDetails>;
  verifyWebhook(headers: any, body: any): Promise<boolean>;
}
