import { UserRole } from "./enums";

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export type AuthenticatedUser = JwtPayload;

export type EnvelopePayload<T = unknown> = {
  __envelope: true;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
};
