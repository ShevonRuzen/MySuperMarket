import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(branchId?: string) {
    return this.prisma.product.findMany({
      where: { isActive: true },
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
}
