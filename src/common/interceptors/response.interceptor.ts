/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response?.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        // If controller already returns formatted response, skip
        if (data?.success !== undefined) {
          return data;
        }

        return {
          success: true,
          statusCode,
          message: this.getSuccessMessage(statusCode),
          data,
        };
      }),
    );
  }

  private getSuccessMessage(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return "Created successfully";
      case 200:
        return "Success";
      default:
        return "Request successful";
    }
  }
}
