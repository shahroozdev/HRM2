import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export type EncryptedPayload = {
  iv: string;
  tag: string;
  content: string;
};

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptJson<T>(value: T, secret: string): EncryptedPayload {
  const iv = randomBytes(12);
  const key = keyFromSecret(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const content = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    content: content.toString("base64"),
  };
}

export function decryptJson<T>(payload: EncryptedPayload, secret: string): T {
  const key = keyFromSecret(secret);
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const content = Buffer.from(payload.content, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(content), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext) as T;
}

export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}
