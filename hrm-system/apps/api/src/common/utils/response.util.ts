import { EnvelopePayload } from "../types/api.types";

export function ok<T>(data: T, message = "Request successful", meta?: Record<string, unknown>): EnvelopePayload<T> {
  return {
    __envelope: true,
    data,
    message,
    meta,
  };
}
