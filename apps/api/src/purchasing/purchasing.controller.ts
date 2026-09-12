import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Purchasing & GRN')
@Controller('purchasing')
export class PurchasingController {
  constructor(private purchasingService: PurchasingService) {}

  @Get()
  @ApiOperation({ summary: 'List all Purchase Orders' })
  findAll(@Query('branchId') branchId?: string) {
    return this.purchasingService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Purchase Order detail by ID' })
  findOne(@Param('id') id: string) {
    return this.purchasingService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post('po')
  @ApiOperation({ summary: 'Create new Purchase Order to a supplier' })
  createPO(@Body() body: any) {
    return this.purchasingService.createPO(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK)
  @ApiBearerAuth()
  @Post('grn/:id')
  @ApiOperation({ summary: 'Receive items against PO (Goods Received Note), update stock' })
  processGRN(
    @Param('id') poId: string,
    @Body() body: { receivedItems: { productId: string; receivedQty: number }[] },
    @Request() req: any,
  ) {
    return this.purchasingService.processGRN(poId, body.receivedItems, req.user.id);
  }
}
