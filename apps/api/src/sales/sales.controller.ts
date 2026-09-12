import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Sales & Shifts')
@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('shift/open')
  @ApiOperation({ summary: 'Open shift at a POS terminal with starting float' })
  openShift(@Request() req: any, @Body() body: { terminalId: string; branchId: string; openingFloat: number }) {
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
  @Post()
  @ApiOperation({ summary: 'Create new completed POS sale (supports offline synchronization)' })
  createSale(@Request() req: any, @Body() body: any) {
    return this.salesService.createSale(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Get('recent')
  @ApiOperation({ summary: 'Get recent sales for branch monitor' })
  getRecentSales(@Query('branchId') branchId: string, @Query('limit') limit?: number) {
    return this.salesService.getRecentSales(branchId, limit ? Number(limit) : 20);
  }
}
