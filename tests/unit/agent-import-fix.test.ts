import { describe, expect, it } from "vitest";
import { PortalPilotError } from "@/lib/core";

describe("error model", () => {
  it("does not retry postcondition failure", async () => {
    const { retryPolicy } = await import("@/lib/core");
    expect(retryPolicy("SUBMISSION_NOT_VERIFIED").retry).toBe(false);
    expect(retryPolicy("APPROVAL_REQUIRED").retry).toBe(false);
    expect(retryPolicy("DOCUMENT_EXPIRED").retry).toBe(false);
    expect(retryPolicy("PORTAL_UNAVAILABLE").retry).toBe(true);
    const err = new PortalPilotError("LIVE_MODE_REQUIRES_KEY");
    expect(err.message).toBe("LIVE SOLARI MODE REQUIRES SOLARI_API_KEY");
  });
});
