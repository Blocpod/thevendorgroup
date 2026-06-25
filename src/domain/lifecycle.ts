import { createAuditEvent } from "./audit";
import { assertPermission } from "./permissions";
import { Approval, AppState, DeploymentRecord, Project, Stage, User, stages } from "./types";

export interface TransitionResult {
  ok: boolean;
  state: AppState;
  missing: string[];
  message: string;
}

export function evaluateGate(project: Project): string[] {
  const missing = project.requirements
    .filter((requirement) => requirement.stage === project.stage && !requirement.complete)
    .map((requirement) => requirement.label);

  if (project.stage === "Launch Authorization") {
    const latestQa = project.qaRuns[0];
    if (!latestQa) missing.push("QA run");
    if (latestQa?.findings.some((finding) => !finding.resolved && ["High", "Critical"].includes(finding.severity))) {
      missing.push("Resolved high and critical QA findings");
    }
    if (latestQa?.accessibility !== "Pass") missing.push("Accessibility result");
    if (latestQa?.mobile !== "Pass") missing.push("Mobile result");
    if (latestQa?.forms !== "Pass") missing.push("Form result");
    if (latestQa?.dataFeeds !== "Pass") missing.push("Data-feed result");
    if (!project.launchReadiness.dnsReady) missing.push("DNS readiness");
    if (!project.launchReadiness.sslReady) missing.push("SSL readiness");
    if (!project.launchReadiness.clientApprovalId) missing.push("Client approval");
    if (!project.launchReadiness.internalApprovalId) missing.push("Internal approval");
    if (!project.launchReadiness.rollbackTarget) missing.push("Rollback target");
  }

  if (project.stage === "Launch" && !project.deployments.some((deployment) => deployment.status === "Completed" && deployment.smokeTest === "Pass")) {
    missing.push("Completed deployment and smoke-test evidence");
  }

  if (project.stage === "Post-Launch" && project.debriefs.length === 0) {
    missing.push("Post-launch debrief");
  }

  return missing;
}

export function nextStage(stage: Stage): Stage | null {
  const index = stages.indexOf(stage);
  return index >= 0 && index < stages.length - 1 ? stages[index + 1] : null;
}

function replaceProject(state: AppState, project: Project): AppState {
  return { ...state, projects: state.projects.map((candidate) => (candidate.id === project.id ? project : candidate)) };
}

export function completeRequirement(state: AppState, projectId: string, requirementId: string, user: User, evidence: string): AppState {
  assertPermission(user, "gate:complete");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const nextProject = {
    ...project,
    requirements: project.requirements.map((requirement) =>
      requirement.id === requirementId
        ? { ...requirement, complete: true, evidence, completedBy: user.name, completedAt: new Date().toISOString() }
        : requirement
    )
  };
  const event = createAuditEvent({
    actor: user.name,
    action: "Requirement completed",
    entity: requirementId,
    before: "Incomplete",
    after: evidence,
    risk: "Low"
  });
  const next = replaceProject(state, nextProject);
  return { ...next, audit: [event, ...state.audit] };
}

export function advanceProject(state: AppState, projectId: string, user: User, overrideReason?: string): TransitionResult {
  assertPermission(user, "lifecycle:advance");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const target = nextStage(project.stage);
  if (!target) return { ok: false, state, missing: [], message: "Project is already at the final lifecycle stage." };

  const missing = evaluateGate(project);
  const override = missing.length > 0 && Boolean(overrideReason);
  if (missing.length > 0 && !override) {
    return { ok: false, state, missing, message: "Gate blocked because required evidence is missing." };
  }
  if (override) {
    assertPermission(user, "gate:override");
    if (!overrideReason || overrideReason.trim().length < 12) {
      return { ok: false, state, missing, message: "Override requires a risk-aware reason." };
    }
  }

  const nextProject: Project = { ...project, stage: target, health: missing.length ? "Watch" : "Healthy" };
  const event = createAuditEvent({
    actor: user.name,
    action: override ? "Gate override" : "Gate passed",
    entity: project.id,
    before: project.stage,
    after: target,
    reason: overrideReason,
    risk: override ? "High" : "Low"
  });
  const next = replaceProject(state, nextProject);
  return { ok: true, state: { ...next, audit: [event, ...state.audit] }, missing, message: override ? "Override recorded and project advanced." : "Project advanced." };
}

