export type Permission =
  | "application.read"
  | "application.create"
  | "application.edit"
  | "application.monitor"
  | "document.read"
  | "document.upload"
  | "evidence.read"
  | "run.create"
  | "approval.review"
  | "submission.execute"
  | "settings.manage"
  | "team.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: ["application.read", "application.create", "application.edit", "application.monitor", "document.read", "document.upload", "evidence.read", "run.create", "approval.review", "submission.execute", "settings.manage", "team.manage", "audit.read"],
  ADMIN: ["application.read", "application.create", "application.edit", "application.monitor", "document.read", "document.upload", "evidence.read", "run.create", "approval.review", "submission.execute", "settings.manage", "team.manage", "audit.read"],
  OPERATOR: ["application.read", "application.create", "application.edit", "application.monitor", "document.read", "document.upload", "evidence.read", "run.create", "approval.review", "submission.execute", "audit.read"],
  REVIEWER: ["application.read", "document.read", "evidence.read", "approval.review", "audit.read"],
  VIEWER: ["application.read", "document.read", "evidence.read"],
};

export function hasPermission(role: string, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
