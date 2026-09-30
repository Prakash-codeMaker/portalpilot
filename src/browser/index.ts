import {
  DEMO_ACK,
  PortalPilotError,
  readSolariApiKey,
  readSolariBaseUrl,
} from "@/lib/core";
import { db } from "@/db";
import { portalApplications } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface PortalObservation {
  applicationId: string;
  status: string;
  deadline?: string;
  queryPresent: boolean;
  queryId?: string;
  queryText?: string;
  observedAt: string;
  acknowledgement?: string | null;
  successMessage?: boolean;
  lastMessage?: string | null;
}

export interface PortalQuery {
  queryId: string;
  queryText: string;
}

export interface PreparedCase {
  applicationId: string;
  responseText: string;
  documentNames: string[];
}

export interface SubmissionAttempt {
  displayedSuccess: boolean;
  message: string;
  acknowledgement?: string | null;
}

export interface PostconditionResult {
  applicationId: string;
  status: string;
  acknowledgement?: string | null;
  displayedSuccess: boolean;
  lastMessage?: string | null;
  observedAt: string;
}

export interface PortalBrowser {
  readonly sessionId: string | null;
  readonly replayUrl?: string | null;

  start(): Promise<void>;
  observeApplication(applicationId: string): Promise<PortalObservation>;
  readQuery(applicationId: string): Promise<PortalQuery | null>;
  submit(preparedCase: PreparedCase): Promise<SubmissionAttempt>;
  verifySubmission(applicationId: string): Promise<PostconditionResult>;
  close(): Promise<void>;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class DemoPortalBrowser implements PortalBrowser {
  sessionId: string | null = null;
  replayUrl: string | null = null;

  async start(): Promise<void> {
    this.sessionId = `sess_demo_${Math.random().toString(16).slice(2, 10)}`;
  }

  private async load(applicationId: string) {
    const [row] = await db
      .select()
      .from(portalApplications)
      .where(eq(portalApplications.id, applicationId))
      .limit(1);

    if (!row) {
      throw new PortalPilotError(
        "PORTAL_UNAVAILABLE",
        "Unable to observe application.",
      );
    }

    return row;
  }

  async observeApplication(
    applicationId: string,
  ): Promise<PortalObservation> {
    const row = await this.load(applicationId);

    return {
      applicationId,
      status: row.status,
      deadline: row.deadline ?? undefined,
      queryPresent: Boolean(row.queryId),
      queryId: row.queryId ?? undefined,
      queryText: row.queryText ?? undefined,
      observedAt: nowIso(),
      acknowledgement: row.acknowledgement,
      successMessage: row.successMessage,
      lastMessage: row.lastMessage,
    };
  }

  async readQuery(applicationId: string): Promise<PortalQuery | null> {
    const row = await this.load(applicationId);

    if (!row.queryId || !row.queryText) {
      return null;
    }

    return {
      queryId: row.queryId,
      queryText: row.queryText,
    };
  }

  async submit(preparedCase: PreparedCase): Promise<SubmissionAttempt> {
    const row = await this.load(preparedCase.applicationId);

    if (row.falseSuccess) {
      await db
        .update(portalApplications)
        .set({
          successMessage: true,
          lastMessage: "Application submitted successfully",
          submittedResponse: preparedCase.responseText,
          status: "DRAFT",
          acknowledgement: null,
          updatedAt: new Date(),
        })
        .where(eq(portalApplications.id, preparedCase.applicationId));

      return {
        displayedSuccess: true,
        message: "Application submitted successfully",
        acknowledgement: null,
      };
    }

    await db
      .update(portalApplications)
      .set({
        status: "SUBMITTED",
        acknowledgement: DEMO_ACK,
        successMessage: true,
        lastMessage: "Application submitted successfully",
        submittedResponse: preparedCase.responseText,
        queryId: null,
        queryText: null,
        updatedAt: new Date(),
      })
      .where(eq(portalApplications.id, preparedCase.applicationId));

    return {
      displayedSuccess: true,
      message: "Application submitted successfully",
      acknowledgement: DEMO_ACK,
    };
  }

  async verifySubmission(
    applicationId: string,
  ): Promise<PostconditionResult> {
    const row = await this.load(applicationId);

    return {
      applicationId,
      status: row.status,
      acknowledgement: row.acknowledgement,
      displayedSuccess: row.successMessage,
      lastMessage: row.lastMessage,
      observedAt: nowIso(),
    };
  }

  async close(): Promise<void> {
    this.sessionId = null;
  }
}

export class LiveSolariBrowser implements PortalBrowser {
  sessionId: string | null = null;
  replayUrl: string | null = null;

