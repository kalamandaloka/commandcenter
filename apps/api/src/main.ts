import 'dotenv/config'
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './modules/app.module'
import { PrismaService } from './modules/prisma/prisma.service'
import * as bcrypt from 'bcryptjs'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: true,
    credentials: true
  })

  const prisma = app.get(PrismaService)
  const passwordHash = await bcrypt.hash('password123', 10)
  const users = [
    { name: 'Commander Demo', email: 'commander@example.local', role: 'commander' },
    { name: 'Flatpanel Display', email: 'flatpanel@example.local', role: 'flatpanel' },
    { name: 'Ops Demo', email: 'ops@example.local', role: 'operations' },
    { name: 'Intel Demo', email: 'intel@example.local', role: 'intelligence' },
    { name: 'Logistics Demo', email: 'log@example.local', role: 'logistics' },
    { name: 'Director Demo', email: 'director@example.local', role: 'director' },
    { name: 'Evaluator Demo', email: 'evaluator@example.local', role: 'evaluator' }
  ]
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { name: user.name, role: user.role, passwordHash, isActive: true }
    })
  }

  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port)
}

bootstrap()
