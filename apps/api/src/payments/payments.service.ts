import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private merchantId = process.env.PAYHERE_MERCHANT_ID || '1211149';
  private merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || 'sandbox_secret_key';

  generatePayHereHash(orderId: string, amount: number, currency = 'LKR') {
    const formattedAmount = amount.toFixed(2);
    const hashedSecret = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();
    const hashString = `${this.merchantId}${orderId}${formattedAmount}${currency}${hashedSecret}`;
    const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

    return {
      merchantId: this.merchantId,
      orderId,
      amount: formattedAmount,
      currency,
      hash,
      sandbox: process.env.PAYHERE_SANDBOX === 'true' || true,
    };
  }

  verifyPayHereSignature(body: any): boolean {
    const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = body;
    const hashedSecret = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();
    const hashString = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`;
    const calculatedSig = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();

    return calculatedSig === md5sig;
  }
}
