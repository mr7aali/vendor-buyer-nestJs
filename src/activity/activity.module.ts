import { Module } from "@nestjs/common";
import { ActivityService } from "./activity.service";
import { ActivityController } from "./activity.controller";
import { ActivityInterceptor } from "./activity.interceptor";

@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityInterceptor],
  exports: [ActivityService],
})
export class ActivityModule {}
