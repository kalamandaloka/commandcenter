import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthGuard } from './auth.guard'

type LoginBody = { email: string; password: string }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginBody) {
    return this.auth.login(body.email, body.password)
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() req: { user?: unknown }) {
    return { user: req.user ?? null }
  }

  @Post('logout')
  logout() {
    return { ok: true }
  }
}
