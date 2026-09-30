import { describe, expect, it } from "vitest";
import { formatDisplayDate, shortHash, daysUntil } from "@/lib/format";
import { ERROR_COPY, statusLabel } from "@/lib/core";

describe("product language", () => {
  it("uses operational copy rather than AI magic", () => {
    expect(statusLabel("CLARIFICATION_REQUIRED")).toBe("Clarification Required");
    expect(statusLabel("SUBMISSION_UNVERIFIED")).toBe("Submission Unverified");
    expect(ERROR_COPY.SUBMISSION_NOT_VERIFIED.title).toBe("Submission unverified");
    expect(ERROR_COPY.DOCUMENT_EXPIRED.title).toBe("Verification failed");
    expect(ERROR_COPY.APPROVAL_REQUIRED.message).toBe("Approval required.");
  });

  it("formats operational dates", () => {
    expect(formatDisplayDate("2026-10-10")).toBe("10 Oct 2026");
    expect(daysUntil("2026-10-10", "2026-09-29")).toBe(11);
    expect(shortHash("b04efc91a")).toBe("b04efc…91a");
  });
});
