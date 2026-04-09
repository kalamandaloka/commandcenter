import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('threats')
export class ThreatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query('scenarioRunId') scenarioRunId: string) {
    return this.prisma.threat.findMany({
      where: { scenarioRunId },
      orderBy: { createdAt: 'asc' }
    })
  }

  @Post()
  async create(@Body() body: { scenarioRunId: string; name: string; threatType: string; severity?: number; confidence?: number; xCoord: number; yCoord: number }) {
    return this.prisma.threat.create({
      data: {
        scenarioRunId: body.scenarioRunId,
        name: body.name,
        threatType: body.threatType,
        severity: body.severity ?? 3,
        confidence: body.confidence ?? 50,
        xCoord: body.xCoord,
        yCoord: body.yCoord,
        status: 'active'
      }
    })
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string
      threatType: string
      severity: number
      confidence: number
      xCoord: number
      yCoord: number
      status: string | null
      metadataJson: string | null
    }>
  ) {
    return this.prisma.threat.update({
      where: { id },
      data: {
        name: body.name,
        threatType: body.threatType,
        severity: body.severity,
        confidence: body.confidence,
        xCoord: body.xCoord,
        yCoord: body.yCoord,
        status: body.status,
        metadataJson: body.metadataJson
      }
    })
  }
}
