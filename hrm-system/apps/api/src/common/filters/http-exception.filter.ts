import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "Internal server error";
    let details: unknown = undefined;

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
      errorCode = `HTTP_${status}`;
    } else if (exceptionResponse && typeof exceptionResponse === "object") {
      const payload = exceptionResponse as Record<string, unknown>;
      message = typeof payload.message === "string" ? payload.message : message;
      details = payload.message && Array.isArray(payload.message) ? payload.message : payload;
      errorCode = typeof payload.error === "string" ? payload.error.toUpperCase().replace(/\s+/g, "_") : `HTTP_${status}`;
    }

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      success: false,
      error: {
        code: errorCode,
        message,
        details,
      },
    });
  }
}
