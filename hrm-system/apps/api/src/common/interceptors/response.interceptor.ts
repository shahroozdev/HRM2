import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, map } from "rxjs";
import { EnvelopePayload } from "../types/api.types";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body) => {
        if (body && typeof body === "object" && "success" in (body as Record<string, unknown>)) {
          return body;
        }

        if (body && typeof body === "object" && "__envelope" in (body as Record<string, unknown>)) {
          const payload = body as EnvelopePayload;
          return {
            success: true,
            data: payload.data,
            meta: payload.meta,
            message: payload.message ?? "Request successful",
          };
        }

        return {
          success: true,
          data: body,
          message: "Request successful",
        };
      }),
    );
  }
}
