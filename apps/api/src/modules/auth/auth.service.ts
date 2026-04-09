import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'

type TokenPayload = { sub: string; role: string; email: string }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    const secret = process.env.JWT_SECRET ?? 'dev_secret_change_me'
    const payload: TokenPayload = { sub: user.id, role: user.role, email: user.email }
    const token = jwt.sign(payload, secret, { expiresIn: '8h' })

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  }

  verifyToken(token: string) {
    const secret = process.env.JWT_SECRET ?? 'dev_secret_change_me'
    const decoded = jwt.verify(token, secret) as TokenPayload
    return decoded
  }
}
