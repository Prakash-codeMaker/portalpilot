import { createHash, randomBytes } from "node:crypto";

export const DEMO_DATE = "2026-09-29";
export const DEMO_ACK = "ACK-89218";
export const PRIMARY_APPLICATION_ID = "MH-23881";
export const PRIMARY_QUERY_ID = "Q-291";

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CLARIFICATION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "UNKNOWN";

export type VerificationStatus =
  | "VERIFIED"
  | "FAILED"
  | "UNKNOWN"
  | "CONFLICT"
  | "STALE"
  | "MISSING";

export type RunPhase =
  | "CREATED"
  | "BROWSER"
  | "OBSERVING"
  | "EXTRACTING"
  | "SANDBOX"
  | "VERIFYING"
  | "PREPARING"
  | "WAITING_APPROVAL"
  | "SUBMITTING"
  | "POST_VERIFY"
  | "COMPLETE"
  | "FAILED";

export type ErrorCode =
  | "AUTH_REQUIRED"
  | "PORTAL_UNAVAILABLE"
  | "SESSION_EXPIRED"
  | "PARSER_FAILED"
  | "DOCUMENT_MISSING"
  | "DOCUMENT_EXPIRED"
  | "VERIFICATION_FAILED"
  | "CONFLICT"
  | "STALE"
  | "SUBMISSION_NOT_VERIFIED"
  | "MODEL_OUTPUT_INVALID"
  | "SANDBOX_FAILED"
  | "RESOURCE_CLEANUP_FAILED"
  | "APPROVAL_REQUIRED"
  | "LIVE_MODE_REQUIRES_KEY"
  | "LIVE_PORTAL_URL_REQUIRED";

export const ERROR_COPY: Record<ErrorCode, { title: string; message: string }> = {
  AUTH_REQUIRED: {
    title: "Authentication required",
    message: "The browser profile needs reauthentication.",
  },
  PORTAL_UNAVAILABLE: {
    title: "Portal unavailable",
    message: "Unable to observe application.",
  },
  SESSION_EXPIRED: {
    title: "Session expired",
    message: "The browser session expired before the observation completed.",
  },
  PARSER_FAILED: {
    title: "Parser failed",
    message: "Document text could not be parsed into a structured record.",
  },
  DOCUMENT_MISSING: {
    title: "Document missing",
    message: "Required evidence has not been supplied.",
  },
  DOCUMENT_EXPIRED: {
    title: "Verification failed",
    message: "The supplied certificate is not currently valid for this application.",
  },
  VERIFICATION_FAILED: {
    title: "Verification failed",
    message: "Required evidence could not be verified.",
  },
  CONFLICT: {
    title: "Evidence conflict",
    message: "Two candidate documents contain conflicting values.",
  },
  STALE: {
    title: "Evidence stale",
    message: "Stored evidence no longer matches the current document hash.",
  },
  SUBMISSION_NOT_VERIFIED: {
    title: "Submission unverified",
    message:
      "The portal displayed a successful submission message, but reopening the application showed DRAFT.",
  },
  MODEL_OUTPUT_INVALID: {
    title: "Model output invalid",
    message: "Extracted requirements did not match the expected schema.",
  },
  SANDBOX_FAILED: {
    title: "Sandbox failed",
    message: "Isolated document processing did not complete.",
  },
  RESOURCE_CLEANUP_FAILED: {
    title: "Resource cleanup failed",
    message: "A remote browser or sandbox was not released cleanly.",
  },
  APPROVAL_REQUIRED: {
    title: "Approval required",
    message: "Approval required.",
  },
  LIVE_MODE_REQUIRES_KEY: {
    title: "Live Solari unavailable",
    message: "LIVE SOLARI MODE REQUIRES SOLARI_API_KEY",
  },
  LIVE_PORTAL_URL_REQUIRED: {
    title: "Portal URL required",
    message: "LIVE Solari Browser observation requires PORTALPILOT_PORTAL_URL.",
  },
};

