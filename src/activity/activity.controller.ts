import { Controller, Get, Query } from "@nestjs/common";
import { ActivityService } from "./activity.service";

@Controller("activities")
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get("recent")
  getRecent(@Query("limit") limit?: string) {
    return this.activityService.getRecent(Number(limit) || 10);
  }
}
