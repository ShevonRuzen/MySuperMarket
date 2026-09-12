import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransferStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId?: string) {
    return this.prisma.stockTransfer.findMany({
      where: branchId
        ? {
            OR: [{ fromBranchId: branchId }, { toBranchId: branchId }],
          }
        : {},
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: true,
        toBranch: true,
        items: { include: { product: true } },
      },
    });
    if (!transfer) throw new NotFoundException(`Stock transfer ${id} not found`);
    return transfer;
  }

  async requestTransfer(data: {
    fromBranchId: string;
    toBranchId: string;
    requestedBy: string;
    notes?: string;
    items: { productId: string; requestedQty: number }[];
  }) {
    if (data.fromBranchId === data.toBranchId) {
      throw new BadRequestException('Source and destination branches cannot be the same');
    }
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('At least one item is required for a stock transfer');
    }

    return this.prisma.stockTransfer.create({
      data: {
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        requestedBy: data.requestedBy,
        notes: data.notes,
        status: TransferStatus.REQUESTED,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            requestedQty: i.requestedQty,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
      },
    });
  }

  async approveTransfer(id: string, approvedBy: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.REQUESTED) {
      throw new BadRequestException(`Cannot approve transfer in status ${transfer.status}`);
    }

    for (const item of transfer.items) {
      const stock = await this.prisma.stock.findUnique({
        where: {
          branchId_productId: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
          },
        },
      });
      const currentQty = Number(stock?.quantity || 0);
      const reqQty = Number(item.requestedQty);
      if (currentQty < reqQty) {
        throw new BadRequestException(
          `Insufficient stock for item ${item.product.name} at source branch (Available: ${currentQty}, Requested: ${reqQty})`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const stock = await tx.stock.findUnique({
          where: {
            branchId_productId: {
              branchId: transfer.fromBranchId,
              productId: item.productId,
            },
          },
        });
        const currentQty = Number(stock?.quantity || 0);
        const reqQty = Number(item.requestedQty);
        const newQty = currentQty - reqQty;

        await tx.stock.update({
          where: { id: stock!.id },
          data: { quantity: newQty },
        });

        await tx.stockMovement.create({
          data: {
            branchId: transfer.fromBranchId,
            productId: item.productId,
            userId: approvedBy,
            type: StockMovementType.TRANSFER_OUT,
            qtyChange: -reqQty,
            qtyBefore: currentQty,
            qtyAfter: newQty,
            reference: `Transfer Dispatch ${transfer.id}`,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.IN_TRANSIT,
          approvedBy,
        },
        include: {
          fromBranch: true,
          toBranch: true,
          items: { include: { product: true } },
        },
      });
    });
  }

  async receiveTransfer(
    id: string,
    receivedItems: { productId: string; confirmedQty: number }[],
    receivedBy: string,
  ) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new BadRequestException(`Cannot receive transfer in status ${transfer.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const rec of receivedItems) {
        const transferItem = transfer.items.find((i) => i.productId === rec.productId);
        if (!transferItem) continue;

        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: { confirmedQty: rec.confirmedQty },
        });

        const destStock = await tx.stock.upsert({
          where: {
            branchId_productId: {
              branchId: transfer.toBranchId,
              productId: rec.productId,
            },
          },
          create: {
            branchId: transfer.toBranchId,
            productId: rec.productId,
            quantity: rec.confirmedQty,
          },
          update: {
            quantity: { increment: rec.confirmedQty },
          },
        });

        const currentQty = Number(destStock.quantity);
        const qtyBefore = currentQty - rec.confirmedQty;

        await tx.stockMovement.create({
          data: {
            branchId: transfer.toBranchId,
            productId: rec.productId,
            userId: receivedBy,
            type: StockMovementType.TRANSFER_IN,
            qtyChange: rec.confirmedQty,
            qtyBefore,
            qtyAfter: currentQty,
            reference: `Transfer Receipt ${transfer.id}`,
          },
        });
      }

      return tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.RECEIVED,
        },
        include: {
          fromBranch: true,
          toBranch: true,
          items: { include: { product: true } },
        },
      });
    });
  }

  async rejectTransfer(id: string, rejectedBy: string, reason?: string) {
    const transfer = await this.findOne(id);
    if (transfer.status !== TransferStatus.REQUESTED) {
      throw new BadRequestException(`Cannot reject transfer in status ${transfer.status}`);
    }

    return this.prisma.stockTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.REJECTED,
        approvedBy: rejectedBy,
        notes: transfer.notes
          ? `${transfer.notes} | Rejected: ${reason || 'No reason'}`
          : `Rejected: ${reason || 'No reason'}`,
      },
    });
  }
}
