import { RequestClass, ScopeRecommendation } from "./types";

export function classifyRequest(text: string): ScopeRecommendation {
  const value = text.toLowerCase();
  const rules: string[] = [];
  let classification: RequestClass = "Support request";
  let alternative: RequestClass | undefined;
  let confidence = 0.68;

  if (/(down|outage|breach|market open|emergency)/.test(value)) {
    classification = "Emergency issue";
    rules.push("emergency-operational-impact");
    confidence = 0.94;
  } else if (/(bug|broken|defect|error|not working)/.test(value)) {
    classification = "Defect";
    rules.push("reported-broken-existing-function");
    confidence = 0.86;
  } else if (/(typo|correction|incorrect)/.test(value)) {
    classification = "Correction";
    rules.push("correction-language");
    confidence = 0.82;
  } else if (/(copy|bio|press release|content|update)/.test(value)) {
    classification = "Content update";
    rules.push("content-update-language");
    confidence = 0.8;
  }

  if (/(new feature|calculator|portal|integration|additional|contract|change order|scope)/.test(value)) {
    alternative = classification;
    classification = /(additional|contract|change order|scope)/.test(value) ? "Scope expansion" : "New feature";
    rules.push("new-capability-or-commercial-impact");
    confidence = value.includes("additional") || value.includes("contract") ? 0.9 : 0.74;
  }

  const commercialImpact = ["Scope expansion", "New feature", "Future phase"].includes(classification);
  return {
    classification,
    confidence,
    triggeredRules: rules.length ? rules : ["default-support-triage"],
    explanation: commercialImpact
      ? "The request appears to add or materially alter contracted scope and requires human commercial review."
      : "The request can be routed through the standard operational workflow with human review as needed.",
    alternativeClassification: alternative,
    commercialImpact,
    humanReviewRequired: commercialImpact || confidence < 0.78
  };
}
