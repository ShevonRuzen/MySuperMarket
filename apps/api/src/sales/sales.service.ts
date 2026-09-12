import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType, SaleStatus, PaymentMethod } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async openShift(cashierId: string, terminalId: string, branchId: string, openingFloat: number) {
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

  async getShiftReport(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        branch: true,
        terminal: true,
        cashier: { select: { id: true, name: true, email: true } },
        sales: {
          include: {
            payments: true,
            items: { include: { product: true } },
          },
        },
      },
    });

    if (!shift) throw new NotFoundException('Shift not found');

    let totalGrossSales = 0;
    let totalDiscounts = 0;
    let totalNetSales = 0;
    let cashCollected = 0;
    let cardCollected = 0;
    let totalTransactions = 0;
    let voidedSalesCount = 0;

    shift.sales.forEach((s) => {
      if (s.status === 'PAID') {
        totalGrossSales += Number(s.subtotal);
        totalDiscounts += Number(s.discount);
        totalNetSales += Number(s.total);
        totalTransactions++;

        s.payments.forEach((p) => {
          if (p.method === 'CASH' || p.method === 'SPLIT_CASH') cashCollected += Number(p.amount);
          if (p.method === 'CARD' || p.method === 'SPLIT_CARD') cardCollected += Number(p.amount);
        });
      } else if (s.status === 'VOIDED') {
        voidedSalesCount++;
      }
    });

    return {
      shiftId: shift.id,
      branchName: shift.branch.name,
      terminalName: shift.terminal.name,
      cashierName: shift.cashier.name,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      openingFloat: Number(shift.openingFloat),
      totalGrossSales,
      totalDiscounts,
      totalNetSales,
      cashCollected,
      cardCollected,
      expectedDrawerCash: Number(shift.openingFloat) + cashCollected,
      countedCash: shift.countedCash ? Number(shift.countedCash) : null,
      difference: shift.difference ? Number(shift.difference) : null,
      totalTransactions,
      voidedSalesCount,
    };
  }

  async createSale(cashierId: string, data: any) {
    const { offlineId, branchId, shiftId, items, payments } = data;

    // Idempotency check for offline sync
    if (offlineId) {
      const existing = await this.prisma.sale.findUnique({
        where: { offlineId },
        include: { items: true, payments: true },
      });
      if (existing) {
        return existing;
      }
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.sale.count({ where: { branchId } });
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

  async voidSale(saleId: string, managerUserId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status === 'VOIDED') throw new BadRequestException('Sale is already voided');

      // 1. Mark sale voided
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.VOIDED },
      });

      // 2. Restore stock
      for (const item of sale.items) {
        await tx.stock.update({
          where: {
            branchId_productId: {
              branchId: sale.branchId,
              productId: item.productId,
            },
          },
          data: {
            quantity: { increment: Number(item.qty) },
          },
        });

        await tx.stockMovement.create({
          data: {
            branchId: sale.branchId,
            productId: item.productId,
            userId: managerUserId,
            type: StockMovementType.RETURN,
            qtyChange: Number(item.qty),
            qtyBefore: 0,
            qtyAfter: Number(item.qty),
            reference: `VOID: ${sale.invoiceNo} - ${reason}`,
          },
        });
      }

      return updatedSale;
    });
  }

  // --- Held Sales ---
  async holdSale(branchId: string, terminalId: string, cashierId: string, holdRef: string, cartJson: any) {
    return this.prisma.heldSale.create({
      data: {
        branchId,
        terminalId,
        cashierId,
        holdRef,
        cartJson,
      },
    });
  }

  async getHeldSales(branchId: string) {
    return this.prisma.heldSale.findMany({
      where: { branchId },
      include: { cashier: { select: { name: true } } },
      orderBy: { heldAt: 'desc' },
    });
  }

  async recallHeldSale(id: string) {
    const held = await this.prisma.heldSale.findUnique({ where: { id } });
    if (!held) throw new NotFoundException('Held cart not found');
    await this.prisma.heldSale.delete({ where: { id } });
    return held;
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
