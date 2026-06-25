import { describe, expect, it } from "vitest";
import { advanceProject, completeRequirement, evaluateGate, recordApproval } from "../domain/lifecycle";
import { hasPermission } from "../domain/permissions";
import { classifyRequest } from "../domain/requests";
import { createSeedState } from "../data/seed";

const ops = () => createSeedState().users.find((user) => user.role === "Operations Manager")!;
const viewer = () => createSeedState().users.find((user) => user.role === "Viewer")!;
const exec = () => createSeedState().users.find((user) => user.role === "Executive")!;

describe("VendorGroupOS lifecycle", () => {
  it("blocks stage advancement when onboarding evidence is missing", () => {
    const state = createSeedState();
    const result = advanceProject(state, "project-meridian-rebuild", ops());
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Onboarding evidence packet");
  });

  it("allows authorized overrides with audit evidence", () => {
    const state = createSeedState();
    const result = advanceProject(state, "project-meridian-rebuild", exec(), "Executive accepts temporary DNS risk for staging-only progress.");
    expect(result.ok).toBe(true);
    expect(result.state.projects.find((project) => project.id === "project-meridian-rebuild")?.stage).toBe("Design");
    expect(result.state.audit[0].action).toBe("Gate override");
  });

  it("rejects unauthorized overrides", () => {
    const state = createSeedState();
    expect(() => advanceProject(state, "project-meridian-rebuild", viewer(), "Trying to bypass missing launch evidence.")).toThrow("Unauthorized");
  });

  it("clears requirements with evidence", () => {
    const state = createSeedState();
    const updated = completeRequirement(state, "project-meridian-rebuild", "Onboarding-brief", ops(), "Assets received from CFO.");
    const project = updated.projects.find((item) => item.id === "project-meridian-rebuild")!;
    expect(evaluateGate(project)).toContain("Onboarding owner approval");
    expect(project.requirements.find((item) => item.id === "Onboarding-brief")?.complete).toBe(true);
  });

  it("stores launch approvals as evidence-bearing records", () => {
    const state = createSeedState();
    const updated = recordApproval(state, "project-atlas-launch", exec(), {
      type: "Internal Launch",
      source: "Internal",
      decision: "Approved",
      artifactVersion: "atlas-release",
      note: "Internal launch authorization approved after QA review."
    });
    const project = updated.projects.find((item) => item.id === "project-atlas-launch")!;
    expect(project.approvals[0].auditEventId).toBeTruthy();
    expect(project.launchReadiness.internalApprovalId).toBe(project.approvals[0].id);
  });
});

describe("permissions and request classification", () => {
  it("enforces the permission matrix for viewers", () => {
    expect(hasPermission(viewer(), "client:create")).toBe(false);
    expect(hasPermission(ops(), "client:create")).toBe(true);
  });

  it("returns structured commercial-impact recommendations", () => {
    const recommendation = classifyRequest("Please add an additional ROI calculator under contract");
    expect(recommendation.classification).toBe("Scope expansion");
    expect(recommendation.commercialImpact).toBe(true);
    expect(recommendation.humanReviewRequired).toBe(true);
  });
});
