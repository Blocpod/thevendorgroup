export type Role =
  | "Administrator"
  | "Executive"
  | "Operations Manager"
  | "Creative Lead"
  | "Technical Lead"
  | "Client Approver"
  | "Client Contributor"
  | "Viewer";

export type Permission =
  | "client:create"
  | "client:edit"
  | "client:archive"
  | "project:create"
  | "project:edit"
  | "gate:complete"
  | "lifecycle:advance"
  | "gate:override"
  | "qa:resolve"
  | "approval:record"
  | "launch:authorize"
  | "deployment:prepare"
  | "deployment:complete"
  | "scope:create"
  | "scope:approve"
  | "knowledge:publish"
  | "playbook:approve"
  | "financial:view"
  | "roles:manage"
  | "workflow:manage"
  | "demo:reset";

export type Stage =
  | "Sales"
  | "Finance"
  | "Onboarding"
  | "Design"
  | "Development"
  | "Internal QA"
  | "Client QA"
  | "Launch Authorization"
  | "Launch"
  | "Post-Launch"
  | "Customer Success"
  | "Account Management";

export type RequestClass =
  | "Defect"
  | "Correction"
  | "Included revision"
  | "Content update"
  | "New feature"
  | "Scope expansion"
  | "Future phase"
  | "Support request"
  | "Emergency issue";

export type Health = "Healthy" | "Watch" | "Blocked" | "Critical";
export type IntegrationState = "Healthy" | "Degraded" | "Delayed" | "Failed" | "Recovering" | "Recovered";
export type ReviewStatus = "Draft" | "AI-assisted" | "Human review required" | "Approved" | "Rejected";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  clientIds?: string[];
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  approvalAuthority: boolean;
}

export interface Website {
  id: string;
  domain: string;
  type: "Corporate" | "Investor Relations" | "Microsite";
  status: "Planning" | "Build" | "QA" | "Live" | "Support";
}

export interface Client {
  id: string;
  name: string;
  ticker: string;
  industry: string;
  health: Health;
  archived: boolean;
  services: string[];
  revenueSignal: string;
  marginRisk: "Low" | "Medium" | "High";
  contacts: Contact[];
  websites: Website[];
  activity: string[];
}

export interface GateRequirement {
  id: string;
  label: string;
  stage: Stage;
  complete: boolean;
  evidence?: string;
  completedBy?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  label: string;
  owner: Role;
  due: string;
  done: boolean;
  blocked?: boolean;
}

export interface ScopeRecommendation {
  classification: RequestClass;
  confidence: number;
  triggeredRules: string[];
  explanation: string;
  alternativeClassification?: RequestClass;
  commercialImpact: boolean;
  humanReviewRequired: boolean;
}

export interface WorkRequest {
  id: string;
  clientId: string;
  projectId: string;
  title: string;
  description: string;
  recommendation: ScopeRecommendation;
  severity: "Low" | "Medium" | "High" | "Emergency";
  complianceSensitive: boolean;
  owner: Role;
  due: string;
  status: "Open" | "In review" | "Approved" | "Resolved" | "Escalated" | "Reopened";
  evidence?: string;
}

export interface Asset {
  id: string;
  label: string;
  status: "Received" | "Missing" | "Requested" | "Needs replacement";
  owner: string;
  requestedAt?: string;
  receivedAt?: string;
}

export interface Approval {
  id: string;
  type: "Design" | "Scope" | "Client QA" | "Launch" | "Internal Launch" | "Playbook";
  projectId: string;
  approver: string;
  approverRole: Role;
  source: "Internal" | "Client";
  decision: "Approved" | "Rejected" | "Revoked";
  timestamp: string;
  artifactVersion: string;
  note: string;
  attachmentRef?: string;
  revoked: boolean;
  auditEventId: string;
}

export interface QaFinding {
  id: string;
  label: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  resolved: boolean;
  wcag?: string;
  evidence?: string;
}

export interface QaRun {
  id: string;
  projectId: string;
  startedAt: string;
  completedAt?: string;
  result: "Pass" | "Fail" | "Blocked";
  accessibility: "Pass" | "Fail" | "Not run";
  mobile: "Pass" | "Fail" | "Not run";
  forms: "Pass" | "Fail" | "Not run";
  dataFeeds: "Pass" | "Fail" | "Not run";
  metadata: "Pass" | "Fail" | "Not run";
  analytics: "Pass" | "Fail" | "Not run";
  findings: QaFinding[];
}

