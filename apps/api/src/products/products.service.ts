import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductUnit, StockMovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId?: string, categoryId?: string, search?: string) {
    const where: any = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcodes: { some: { barcode: { contains: search } } } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        barcodes: true,
        category: true,
        branchProducts: branchId ? { where: { branchId } } : true,
        stocks: branchId ? { where: { branchId } } : true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findByBarcode(barcode: string, branchId?: string) {
    const productBarcode = await this.prisma.productBarcode.findUnique({
      where: { barcode },
      include: {
        product: {
          include: {
            barcodes: true,
            category: true,
            branchProducts: branchId ? { where: { branchId } } : true,
            stocks: branchId ? { where: { branchId } } : true,
          },
        },
      },
    });

    if (!productBarcode || !productBarcode.product.isActive) {
      throw new NotFoundException(`Product not found for barcode: ${barcode}`);
    }

    const prod = productBarcode.product;
    const branchPrice = prod.branchProducts[0]?.sellingPrice ?? prod.costPrice;
    const currentStock = prod.stocks[0]?.quantity ?? 0;

    return {
      id: prod.id,
      name: prod.name,
      barcode: barcode,
      isWeighed: prod.isWeighed,
      unit: prod.unit,
      costPrice: Number(prod.costPrice),
      sellingPrice: Number(branchPrice),
      currentStock: Number(currentStock),
      categoryName: prod.category?.name || 'General',
    };
  }

  async createProduct(data: {
    name: string;
    categoryId?: string;
    costPrice: number;
    sellingPrice: number;
    barcodes: string[];
    isWeighed?: boolean;
    unit?: ProductUnit;
    branchId: string;
    reorderLevel?: number;
    shelfLocation?: string;
    initialStock?: number;
  }) {
    if (!data.barcodes || data.barcodes.length === 0) {
      throw new BadRequestException('At least one barcode is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          categoryId: data.categoryId || null,
          costPrice: data.costPrice,
          isWeighed: data.isWeighed || false,
          unit: data.unit || ProductUnit.EACH,
          barcodes: {
            create: data.barcodes.map((b, idx) => ({
              barcode: b.trim(),
              isPrimary: idx === 0,
            })),
          },
          branchProducts: {
            create: {
              branchId: data.branchId,
              sellingPrice: data.sellingPrice,
              reorderLevel: data.reorderLevel || 10,
              shelfLocation: data.shelfLocation || null,
            },
          },
          stocks: {
            create: {
              branchId: data.branchId,
              quantity: data.initialStock || 0,
            },
          },
        },
        include: {
          barcodes: true,
          branchProducts: true,
          stocks: true,
        },
      });

      return product;
    });
  }

  async updateProduct(id: string, branchId: string, data: any, changedByUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check if price is changing to record audit log
      if (data.sellingPrice) {
        const branchProd = await tx.branchProduct.findUnique({
          where: { branchId_productId: { branchId, productId: id } },
        });

        if (branchProd && Number(branchProd.sellingPrice) !== Number(data.sellingPrice)) {
          await tx.priceChangeLog.create({
            data: {
              branchProductId: branchProd.id,
              oldPrice: branchProd.sellingPrice,
              newPrice: data.sellingPrice,
              changedBy: changedByUserId,
              reason: data.priceChangeReason || 'Manager Price Adjustment',
            },
          });

          await tx.branchProduct.update({
            where: { id: branchProd.id },
            data: { sellingPrice: data.sellingPrice },
          });
        }
      }

      // 2. Update master product info
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.costPrice) updateData.costPrice = data.costPrice;
      if (data.categoryId) updateData.categoryId = data.categoryId;

      return tx.product.update({
        where: { id },
        data: updateData,
        include: {
          barcodes: true,
          branchProducts: { where: { branchId } },
          stocks: { where: { branchId } },
        },
      });
    });
  }

  async adjustStock(branchId: string, productId: string, qtyDelta: number, reason: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const currentStock = await tx.stock.findUnique({
        where: { branchId_productId: { branchId, productId } },
      });

      const qtyBefore = currentStock ? Number(currentStock.quantity) : 0;
      const qtyAfter = qtyBefore + qtyDelta;

      const updated = await tx.stock.upsert({
        where: { branchId_productId: { branchId, productId } },
        update: { quantity: { increment: qtyDelta } },
        create: { branchId, productId, quantity: qtyDelta },
      });

      await tx.stockMovement.create({
        data: {
          branchId,
          productId,
          userId,
          type: StockMovementType.ADJUSTMENT,
          qtyChange: qtyDelta,
          qtyBefore,
          qtyAfter,
          reference: `Manual Adjust: ${reason}`,
        },
      });

      return updated;
    });
  }

  async bulkImportCsv(branchId: string, rows: any[]) {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.barcode || !row.sellingPrice) {
          errors.push(`Row ${i + 1}: Missing name, barcode, or sellingPrice`);
          continue;
        }

        await this.createProduct({
          name: row.name,
          costPrice: parseFloat(row.costPrice) || 0,
          sellingPrice: parseFloat(row.sellingPrice),
          barcodes: [row.barcode.toString().trim()],
          branchId,
          reorderLevel: parseInt(row.reorderLevel, 10) || 10,
          initialStock: parseFloat(row.stock) || 0,
        });
        imported++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${row.name || 'Unknown'}): ${err.message}`);
      }
    }

    return { imported, failed: errors.length, errors };
  }
}
