import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with branch-specific prices and stock' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(@Query('branchId') branchId?: string) {
    return this.productsService.findAll(branchId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Fast barcode lookup for POS scanning (under 50ms)' })
  @ApiQuery({ name: 'branchId', required: false })
  findByBarcode(@Param('barcode') barcode: string, @Query('branchId') branchId?: string) {
    return this.productsService.findByBarcode(barcode, branchId);
  }
}
