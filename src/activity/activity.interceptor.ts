import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { catchError, tap } from "rxjs/operators";
import { throwError } from "rxjs";
import { ActivityService } from "./activity.service";
import { LOG_ACTIVITY_KEY } from "./activity.decorator";
import { ActorType } from "./activity.types";

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private activityService: ActivityService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const meta = this.reflector.get(LOG_ACTIVITY_KEY, context.getHandler());

    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      // ✅ success
      tap((result) => {
        this.activityService.logAsync({
          type: meta.successType,
          title: meta.title,
          description: meta.successMessage(result, req),
          entity: meta.entity,
          entityId: result?.id,
          actorType: ActorType.USER,
          actorName: req.user?.name,
        });
      }),

      // ❌ failure
      catchError((error) => {
        this.activityService.logAsync({
          type: meta.failureType ?? meta.successType,
          title: meta.title,
          description: meta.failureMessage
            ? meta.failureMessage(error, req)
            : error.message,
          entity: meta.entity,
          actorType: ActorType.USER,
          actorName: req.user?.name,
        });

        return throwError(() => error);
      }),
    );
  }
}
