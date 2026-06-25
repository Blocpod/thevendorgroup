import { Permission, Role, User } from "./types";

const matrix: Record<Role, Permission[]> = {
  Administrator: [
    "client:create",
    "client:edit",
    "client:archive",
    "project:create",
    "project:edit",
    "gate:complete",
    "lifecycle:advance",
    "gate:override",
    "qa:resolve",
    "approval:record",
    "launch:authorize",
    "deployment:prepare",
    "deployment:complete",
    "scope:create",
    "scope:approve",
    "knowledge:publish",
    "playbook:approve",
    "financial:view",
    "roles:manage",
    "workflow:manage",
    "demo:reset"
  ],
  Executive: [
    "client:create",
    "client:edit",
    "project:create",
    "project:edit",
    "gate:complete",
    "lifecycle:advance",
    "gate:override",
    "approval:record",
    "launch:authorize",
    "scope:create",
    "scope:approve",
    "knowledge:publish",
    "playbook:approve",
    "financial:view"
  ],
  "Operations Manager": [
    "client:create",
    "client:edit",
    "project:create",
    "project:edit",
    "gate:complete",
    "lifecycle:advance",
    "gate:override",
    "qa:resolve",
    "approval:record",
    "deployment:prepare",
    "scope:create"
  ],
  "Creative Lead": ["project:edit", "gate:complete", "approval:record", "scope:create", "knowledge:publish"],
  "Technical Lead": ["project:edit", "gate:complete", "lifecycle:advance", "qa:resolve", "approval:record", "deployment:prepare", "deployment:complete", "scope:create"],
  "Client Approver": ["approval:record", "launch:authorize", "scope:create"],
  "Client Contributor": ["scope:create"],
  Viewer: []
};

export function hasPermission(user: User | undefined, permission: Permission) {
  return Boolean(user && matrix[user.role].includes(permission));
}

export function assertPermission(user: User | undefined, permission: Permission) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Unauthorized: ${permission}`);
  }
}

export function visibleClientIds(user: User, allClientIds: string[]) {
  if (["Administrator", "Executive", "Operations Manager", "Creative Lead", "Technical Lead", "Viewer"].includes(user.role)) {
    return allClientIds;
  }
  return user.clientIds ?? [];
}

export const permissionMatrix = matrix;
