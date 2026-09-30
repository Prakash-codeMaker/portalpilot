export interface DocumentFixture {
  name: string;
  type: string;
  entity: string;
  site: string;
  issuedAt?: string;
  expiresAt?: string;
  certificateId?: string;
  content: string;
}

function envelope(fields: Record<string, string>, body: string): string {
  const header = Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return `PORTALPILOT-DOCUMENT\n${header}\n---\n${body}\n`;
}

export const FACTORY_LAYOUT: DocumentFixture = {
  name: "factory-layout.pdf",
  type: "FACTORY_LAYOUT",
  entity: "Apex Manufacturing",
  site: "Pune Plant",
  issuedAt: "2026-09-12",
  content: envelope(
    {
      type: "FACTORY_LAYOUT",
      title: "Updated Factory Layout",
      entity: "Apex Manufacturing",
      site: "Pune Plant",
      issued: "2026-09-12",
      version: "v4",
      page: "1",
    },
    "This drawing is the updated factory layout for Apex Manufacturing, Pune Plant, prepared 12 September 2026. Expansion bay B is marked for the proposed production line.",
  ),
};

export const FIRE_CERTIFICATE_OLD: DocumentFixture = {
  name: "fire-certificate-old.pdf",
  type: "FIRE_SAFETY_CERTIFICATE",
  entity: "Apex Manufacturing",
  site: "Pune Plant",
  issuedAt: "2025-09-01",
  expiresAt: "2026-08-30",
  certificateId: "FS-11092",
  content: envelope(
    {
      type: "FIRE_SAFETY_CERTIFICATE",
      title: "Fire Safety Certificate",
      entity: "Apex Manufacturing",
      site: "Pune Plant",
      certificate: "FS-11092",
      issued: "2025-09-01",
      expires: "2026-08-30",
      page: "1",
      quote: "This certificate is valid until 30 August 2026.",
    },
    "Fire Safety Certificate FS-11092 issued to Apex Manufacturing for Pune Plant. This certificate is valid until 30 August 2026.",
  ),
};

export const FIRE_CERTIFICATE_NEW: DocumentFixture = {
  name: "fire-certificate-new.pdf",
  type: "FIRE_SAFETY_CERTIFICATE",
  entity: "Apex Manufacturing",
  site: "Pune Plant",
  issuedAt: "2026-09-01",
  expiresAt: "2027-08-31",
  certificateId: "FS-29182",
  content: envelope(
    {
      type: "FIRE_SAFETY_CERTIFICATE",
      title: "Fire Safety Certificate",
      entity: "Apex Manufacturing",
      site: "Pune Plant",
      certificate: "FS-29182",
      issued: "2026-09-01",
      expires: "2027-08-31",
      page: "1",
      quote: "This certificate is valid until 31 August 2027.",
    },
    "Fire Safety Certificate FS-29182 issued to Apex Manufacturing for Pune Plant on 01 September 2026. This certificate is valid until 31 August 2027.",
  ),
};

export const POLLUTION_CONSENT: DocumentFixture = {
  name: "pollution-consent.pdf",
  type: "POLLUTION_CONSENT",
  entity: "Apex Manufacturing",
  site: "Pune Plant",
  issuedAt: "2026-01-15",
  expiresAt: "2027-01-14",
  certificateId: "PC-44821",
  content: envelope(
    {
      type: "POLLUTION_CONSENT",
      title: "Consent to Operate",
      entity: "Apex Manufacturing",
      site: "Pune Plant",
      certificate: "PC-44821",
      issued: "2026-01-15",
      expires: "2027-01-14",
      page: "1",
      quote: "Consent to operate is granted for Pune Plant through 14 January 2027.",
    },
    "Pollution consent PC-44821 granted to Apex Manufacturing, Pune Plant. Consent to operate is granted for Pune Plant through 14 January 2027.",
  ),
};

export const FIRE_CERTIFICATE_WRONG_SITE: DocumentFixture = {
  name: "fire-certificate-mumbai.pdf",
  type: "FIRE_SAFETY_CERTIFICATE",
  entity: "Apex Manufacturing",
  site: "Mumbai Plant",
  issuedAt: "2026-09-01",
  expiresAt: "2027-08-31",
  certificateId: "FS-88001",
  content: envelope(
    {
      type: "FIRE_SAFETY_CERTIFICATE",
      title: "Fire Safety Certificate",
      entity: "Apex Manufacturing",
      site: "Mumbai Plant",
      certificate: "FS-88001",
      issued: "2026-09-01",
      expires: "2027-08-31",
      page: "1",
    },
    "Fire Safety Certificate FS-88001 issued to Apex Manufacturing for Mumbai Plant. Valid until 31 August 2027.",
  ),
};

export const FIRE_CERTIFICATE_WRONG_ENTITY: DocumentFixture = {
  name: "fire-certificate-other-co.pdf",
  type: "FIRE_SAFETY_CERTIFICATE",
  entity: "Helix Industrials",
  site: "Pune Plant",
  issuedAt: "2026-09-01",
  expiresAt: "2027-08-31",
  certificateId: "FS-77021",
  content: envelope(
    {
      type: "FIRE_SAFETY_CERTIFICATE",
      title: "Fire Safety Certificate",
      entity: "Helix Industrials",
      site: "Pune Plant",
      certificate: "FS-77021",
      issued: "2026-09-01",
      expires: "2027-08-31",
      page: "1",
    },
    "Fire Safety Certificate FS-77021 issued to Helix Industrials for Pune Plant. Valid until 31 August 2027.",
  ),
};

export const PRIMARY_SEED_DOCUMENTS = [FACTORY_LAYOUT, FIRE_CERTIFICATE_OLD, POLLUTION_CONSENT];
