import { PortalPilotError, readSolariApiKey, readSolariBaseUrl, sha256 } from "@/lib/core";
import type { ParsedDocument } from "@/verifier";

export function parseDocumentContent(name: string, content: string): ParsedDocument {
  const fields: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0 && idx < 40) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      if (key && value && !key.includes(" ")) {
        fields[key] = value;
      }
    }
  }
  const type = (fields.type ?? "UNKNOWN").toUpperCase().replace(/\s+/g, "_");
  return {
    name,
    type,
    entity: fields.entity,
    site: fields.site,
    issuedAt: fields.issued || fields.issuedat,
    expiresAt: fields.expires || fields.expiresat || fields.expiry,
    certificateId: fields.certificate || fields.certificateid,
    page: fields.page ? Number(fields.page) : 1,
    quote: fields.quote,
    content,
    sha256: sha256(content),
  };
}

export interface SandboxWorkItem {
  name: string;
  content: string;
}

export interface SandboxProcessResult {
  sandboxId: string;
  documents: ParsedDocument[];
  provider: "DEMO" | "LIVE";
  metrics?: { cpuPct: number; memBytes: number; memTotalBytes: number; diskBytes: number };
  snapshotId?: string;
}

export interface DocumentSandbox {
  process(documents: SandboxWorkItem[]): Promise<SandboxProcessResult>;
  destroy(): Promise<void>;
  readonly id: string | null;
}

export class DemoDocumentSandbox implements DocumentSandbox {
  id: string | null = null;

  async process(documents: SandboxWorkItem[]): Promise<SandboxProcessResult> {
    this.id = `sbx_demo_${sha256(documents.map((d) => d.name).join("|")).slice(0, 10)}`;
    return {
      sandboxId: this.id,
      provider: "DEMO",
      documents: documents.map((d) => parseDocumentContent(d.name, d.content)),
    };
  }

  async destroy(): Promise<void> {
    this.id = null;
  }
}

function pythonParserScript(): string {
  return `import json, hashlib, os, sys
root = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ppdocs"
out = []
for name in sorted(os.listdir(root)):
    path = os.path.join(root, name)
    if not os.path.isfile(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    fields = {}
    for line in content.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            k = k.strip().lower()
            v = v.strip()
            if k and v and " " not in k:
                fields[k] = v
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    out.append({
        "name": name,
        "type": fields.get("type", "UNKNOWN").upper().replace(" ", "_"),
        "entity": fields.get("entity"),
        "site": fields.get("site"),
        "issuedAt": fields.get("issued") or fields.get("issuedat"),
        "expiresAt": fields.get("expires") or fields.get("expiresat") or fields.get("expiry"),
        "certificateId": fields.get("certificate") or fields.get("certificateid"),
        "page": int(fields["page"]) if fields.get("page") else 1,
        "quote": fields.get("quote"),
        "content": content,
        "sha256": digest,
    })
print(json.dumps(out))
`;
}

export class LiveSolariSandbox implements DocumentSandbox {
  id: string | null = null;
  private killed = false;
  private handle: {
    id: string;
    connect?: () => Promise<void>;
    kill: () => Promise<void>;
    files: { write: (p: string, d: string) => Promise<void> };
    commands: { run: (cmd: string, opts?: { args?: string[] }) => Promise<{ exitCode: number; stdout: string; stderr: string }> };
    metrics?: () => Promise<{ cpuPct: number; memBytes: number; memTotalBytes: number; diskBytes: number }>;
    snapshot?: (name?: string) => Promise<string>;
  } | null = null;

  async process(documents: SandboxWorkItem[]): Promise<SandboxProcessResult> {
    const apiKey = readSolariApiKey();
    if (!apiKey) {
      throw new PortalPilotError("LIVE_MODE_REQUIRES_KEY");
    }
    const { SandboxClient } = await import("@solarisdk/sandbox");
    const client = new SandboxClient({ apiKey, baseUrl: readSolariBaseUrl() });
    const sbx = await client.create({
      template: "base",
      metadata: { product: "portalpilot", purpose: "evidence-verification" },
    });
    this.handle = sbx;
    this.id = sbx.id;
    try {
      if (sbx.connect) await sbx.connect();
      await sbx.files.write("/tmp/ppdocs/.keep", "1");
      for (const doc of documents) {
        const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        await sbx.files.write(`/tmp/ppdocs/${safeName}`, doc.content);
      }
      await sbx.files.write("/tmp/parse_docs.py", pythonParserScript());
      const result = await sbx.commands.run("python3", { args: ["/tmp/parse_docs.py", "/tmp/ppdocs"] });
      if (result.exitCode !== 0) {
        throw new PortalPilotError("SANDBOX_FAILED", result.stderr || "python3 parser exited non-zero");
      }
      const parsed = JSON.parse(result.stdout) as ParsedDocument[];
      const metrics = sbx.metrics ? await sbx.metrics().catch(() => undefined) : undefined;
      const snapshotId = sbx.snapshot ? await sbx.snapshot("documents-verified").catch(() => undefined) : undefined;
      return { sandboxId: sbx.id, provider: "LIVE", documents: parsed, metrics, snapshotId };
    } catch (error) {
      if (error instanceof PortalPilotError) throw error;
      throw new PortalPilotError("SANDBOX_FAILED", error instanceof Error ? error.message : "Sandbox failed");
    }
  }

  async destroy(): Promise<void> {
    if (this.killed) return;
    this.killed = true;
    if (this.handle) {
      await this.handle.kill();
    }
  }
}

export function createDocumentSandbox(mode: "DEMO" | "LIVE"): DocumentSandbox {
  if (mode === "LIVE") return new LiveSolariSandbox();
  return new DemoDocumentSandbox();
}