  private client: {
    close: () => Promise<void>;
    sessions: {
      getReplayUrl: (id: string) => Promise<{ url: string }>;
    };
  } | null = null;

  private browser: {
    id: string;
    close: () => Promise<void>;
    newPage: () => Promise<{
      goto: (
        url: string,
        opts?: {
          waitUntil?:
            | "load"
            | "domcontentloaded"
            | "networkidle"
            | "commit";
        },
      ) => Promise<unknown>;
      waitForLoadState?: (
        state?: "load" | "domcontentloaded" | "networkidle",
      ) => Promise<void>;
      locator: (sel: string) => {
        fill: (v: string) => Promise<void>;
        click: () => Promise<void>;
        innerText: () => Promise<string>;
        getAttribute: (name: string) => Promise<string | null>;
        count: () => Promise<number>;
      };
    }>;
  } | null = null;

  private closed = false;

  async start(): Promise<void> {
    const apiKey = readSolariApiKey();

    if (!apiKey) {
      throw new PortalPilotError("LIVE_MODE_REQUIRES_KEY");
    }

    const { Solari } = await import("@solarisdk/browser");

    const client = new Solari({
      apiKey,
      baseUrl: readSolariBaseUrl(),
    });

    this.client = client;

    const profileId =
      process.env.SOLARI_PROFILE_ID?.trim() || undefined;

    const browser = await client.launch({
      stealth: process.env.SOLARI_STEALTH === "true",
      recording: true,
      retries: 2,
      probe: true,
      ...(profileId ? { profileId } : {}),
    });

    this.browser = browser;
    this.sessionId = browser.id;
  }

  private portalUrl(applicationId: string): string {
    const base = process.env.PORTALPILOT_PORTAL_URL?.trim();

    if (!base) {
      throw new PortalPilotError("LIVE_PORTAL_URL_REQUIRED");
    }

    const url = new URL(base);

    url.pathname = `${
      url.pathname.replace(/\/$/, "")
    }/portal/application/${encodeURIComponent(applicationId)}`;

    return url.toString();
  }

  private async readOptional(
    locator: {
      innerText: () => Promise<string>;
      count: () => Promise<number>;
    },
  ): Promise<string | undefined> {
    try {
      if ((await locator.count()) === 0) {
        return undefined;
      }

      const value = (await locator.innerText()).trim();

      return value || undefined;
    } catch {
      return undefined;
    }
  }

  private async readOptionalAttribute(
    locator: {
      getAttribute: (name: string) => Promise<string | null>;
      count: () => Promise<number>;
    },
    attribute: string,
  ): Promise<string | null> {
    try {
      if ((await locator.count()) === 0) {
        return null;
      }

      return (await locator.getAttribute(attribute)) || null;
    } catch {
      return null;
    }
  }

