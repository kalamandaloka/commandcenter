import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.order.findMany({
      where: { scenarioRunId },
      orderBy: [{ createdAt: 'desc' }],
      include: { mission: true, targetUnit: true, issuedBy: true }
    })
  }

  @Post()
  create(
    @Body()
    body: {
      scenarioRunId: string
      missionId?: string
      targetUnitId?: string
      orderType: string
      priority?: number
      detailsJson?: string
    },
    @Req() req: { user?: { sub: string } }
  ) {
    return this.prisma.order.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        missionId: body.missionId,
        targetUnitId: body.targetUnitId,
        orderType: body.orderType,
        priority: body.priority ?? 3,
        detailsJson: body.detailsJson,
        issuedByUserId: req.user?.sub,
        issuedAt: new Date(),
        approvalStatus: 'draft',
        executionStatus: 'not_started'
      }
    })
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { approvalStatus: 'approved', approvedAt: new Date() }
    })
  }

  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.prisma.order.update({
      where: { id },
      data: { approvalStatus: 'rejected', approvedAt: new Date() }
    })
  }

  @Post(':id/execute')
  async execute(@Param('id') id: string) {
    const updated = await this.prisma.order.update({
      where: { id },
      data: { executionStatus: 'executing', executedAt: new Date() }
    })
    return updated
  }
}