export function recordApproval(state: AppState, projectId: string, user: User, approval: Omit<Approval, "id" | "timestamp" | "auditEventId" | "projectId" | "approver" | "approverRole" | "revoked">): AppState {
  assertPermission(user, approval.type === "Launch" ? "launch:authorize" : "approval:record");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const event = createAuditEvent({
    actor: user.name,
    action: `${approval.type} approval ${approval.decision.toLowerCase()}`,
    entity: project.id,
    before: "No approval record",
    after: `${approval.artifactVersion}: ${approval.note}`,
    risk: approval.type.includes("Launch") ? "High" : "Medium"
  });
  const record: Approval = {
    ...approval,
    id: crypto.randomUUID(),
    projectId,
    approver: user.name,
    approverRole: user.role,
    timestamp: event.timestamp,
    revoked: false,
    auditEventId: event.id
  };
  const launchReadiness =
    approval.type === "Launch" && approval.source === "Client"
      ? { ...project.launchReadiness, clientApprovalId: record.id }
      : approval.type === "Internal Launch"
        ? { ...project.launchReadiness, internalApprovalId: record.id }
        : project.launchReadiness;
  const nextProject = { ...project, approvals: [record, ...project.approvals], launchReadiness };
  const next = replaceProject(state, nextProject);
  return { ...next, audit: [event, ...state.audit] };
}

export function resolveFinding(state: AppState, projectId: string, findingId: string, user: User, evidence: string): AppState {
  assertPermission(user, "qa:resolve");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const nextProject = {
    ...project,
    qaRuns: project.qaRuns.map((run) => ({
      ...run,
      findings: run.findings.map((finding) => (finding.id === findingId ? { ...finding, resolved: true, evidence } : finding)),
      accessibility: run.findings.some((finding) => finding.id === findingId && finding.wcag) ? "Pass" : run.accessibility
    }))
  };
  const event = createAuditEvent({ actor: user.name, action: "QA finding resolved", entity: findingId, before: "Open", after: evidence, risk: "Medium" });
  const next = replaceProject(state, nextProject);
  return { ...next, audit: [event, ...state.audit] };
}

export function prepareDeployment(state: AppState, projectId: string, user: User): AppState {
  assertPermission(user, "deployment:prepare");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const release = project.launchReadiness.releaseId ?? `${project.id}-release-1`;
  const deployment: DeploymentRecord = {
    id: crypto.randomUUID(),
    release,
    environment: project.launchReadiness.environment ?? "Production",
    startedBy: user.name,
    startedAt: new Date().toISOString(),
    status: "Prepared",
    verification: "Prepared in simulation; production deployment requires authorization.",
    errors: [],
    rollbackState: project.launchReadiness.rollbackTarget ? "Ready" : "Not ready",
    smokeTest: "Not run"
  };
  const event = createAuditEvent({ actor: user.name, action: "Deployment prepared", entity: project.id, before: "No deployment", after: release, risk: "High" });
  const next = replaceProject(state, { ...project, deployments: [deployment, ...project.deployments] });
  return { ...next, audit: [event, ...state.audit] };
}

export function completeDeployment(state: AppState, projectId: string, user: User): AppState {
  assertPermission(user, "deployment:complete");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  const nextProject = {
    ...project,
    deployments: project.deployments.map((deployment, index) =>
      index === 0
        ? { ...deployment, completedAt: new Date().toISOString(), status: "Completed" as const, smokeTest: "Pass" as const, verification: "Smoke test passed for homepage, IR feed, forms, metadata, and analytics." }
        : deployment
    )
  };
  const event = createAuditEvent({ actor: user.name, action: "Deployment completed", entity: project.id, before: "Prepared", after: "Completed with smoke test", risk: "High" });
  const next = replaceProject(state, nextProject);
  return { ...next, audit: [event, ...state.audit] };
}
