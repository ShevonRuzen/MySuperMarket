import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType, SaleStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async openShift(cashierId: string, terminalId: string, branchId: string, openingFloat: number) {
    // Check if there's already an open shift for this terminal
    const existing = await this.prisma.shift.findFirst({
      where: { terminalId, status: 'OPEN' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.shift.create({
      data: {
        branchId,
        terminalId,
        cashierId,
        openingFloat,
        status: 'OPEN',
      },
    });
  }

  async closeShift(shiftId: string, countedCash: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: { status: 'PAID' },
          include: { payments: true },
        },
      },
    });

    if (!shift) {
      throw new BadRequestException('Shift not found');
    }

    let cashSalesTotal = 0;
    shift.sales.forEach((sale) => {
      sale.payments.forEach((p) => {
        if (p.method === 'CASH' || p.method === 'SPLIT_CASH') {
          cashSalesTotal += Number(p.amount);
        }
      });
    });

    const expectedCash = Number(shift.openingFloat) + cashSalesTotal;
    const difference = countedCash - expectedCash;

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        countedCash,
        expectedCash,
        difference,
        zReportPrinted: true,
      },
    });
  }

  async createSale(cashierId: string, data: any) {
    const { offlineId, branchId, shiftId, items, payments } = data;

    // 1. Check idempotency for offline synchronization
    if (offlineId) {
      const existing = await this.prisma.sale.findUnique({
        where: { offlineId },
        include: { items: true, payments: true },
      });
      if (existing) {
        return existing; // Return already processed sale without duplicate decrements
      }
    }

    // 2. Generate unique invoice number: C07-YYYYMMDD-SEQ
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.sale.count({
      where: { branchId },
    });
    const seq = String(count + 1).padStart(5, '0');
    const invoiceNo = `INV-${today}-${seq}`;

    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item: any) => {
      const line = Number(item.unitPrice) * Number(item.qty);
      subtotal += line;
      totalDiscount += Number(item.discountAmount || 0);
    });

    const total = subtotal - totalDiscount;

    // 3. Execute sale creation and stock decrement in single atomic transaction
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          offlineId: offlineId || null,
          branchId,
          shiftId,
          cashierId,
          invoiceNo,
          subtotal,
          discount: totalDiscount,
          total,
          status: SaleStatus.PAID,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              qty: i.qty,
              unitPrice: i.unitPrice,
              discountAmount: i.discountAmount || 0,
              weightKg: i.weightKg || null,
              lineTotal: Number(i.unitPrice) * Number(i.qty) - Number(i.discountAmount || 0),
            })),
          },
          payments: {
            create: payments.map((p: any) => ({
              method: p.method as PaymentMethod,
              amount: p.amount,
              cashTendered: p.cashTendered || null,
              changeGiven: p.changeGiven || null,
              payhereRef: p.reference || null,
            })),
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // Decrement inventory and log stock movement for each item
      for (const item of items) {
        const stock = await tx.stock.findUnique({
          where: {
            branchId_productId: {
              branchId,
              productId: item.productId,
            },
          },
        });

        const qtyBefore = stock ? Number(stock.quantity) : 0;
        const qtyChange = Number(item.qty);
        const qtyAfter = qtyBefore - qtyChange;

        await tx.stock.upsert({
          where: {
            branchId_productId: {
              branchId,
              productId: item.productId,
            },
          },
          update: {
            quantity: { decrement: qtyChange },
          },
          create: {
            branchId,
            productId: item.productId,
            quantity: -qtyChange,
          },
        });

        await tx.stockMovement.create({
          data: {
            branchId,
            productId: item.productId,
            userId: cashierId,
            type: StockMovementType.SALE,
            qtyChange: -qtyChange,
            qtyBefore,
            qtyAfter,
            reference: invoiceNo,
          },
        });
      }

      return sale;
    });
  }

  async getRecentSales(branchId: string, limit = 20) {
    return this.prisma.sale.findMany({
      where: { branchId },
      include: {
        items: { include: { product: true } },
        payments: true,
        cashier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
