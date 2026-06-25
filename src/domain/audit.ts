import { AuditEvent, RiskLevel } from "./types";

export function createAuditEvent(input: {
  actor: string;
  action: string;
  entity: string;
  before: string;
  after: string;
  source?: AuditEvent["source"];
  reason?: string;
  risk?: RiskLevel;
  correlationId?: string;
}): AuditEvent {
  return {
    id: crypto.randomUUID(),
    actor: input.actor,
    action: input.action,
    entity: input.entity,
    before: input.before,
    after: input.after,
    timestamp: new Date().toISOString(),
    source: input.source ?? "UI",
    correlationId: input.correlationId ?? crypto.randomUUID(),
    reason: input.reason,
    risk: input.risk ?? "Low"
  };
}