export class PortalPilotError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message?: string,
    opts?: { retryable?: boolean; details?: Record<string, unknown> },
  ) {
    super(message ?? ERROR_COPY[code].message);
    this.name = "PortalPilotError";
    this.code = code;
    this.retryable = opts?.retryable ?? false;
    this.details = opts?.details;
  }
}

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function normalizeIdentity(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function identitiesMatch(a: string, b: string): boolean {
  return normalizeIdentity(a) === normalizeIdentity(b);
}

export function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    return parsed;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function compareDates(a: string, b: string): number {
  return parseIsoDate(a).getTime() - parseIsoDate(b).getTime();
}

export function isExpired(expiry: string, current: string): boolean {
  return compareDates(expiry, current) < 0;
}

export function isCurrent(expiry: string, current: string): boolean {
  return compareDates(expiry, current) >= 0;
}

export function formatDisplayDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = parseIsoDate(iso);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDisplayDateTime(iso: Date | string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export function formatClock(iso: Date | string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export function daysUntil(deadline: string, current: string): number {
  const ms = parseIsoDate(deadline).getTime() - parseIsoDate(current).getTime();
  return Math.ceil(ms / 86_400_000);
}

export function statusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SUBMITTED":
      return "Submitted";
    case "UNDER_REVIEW":
      return "Under Review";
    case "CLARIFICATION_REQUIRED":
      return "Clarification Required";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "UNKNOWN":
      return "Unknown";
    case "VERIFIED":
      return "Verified";
    case "FAILED":
      return "Failed";
    case "CONFLICT":
      return "Conflict";
    case "STALE":
      return "Stale";
    case "MISSING":
      return "Missing";
    case "WAITING_APPROVAL":
      return "Waiting Approval";
    case "COMPLETE":
      return "Complete";
    case "SUBMISSION_UNVERIFIED":
    case "SUBMISSION_NOT_VERIFIED":
      return "Submission Unverified";
    case "BLOCKED":
      return "Blocked";
    case "READY_FOR_APPROVAL":
      return "Ready for human review";
    default:
      return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
}

const SECRET_KEYS = ["apikey", "api_key", "authorization", "cookie", "password", "token", "secret", "otp"];

export function scrub(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/slr_live_[A-Za-z0-9_]+/g, "slr_live_[redacted]");
  }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.some((s) => k.toLowerCase().includes(s))) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrub(v);
      }
    }
    return out;
  }
  return value;
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", event, ...((scrub(data) as object) ?? {}) }));
}

export function logError(event: string, data?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", event, ...((scrub(data) as object) ?? {}) }));
}

export type ExecutionMode = "DEMO" | "LIVE";

export function readSolariApiKey(): string | undefined {
  const key = process.env.SOLARI_API_KEY?.trim();
  return key ? key : undefined;
}

export function readSolariBaseUrl(): string {
  return process.env.SOLARI_BASE_URL?.trim() || "https://api.getsolari.com";
}

export function isLiveConfigured(): boolean {
  return Boolean(readSolariApiKey());
}

export function retryPolicy(code: ErrorCode): { retry: boolean; maxAttempts: number } {
  switch (code) {
    case "PORTAL_UNAVAILABLE":
    case "SANDBOX_FAILED":
      return { retry: true, maxAttempts: 3 };
    case "AUTH_REQUIRED":
    case "SESSION_EXPIRED":
    case "DOCUMENT_EXPIRED":
    case "DOCUMENT_MISSING":
    case "CONFLICT":
    case "STALE":
    case "MODEL_OUTPUT_INVALID":
    case "SUBMISSION_NOT_VERIFIED":
    case "APPROVAL_REQUIRED":
    case "VERIFICATION_FAILED":
    case "LIVE_MODE_REQUIRES_KEY":
      return { retry: false, maxAttempts: 0 };
    default:
      return { retry: false, maxAttempts: 0 };
  }
}

export function sanitizeUntrustedText(value: string, maxLength = 20_000): string {
  return value
    .slice(0, maxLength)
    .replace(/\u0000/g, "")
    .replace(/<\/?(?:system|developer|assistant|tool)[^>]*>/gi, "")
    .trim();
}

export function safeFilename(value: string): string {
  const normalized = value.replace(/\\/g, "/").split("/").pop() ?? "document";
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "document";
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const [a, b] = ipv4.slice(1).map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169 && b === 254;
}

export function validatePortalUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PortalPilotError("LIVE_PORTAL_URL_REQUIRED", "Portal URL is not valid.");
  }
  if (!(url.protocol === "https:" || url.protocol === "http:")) {
    throw new PortalPilotError("LIVE_PORTAL_URL_REQUIRED", "Portal URL must use HTTP or HTTPS.");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new PortalPilotError("LIVE_PORTAL_URL_REQUIRED", "Private/internal portal targets are blocked.");
  }
  return url;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
