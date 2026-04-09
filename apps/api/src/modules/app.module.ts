import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ScenariosModule } from './scenarios/scenarios.module'
import { ScenarioRunsModule } from './scenario-runs/scenario-runs.module'
import { UnitsModule } from './units/units.module'
import { RealtimeModule } from './realtime/realtime.module'
import { HealthModule } from './health/health.module'
import { ThreatsModule } from './threats/threats.module'
import { MissionsModule } from './missions/missions.module'
import { OrdersModule } from './orders/orders.module'
import { InjectsModule } from './injects/injects.module'
import { LogisticsModule } from './logistics/logistics.module'
import { EventsModule } from './events/events.module'
import { DecisionsModule } from './decisions/decisions.module'
import { AARModule } from './aar/aar.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ScenariosModule,
    ScenarioRunsModule,
    UnitsModule,
    ThreatsModule,
    MissionsModule,
    OrdersModule,
    InjectsModule,
    LogisticsModule,
    EventsModule,
    DecisionsModule,
    AARModule,
    RealtimeModule,
    HealthModule
  ]
})
export class AppModule {}
