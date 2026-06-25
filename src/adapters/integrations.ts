import { AppState, Integration, IntegrationRun, IntegrationState, User } from "../domain/types";
import { createAuditEvent } from "../domain/audit";

export interface IntegrationAdapter {
  id: string;
  name: string;
  run(action: string, state: IntegrationState): Pick<IntegrationRun, "status" | "response" | "error" | "retryState">;
}

export class MockIntegrationAdapter implements IntegrationAdapter {
  constructor(
    public id: string,
    public name: string
  ) {}

  run(action: string, state: IntegrationState) {
    return {
      status: state,
      response: state === "Failed" ? undefined : `${this.name} ${action} completed with ${state.toLowerCase()} status.`,
      error: state === "Failed" ? `${this.name} simulated failure` : undefined,
      retryState: state === "Failed" ? ("Scheduled" as const) : ("None" as const)
    };
  }
}

export const integrationAdapters = [
  "CMS",
  "SEC filing feed",
  "Stock data",
  "Newswire",
  "Webcast",
  "Email alerts",
  "CRM",
  "Billing",
  "Analytics",
  "Monitoring",
  "Hosting",
  "Deployment",
  "DNS",
  "File storage"
].map((name) => new MockIntegrationAdapter(name.toLowerCase().split(" ").join("-"), name));

export function runIntegration(state: AppState, integrationId: string, user: User, nextStatus: IntegrationState): AppState {
  const integration = state.integrations.find((candidate) => candidate.id === integrationId);
  if (!integration) throw new Error("Integration not found");
  const adapter = new MockIntegrationAdapter(integration.id, integration.name);
  const event = createAuditEvent({
    actor: user.name,
    action: "Integration simulation run",
    entity: integration.id,
    before: integration.state,
    after: nextStatus,
    source: "System",
    risk: nextStatus === "Failed" ? "High" : "Medium"
  });
  const result = adapter.run("health-check", nextStatus);
  const run: IntegrationRun = {
    id: crypto.randomUUID(),
    integrationId,
    action: "health-check",
    startedAt: event.timestamp,
    endedAt: event.timestamp,
    auditEventId: event.id,
    ...result
  };
  const updatedIntegration: Integration = { ...integration, state: nextStatus };
  return {
    ...state,
    integrations: state.integrations.map((candidate) => (candidate.id === integrationId ? updatedIntegration : candidate)),
    integrationRuns: [run, ...state.integrationRuns],
    audit: [event, ...state.audit],
    notifications:
      nextStatus === "Failed"
        ? [{ id: crypto.randomUUID(), message: `${integration.name} failed and created an operations alert.`, risk: "High", entity: integration.id, read: false }, ...state.notifications]
        : state.notifications
  };
}
