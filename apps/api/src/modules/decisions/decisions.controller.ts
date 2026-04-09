import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('decisions')
export class DecisionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.decisionLog.findMany({
      where: { scenarioRunId },
      orderBy: { createdAt: 'asc' }
    })
  }

  @Post()
  create(
    @Body()
    body: {
      scenarioRunId: string
      decisionType: string
      title: string
      description?: string
      impactSummary?: string
      payloadJson?: string
    },
    @Req() req: { user?: { sub: string } }
  ) {
    return this.prisma.decisionLog.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        userId: req.user?.sub ?? 'unknown',
        decisionType: body.decisionType,
        title: body.title,
        description: body.description,
        impactSummary: body.impactSummary,
        payloadJson: body.payloadJson
      }
    })
  }
}

