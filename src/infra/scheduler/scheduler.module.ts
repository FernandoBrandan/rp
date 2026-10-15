// src/infra/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [ScheduleModule.forRoot()],
  exports: [ScheduleModule],
})
export class SchedulerModule {}
