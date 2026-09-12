import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.isActive && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, pinHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }

  async loginWithPin(terminalId: string, pin: string) {
    const terminal = await this.prisma.terminal.findUnique({
      where: { id: terminalId },
      include: { branch: true },
    });

    if (!terminal) {
      throw new UnauthorizedException('Invalid terminal configuration');
    }

    // Cashiers belonging to this terminal's branch
    const cashiers = await this.prisma.user.findMany({
      where: {
        branchId: terminal.branchId,
        role: 'CASHIER',
        isActive: true,
      },
    });

    let authenticatedCashier: any = null;
    for (const cashier of cashiers) {
      if (cashier.pinHash && (await bcrypt.compare(pin, cashier.pinHash))) {
        authenticatedCashier = cashier;
        break;
      }
    }

    if (!authenticatedCashier) {
      throw new UnauthorizedException('Invalid Cashier PIN');
    }

    const payload = {
      sub: authenticatedCashier.id,
      email: authenticatedCashier.email,
      role: authenticatedCashier.role,
      branchId: authenticatedCashier.branchId,
      terminalId: terminal.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      cashier: {
        id: authenticatedCashier.id,
        name: authenticatedCashier.name,
        role: authenticatedCashier.role,
        branchId: authenticatedCashier.branchId,
        branchName: terminal.branch.name,
        branchCode: terminal.branch.code,
        terminalId: terminal.id,
        terminalName: terminal.name,
      },
    };
  }
}
