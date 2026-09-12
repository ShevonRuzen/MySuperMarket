import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@ApiTags('Payments (PayHere)')
@Controller('payments/payhere')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('init')
  @ApiOperation({ summary: 'Generate PayHere secure hash for POS terminal popup card checkout' })
  initPayment(@Body() body: { orderId: string; amount: number; currency?: string }) {
    return this.paymentsService.generatePayHereHash(body.orderId, body.amount, body.currency || 'LKR');
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'PayHere server-to-server notification webhook' })
  handleWebhook(@Body() body: any) {
    const isValid = this.paymentsService.verifyPayHereSignature(body);
    if (!isValid) {
      return { status: 'INVALID_SIGNATURE' };
    }
    console.log('[PayHere Webhook] Verified payment notification for order:', body.order_id);
    return { status: 'PROCESSED' };
  }
}
