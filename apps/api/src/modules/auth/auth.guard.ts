import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: unknown }>()
    const raw = request.headers.authorization
    const header = Array.isArray(raw) ? raw[0] : raw
    if (!header || !header.toLowerCase().startsWith('bearer ')) throw new UnauthorizedException('Missing bearer token')
    const token = header.slice(7).trim()
    try {
      const decoded = this.auth.verifyToken(token)
      request.user = decoded
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }
}

