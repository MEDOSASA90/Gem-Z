import { Module, Global } from '@nestjs/common';
import { PaymentAggregatorService } from './payment-aggregator.service';
import { PaymobProvider } from './providers/paymob.provider';
import { MoyasarProvider } from './providers/moyasar.provider';
import { StripeProvider } from './providers/stripe.provider';

@Global()
@Module({
  providers: [
    PaymentAggregatorService,
    PaymobProvider,
    MoyasarProvider,
    StripeProvider,
  ],
  exports: [PaymentAggregatorService],
})
export class PaymentsModule {}
