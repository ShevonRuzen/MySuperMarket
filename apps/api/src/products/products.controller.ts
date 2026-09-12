import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Products & Stock')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with branch prices, search & category filters' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('branchId') branchId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(branchId, categoryId, search);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Fast barcode lookup for POS scanning' })
  @ApiQuery({ name: 'branchId', required: false })
  findByBarcode(@Param('barcode') barcode: string, @Query('branchId') branchId?: string) {
    return this.productsService.findByBarcode(barcode, branchId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Add new product with barcodes, branch price and stock' })
  createProduct(@Body() body: any) {
    return this.productsService.createProduct(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update product with price change auditing' })
  updateProduct(
    @Param('id') id: string,
    @Query('branchId') branchId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.productsService.updateProduct(id, branchId, body, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post('stock/adjust')
  @ApiOperation({ summary: 'Manual inventory adjustment with mandatory audit reason' })
  adjustStock(
    @Body() body: { branchId: string; productId: string; qtyDelta: number; reason: string },
    @Request() req: any,
  ) {
    return this.productsService.adjustStock(
      body.branchId,
      body.productId,
      body.qtyDelta,
      body.reason,
      req.user.id,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk product CSV import' })
  bulkImport(@Body() body: { branchId: string; rows: any[] }) {
    return this.productsService.bulkImportCsv(body.branchId, body.rows);
  }
}
