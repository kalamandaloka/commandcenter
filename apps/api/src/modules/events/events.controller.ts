import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.eventLog.findMany({
      where: { scenarioRunId },
      orderBy: { occurredAt: 'asc' }
    })
  }
}

