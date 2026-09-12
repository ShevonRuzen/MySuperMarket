import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with Email & Password (Owner, Manager, Staff)' })
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.authService.login(user);
  }

  @Post('pos/pin-login')
  @ApiOperation({ summary: 'Login Cashier via Numeric Keypad PIN at POS Terminal' })
  async pinLogin(@Body() body: { terminalId: string; pin: string }) {
    return this.authService.loginWithPin(body.terminalId, body.pin);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getProfile(@Request() req: any) {
    return req.user;
  }
}
