import { AiRecord, AppState } from "../../domain/types";

export interface AIProvider {
  generateOperationsBrief(state: AppState): AiRecord;
}

export class MockAIProvider implements AIProvider {
  generateOperationsBrief(state: AppState): AiRecord {
    const blocked = state.projects.filter((project) => project.health === "Blocked").length;
    const launchCandidates = state.projects.filter((project) => project.stage === "Launch Authorization" || project.stage === "Launch").length;
    const failedIntegrations = state.integrations.filter((integration) => integration.state === "Failed" || integration.state === "Degraded").map((integration) => integration.name);
    const scopeRisk = state.projects.flatMap((project) => project.requests).filter((request) => request.recommendation.commercialImpact).length;
    return {
      id: "ai-ops-brief",
      type: "Operations brief",
      task: "Generate daily operations brief",
      prompt: "Summarize blockers, launch readiness, integration risk, and commercial review items from current VendorOS records.",
      response: `${blocked} blocked projects, ${launchCandidates} launch candidates, ${scopeRisk} commercial-review requests. ${failedIntegrations.length ? `Integration attention: ${failedIntegrations.join(", ")}.` : "No failed integrations."} Human review remains required for scope, launch, deployment, and playbook decisions.`,
      sourceRecordIds: [...state.projects.map((project) => project.id), ...state.integrations.map((integration) => integration.id)],
      createdAt: new Date().toISOString(),
      reviewStatus: "Human review required",
      confidence: 0.88,
      approvalState: "Human review required"
    };
  }
}

export const mockAIProvider = new MockAIProvider();