  async observeApplication(
    applicationId: string,
  ): Promise<PortalObservation> {
    if (!this.browser) {
      throw new PortalPilotError("SESSION_EXPIRED");
    }

    const page = await this.browser.newPage();

    await page.goto(this.portalUrl(applicationId), {
      waitUntil: "networkidle",
    });

    const status =
      (await page
        .locator('[data-testid="application-status"]')
        .getAttribute("data-status")) ?? "UNKNOWN";

    const deadline =
      (await page
        .locator('[data-testid="application-deadline"]')
        .getAttribute("data-deadline")) || undefined;

    const queryId =
      (await page
        .locator('[data-testid="application-query-id"]')
        .getAttribute("data-query-id")) || undefined;

    const queryText = await this.readOptional(
      page.locator('[data-testid="application-query-text"]'),
    );

    const acknowledgement =
      await this.readOptionalAttribute(
        page.locator('[data-testid="application-ack"]'),
        "data-ack",
      );

    const successRaw =
      await this.readOptionalAttribute(
        page.locator('[data-testid="application-success"]'),
        "data-success",
      );

    const successMessage = successRaw === "true";

    const lastMessage =
      (await this.readOptional(
        page.locator('[data-testid="application-last-message"]'),
      )) ?? null;

    return {
      applicationId,
      status,
      deadline,
      queryPresent: Boolean(queryId),
      queryId,
      queryText,
      observedAt: nowIso(),
      acknowledgement,
      successMessage,
      lastMessage,
    };
  }

  async readQuery(applicationId: string): Promise<PortalQuery | null> {
    const obs = await this.observeApplication(applicationId);

    if (!obs.queryId || !obs.queryText) {
      return null;
    }

    return {
      queryId: obs.queryId,
      queryText: obs.queryText,
    };
  }

  async submit(
    preparedCase: PreparedCase,
  ): Promise<SubmissionAttempt> {
    if (!this.browser) {
      throw new PortalPilotError("SESSION_EXPIRED");
    }

    const page = await this.browser.newPage();

    const url = new URL(
      this.portalUrl(preparedCase.applicationId),
    );

    url.pathname = `${
      url.pathname.replace(/\/$/, "")
    }/query`;

    await page.goto(url.toString(), {
      waitUntil: "networkidle",
    });

    await page
      .locator('textarea[name="response"]')
      .fill(preparedCase.responseText);

    const documents = preparedCase.documentNames.join("\n");

    const docField = page.locator(
      'textarea[name="documents"]',
    );

    if ((await docField.count()) > 0) {
      await docField.fill(documents);
    }

    const submitButton = page.locator(
      'button[type="submit"]',
    );

    if ((await submitButton.count()) === 0) {
      throw new PortalPilotError(
        "PORTAL_UNAVAILABLE",
        "Submission control was not found on the portal.",
        { retryable: false },
      );
    }

    await submitButton.click();

    if (page.waitForLoadState) {
      await page
        .waitForLoadState("networkidle")
        .catch(() => undefined);
    }

    const text = await page
      .locator("body")
      .innerText();

    const displayedSuccess =
      /submitted successfully/i.test(text);

    const acknowledgement =
      (await this.readOptional(
        page.locator(
          '[data-testid="submission-ack"]',
        ),
      )) ?? null;

    return {
      displayedSuccess,
      message: displayedSuccess
        ? "Application submitted successfully"
        : text.slice(0, 280),
      acknowledgement,
    };
  }

  async verifySubmission(
    applicationId: string,
  ): Promise<PostconditionResult> {
    const obs = await this.observeApplication(
      applicationId,
    );

    return {
      applicationId,
      status: obs.status,
      acknowledgement:
        obs.acknowledgement ?? null,
      displayedSuccess:
        Boolean(obs.successMessage),
      lastMessage:
        obs.lastMessage ?? null,
      observedAt: obs.observedAt,
    };
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;

    try {
      if (this.browser) {
        await this.browser.close();
      }
    } finally {
      if (this.sessionId && this.client) {
        try {
          this.replayUrl =
            (
              await this.client.sessions.getReplayUrl(
                this.sessionId,
              )
            ).url;
        } catch {
          this.replayUrl = null;
        }
      }

      if (this.client) {
        await this.client.close();
      }
    }

    this.sessionId = null;
  }
}

export function createPortalBrowser(
  mode: "DEMO" | "LIVE",
): PortalBrowser {
  if (mode === "LIVE") {
    return new LiveSolariBrowser();
  }

  return new DemoPortalBrowser();
}