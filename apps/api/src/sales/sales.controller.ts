import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Sales & Shifts')
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('shift/open')
  @ApiOperation({ summary: 'Open shift at a POS terminal with starting float' })
  openShift(
    @Request() req: any,
    @Body() body: { terminalId: string; branchId: string; openingFloat: number },
  ) {
    return this.salesService.openShift(req.user.id, body.terminalId, body.branchId, body.openingFloat);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('shift/:id/close')
  @ApiOperation({ summary: 'Close shift at terminal and compute cash difference (Z-Report)' })
  closeShift(@Param('id') shiftId: string, @Body() body: { countedCash: number }) {
    return this.salesService.closeShift(shiftId, body.countedCash);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('shift/:id/report')
  @ApiOperation({ summary: 'Generate X-Report / Z-Report shift summary' })
  getShiftReport(@Param('id') shiftId: string) {
    return this.salesService.getShiftReport(shiftId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create new completed POS sale (supports offline synchronization)' })
  createSale(@Request() req: any, @Body() body: any) {
    return this.salesService.createSale(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post(':id/void')
  @ApiOperation({ summary: 'Void a completed sale and automatically restore inventory' })
  voidSale(@Param('id') id: string, @Body() body: { reason: string }, @Request() req: any) {
    return this.salesService.voidSale(id, req.user.id, body.reason);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post(':id/refund')
  @ApiOperation({ summary: 'Refund item(s) from a completed sale and return inventory' })
  refundSale(
    @Param('id') id: string,
    @Body() body: { items: { productId: string; qty: number }[]; reason: string },
    @Request() req: any,
  ) {
    return this.salesService.refundSale(id, req.user.id, body.items, body.reason);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('invoice/:invoiceNo')
  @ApiOperation({ summary: 'Find sale by invoice number for reprint or refund' })
  getSaleByInvoice(@Param('invoiceNo') invoiceNo: string) {
    return this.salesService.getSaleByInvoice(invoiceNo);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('hold')
  @ApiOperation({ summary: 'Hold current customer transaction cart' })
  holdSale(@Request() req: any, @Body() body: { branchId: string; terminalId: string; holdRef: string; cartJson: any }) {
    return this.salesService.holdSale(body.branchId, body.terminalId, req.user.id, body.holdRef, body.cartJson);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('held')
  @ApiOperation({ summary: 'List all currently held sales for this branch' })
  getHeldSales(@Query('branchId') branchId: string) {
    return this.salesService.getHeldSales(branchId);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete('held/:id')
  @ApiOperation({ summary: 'Recall and restore held transaction to active cart' })
  recallHeldSale(@Param('id') id: string) {
    return this.salesService.recallHeldSale(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('recent')
  @ApiOperation({ summary: 'Get recent sales for branch monitor' })
  getRecentSales(@Query('branchId') branchId: string, @Query('limit') limit?: number) {
    return this.salesService.getRecentSales(branchId, limit ? Number(limit) : 20);
  }
}
