export type PortalCapability =
  | "OBSERVE"
  | "QUERY_READ"
  | "DOCUMENT_DOWNLOAD"
  | "DOCUMENT_UPLOAD"
  | "SUBMIT"
  | "RENEWAL"
  | "GUI_REQUIRED";

export type ConnectorHealth = "HEALTHY" | "DEGRADED" | "AUTH_REQUIRED" | "UNAVAILABLE";

export interface PortalConnector {
  readonly id: string;
  readonly name: string;
  readonly capabilities: PortalCapability[];
  health(): Promise<{ status: ConnectorHealth; checkedAt: string; detail?: string }>;
}

export class RegistryConnector implements PortalConnector {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly capabilities: PortalCapability[],
    private readonly baseUrl: string,
  ) {}

  async health() {
    return {
      status: "HEALTHY" as const,
      checkedAt: new Date().toISOString(),
      detail: `${this.name} registered at ${this.baseUrl}`,
    };
  }
}