export interface LaunchReadiness {
  dnsReady: boolean;
  sslReady: boolean;
  clientApprovalId?: string;
  internalApprovalId?: string;
  backupRef?: string;
  rollbackTarget?: string;
  deploymentOwner?: string;
  releaseId?: string;
  environment?: "Staging" | "Production";
  plannedLaunchTime?: string;
}

export interface DeploymentRecord {
  id: string;
  release: string;
  environment: "Staging" | "Production";
  startedBy: string;
  startedAt: string;
  completedAt?: string;
  status: "Prepared" | "Running" | "Completed" | "Failed" | "Rolled back";
  verification: string;
  errors: string[];
  rollbackState: "Ready" | "Not ready" | "Used";
  smokeTest: "Pass" | "Fail" | "Not run";
}

export interface Handoff {
  id: string;
  projectId: string;
  from: Role;
  to: Role;
  timestamp: string;
  notes: string;
  accepted: boolean;
}

export interface ScopeChange {
  id: string;
  requestId: string;
  projectId: string;
  impact: "None" | "Schedule" | "Budget" | "Both";
  approved: boolean;
  approvedBy?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  type: "Corporate Website" | "Investor Relations" | "Support" | "Launch" | "Governance";
  stage: Stage;
  health: Health;
  archived: boolean;
  owner: Role;
  deadline: string;
  requirements: GateRequirement[];
  tasks: Task[];
  requests: WorkRequest[];
  assets: Asset[];
  approvals: Approval[];
  scopeChanges: ScopeChange[];
  handoffs: Handoff[];
  qaRuns: QaRun[];
  launchReadiness: LaunchReadiness;
  deployments: DeploymentRecord[];
  debriefs: { id: string; summary: string; completedAt: string; improvementId?: string }[];
}

export interface Integration {
  id: string;
  name: string;
  state: IntegrationState;
  adapter: string;
}

export interface IntegrationRun {
  id: string;
  integrationId: string;
  action: string;
  startedAt: string;
  endedAt?: string;
  status: IntegrationState;
  response?: string;
  error?: string;
  retryState: "None" | "Scheduled" | "Retrying" | "Exhausted";
  clientId?: string;
  projectId?: string;
  auditEventId: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  before: string;
  after: string;
  timestamp: string;
  source: "UI" | "System" | "AI" | "Test";
  correlationId: string;
  reason?: string;
  risk: RiskLevel;
}

export interface AiRecord {
  id: string;
  type: "Operations brief" | "Scope recommendation" | "Status draft" | "Playbook proposal";
  task: string;
  prompt: string;
  response: string;
  sourceRecordIds: string[];
  createdAt: string;
  reviewStatus: ReviewStatus;
  reviewer?: string;
  confidence: number;
  approvalState: ReviewStatus;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  owner: string;
  verified: string;
  status: ReviewStatus;
  versions: string[];
  relatedWorkflow: string;
}

export interface CustomerSuccessReview {
  id: string;
  clientId: string;
  cadence: "Day 7" | "Day 30" | "Day 90" | "Quarterly";
  status: string;
  renewalHealth: Health;
  testimonialStatus: string;
  referralStatus: string;
  expansionOpportunity: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  owner: Role;
  stages: Stage[];
}

export interface Notification {
  id: string;
  message: string;
  risk: RiskLevel;
  entity: string;
  read: boolean;
}

export interface AppState {
  users: User[];
  session: { userId?: string };
  clients: Client[];
  projects: Project[];
  integrations: Integration[];
  integrationRuns: IntegrationRun[];
  aiRecords: AiRecord[];
  knowledge: KnowledgeArticle[];
  csReviews: CustomerSuccessReview[];
  workflowTemplates: WorkflowTemplate[];
  audit: AuditEvent[];
  notifications: Notification[];
}

export const stages: Stage[] = [
  "Sales",
  "Finance",
  "Onboarding",
  "Design",
  "Development",
  "Internal QA",
  "Client QA",
  "Launch Authorization",
  "Launch",
  "Post-Launch",
  "Customer Success",
  "Account Management"
];
