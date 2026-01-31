import { SetMetadata } from "@nestjs/common";
import { ActivityType } from "./activity.types";

export const LOG_ACTIVITY_KEY = "LOG_ACTIVITY";

export const LogActivity = (data: {
  successType: ActivityType;
  failureType?: ActivityType;
  title: string;
  entity?: string;
  successMessage: (result: any, req: any) => string;
  failureMessage?: (error: any, req: any) => string;
}) => SetMetadata(LOG_ACTIVITY_KEY, data);
