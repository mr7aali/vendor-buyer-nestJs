/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let messages: string[] | null = null;

    // ================= PRISMA ERRORS =================
    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        status = HttpStatus.CONFLICT;

        const fields =
          (exception.meta as any)?.driverAdapterError?.cause?.constraint
            ?.fields ?? [];

        message = "Duplicate value";
        messages = fields.map((field: string) => `${field} already exists`);
      } else if (exception.code === "P2003") {
        status = HttpStatus.BAD_REQUEST;

        const constraint = (exception.meta as any)?.driverAdapterError?.cause
          ?.constraint?.index;

        let fields = "reference";

        if (constraint) {
          // Order_customerId_fkey → customerId
          fields = constraint
            .replace(/^.*?_/, "") // remove table prefix
            .replace(/_fkey$/, ""); // remove suffix
        }

        message = "Invalid reference";
        messages = [`${fields} does not exist or is invalid`];
      }
    }

    // ================= HTTP EXCEPTIONS =================
    else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      // String message
      if (typeof responseBody === "string") {
        message = responseBody;
      }

      // Object message (ValidationPipe, custom exceptions)
      else if (typeof responseBody === "object" && responseBody !== null) {
        const res = responseBody as any;

        message = res.message || message;

        if (Array.isArray(res.message)) {
          message = "Validation failed";
          messages = res.message;
        }
      }
    }

    // ================= JS RUNTIME ERRORS =================
    else if (exception instanceof TypeError) {
      status = HttpStatus.BAD_REQUEST;
      message = "Invalid or missing request data";
      messages = [exception.message];
    } else if (exception instanceof ReferenceError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Server configuration error";
    }

    // ================= UNKNOWN ERRORS =================
    else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : "",
    );

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      messages,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      hints: exception,
    };

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : "",
    );

    response.status(status).json(errorResponse);
  }
}
