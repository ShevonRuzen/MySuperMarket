import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Stock Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private transfersService: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'List all stock transfers (optionally filter by branchId)' })
  findAll(@Query('branchId') branchId?: string) {
    return this.transfersService.findAll(branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get stock transfer detail by ID' })
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK)
  @ApiBearerAuth()
  @Post('request')
  @ApiOperation({ summary: 'Create a new inter-branch stock transfer request' })
  requestTransfer(@Body() body: any, @Request() req: any) {
    return this.transfersService.requestTransfer({ ...body, requestedBy: req.user.id });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve transfer request — deducts stock from source, marks IN_TRANSIT' })
  approveTransfer(@Param('id') id: string, @Request() req: any) {
    return this.transfersService.approveTransfer(id, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STOCK)
  @ApiBearerAuth()
  @Post(':id/receive')
  @ApiOperation({ summary: 'Mark transfer as received — adds stock to destination branch' })
  receiveTransfer(
    @Param('id') id: string,
    @Body() body: { receivedItems: { productId: string; confirmedQty: number }[] },
    @Request() req: any,
  ) {
    return this.transfersService.receiveTransfer(id, body.receivedItems, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending transfer request' })
  rejectTransfer(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.transfersService.rejectTransfer(id, req.user.id, body.reason);
  }
}
