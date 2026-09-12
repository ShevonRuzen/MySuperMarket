import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class PurchasingService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId?: string) {
    return this.prisma.purchase.findMany({
      where: branchId ? { branchId } : {},
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const po = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: { include: { product: true } },
      },
    });
    if (!po) throw new NotFoundException(`PO ${id} not found`);
    return po;
  }

  async createPO(data: {
    branchId: string;
    supplierId: string;
    expectedDate?: Date;
    notes?: string;
    items: { productId: string; orderedQty: number; costPrice: number }[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required for a Purchase Order');
    }

    return this.prisma.purchase.create({
      data: {
        branchId: data.branchId,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate,
        notes: data.notes,
        status: PurchaseStatus.SENT,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            costPrice: i.costPrice,
            receivedQty: 0,
            shortQty: 0,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        supplier: true,
      },
    });
  }

  /**
   * Goods Received Note (GRN):
   * Confirms delivery of items against a PO, flags short deliveries,
   * updates stock quantity in Stock table, and writes StockMovement.
   */
  async processGRN(poId: string, receivedItems: { productId: string; receivedQty: number }[], userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchase.findUnique({
        where: { id: poId },
        include: { items: true },
      });

      if (!po) throw new NotFoundException('PO not found');

      let allReceived = true;

      for (const rec of receivedItems) {
        const item = po.items.find((i) => i.productId === rec.productId);
        if (!item) continue;

        const ordered = Number(item.orderedQty);
        const received = rec.receivedQty;
        const shortQty = Math.max(0, ordered - received);

        if (shortQty > 0) {
          allReceived = false;
        }

        // Update purchase item
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: {
            receivedQty: received,
            shortQty,
          },
        });

        // Increment stock
        const currentStock = await tx.stock.findUnique({
          where: { branchId_productId: { branchId: po.branchId, productId: rec.productId } },
        });

        const qtyBefore = currentStock ? Number(currentStock.quantity) : 0;
        const qtyAfter = qtyBefore + received;

        await tx.stock.upsert({
          where: { branchId_productId: { branchId: po.branchId, productId: rec.productId } },
          update: { quantity: { increment: received } },
          create: { branchId: po.branchId, productId: rec.productId, quantity: received },
        });

        // Log stock movement
        await tx.stockMovement.create({
          data: {
            branchId: po.branchId,
            productId: rec.productId,
            userId,
            type: StockMovementType.PURCHASE,
            qtyChange: received,
            qtyBefore,
            qtyAfter,
            reference: `GRN: PO-${po.id.slice(-6)}`,
          },
        });
      }

      // Update PO status
      const updatedPO = await tx.purchase.update({
        where: { id: poId },
        data: {
          status: allReceived ? PurchaseStatus.RECEIVED : PurchaseStatus.PARTIAL,
          receivedDate: new Date(),
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
        },
      });

      return updatedPO;
    });
  }
}
