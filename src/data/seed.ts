import { createAuditEvent } from "../domain/audit";
import { classifyRequest } from "../domain/requests";
import { AppState, Client, GateRequirement, Integration, Project, Stage, User } from "../domain/types";
import { mockAIProvider } from "../features/ai/provider";

const now = "2026-06-25T12:00:00.000Z";

const users: User[] = [
  { id: "u-admin", name: "Dana Root", email: "admin@vendorgroup.example", password: "demo-admin", role: "Administrator" },
  { id: "u-exec", name: "Morgan Vale", email: "executive@vendorgroup.example", password: "demo-exec", role: "Executive" },
  { id: "u-ops", name: "Avery Chen", email: "ops@vendorgroup.example", password: "demo-ops", role: "Operations Manager" },
  { id: "u-creative", name: "Simone Hart", email: "creative@vendorgroup.example", password: "demo-creative", role: "Creative Lead" },
  { id: "u-tech", name: "Priya Shah", email: "tech@vendorgroup.example", password: "demo-tech", role: "Technical Lead" },
  { id: "u-client-approver", name: "Elaine Porter", email: "approver@meridian.example", password: "demo-client", role: "Client Approver", clientIds: ["client-meridian"] },
  { id: "u-client-contributor", name: "Jon Bell", email: "contributor@meridian.example", password: "demo-contributor", role: "Client Contributor", clientIds: ["client-meridian"] },
  { id: "u-viewer", name: "Read Only", email: "viewer@vendorgroup.example", password: "demo-viewer", role: "Viewer" }
];

function client(id: string, name: string, ticker: string, industry: string, health: Client["health"], marginRisk: Client["marginRisk"], condition: string): Client {
  return {
    id,
    name,
    ticker,
    industry,
    health,
    archived: false,
    services: ["Corporate website", "Investor relations", "Managed hosting", "Data integrations"],
    revenueSignal: marginRisk === "High" ? "Margin at risk" : "$184k ARR simulated",
    marginRisk,
    contacts: [
      { id: `${id}-cfo`, name: "Primary Approver", title: "CFO", email: `cfo@${id}.example`, approvalAuthority: true },
      { id: `${id}-ir`, name: "IR Lead", title: "Investor Relations", email: `ir@${id}.example`, approvalAuthority: true }
    ],
    websites: [
      { id: `${id}-corp`, domain: `${id}.example`, type: "Corporate", status: health === "Healthy" ? "Live" : "Build" },
      { id: `${id}-ir`, domain: `investors.${id}.example`, type: "Investor Relations", status: "QA" }
    ],
    activity: [condition]
  };
}

const clients: Client[] = [
  client("client-meridian", "Meridian Applied Robotics, Inc.", "NASDAQ: MARX", "Industrial automation and autonomous inspection systems", "Watch", "Medium", "Full lifecycle journey with DNS delay, scope expansion, failed stock feed, launch, debrief, and Day 30 review."),
  client("client-northstar", "Northstar Critical Minerals", "NYSE: NCMI", "Critical minerals exploration", "Critical", "High", "Client QA with repeated scope expansion and executive decision required."),
  client("client-helix", "Helix Therapeutics", "NASDAQ: HLXT", "Clinical-stage therapeutics", "Critical", "Medium", "Live support issue with broken stock data and emergency compliance-sensitive request."),
  client("client-atlas", "Atlas Autonomous Systems", "NYSE: ATLS", "Autonomous mobility systems", "Blocked", "Low", "Launch-ready except unresolved accessibility finding and client authorization pending."),
  client("client-granite", "Granite BioSystems", "NASDAQ: GBIO", "Bioinstrumentation platforms", "Blocked", "Medium", "Blocked onboarding with missing DNS, executive imagery, and data-provider credentials.")
];

function requirements(stage: Stage): GateRequirement[] {
  return [
    { id: `${stage}-brief`, stage, label: `${stage} evidence packet`, complete: stage !== "Onboarding" },
    { id: `${stage}-approval`, stage, label: `${stage} owner approval`, complete: !["Onboarding", "Launch Authorization"].includes(stage) }
  ];
}

function project(input: { id: string; clientId: string; name: string; stage: Stage; health: Project["health"]; deadline: string; request: string; qaFail?: boolean; dnsReady?: boolean }): Project {
  const recommendation = classifyRequest(input.request);
  const req = {
    id: `${input.id}-wr-1`,
    clientId: input.clientId,
    projectId: input.id,
    title: input.request,
    description: input.request,
    recommendation,
    severity: recommendation.classification === "Emergency issue" ? "Emergency" as const : "Medium" as const,
    complianceSensitive: /stock|ir|investor|filing|launch/i.test(input.request),
    owner: "Operations Manager" as const,
    due: "2026-07-12",
    status: recommendation.commercialImpact ? "Escalated" as const : "Open" as const
  };
  return {
    id: input.id,
    clientId: input.clientId,
    name: input.name,
    type: input.name.includes("Support") ? "Support" : "Investor Relations",
    stage: input.stage,
    health: input.health,
    archived: false,
    owner: "Operations Manager",
    deadline: input.deadline,
    requirements: [...requirements(input.stage), { id: `${input.id}-dns`, stage: "Onboarding", label: "DNS and registrar access confirmed", complete: Boolean(input.dnsReady), evidence: input.dnsReady ? "Registrar access confirmed." : undefined }],
    tasks: [
      { id: `${input.id}-task-1`, label: "Prepare evidence packet", owner: "Operations Manager", due: input.deadline, done: input.stage !== "Onboarding", blocked: input.health === "Blocked" },
      { id: `${input.id}-task-2`, label: "Review compliance-sensitive content", owner: "Technical Lead", due: input.deadline, done: false }
    ],
    requests: [req],
    assets: [
      { id: `${input.id}-asset-logo`, label: "Approved vector logo", status: "Received", owner: "Client" },
      { id: `${input.id}-asset-dns`, label: "DNS access", status: input.dnsReady ? "Received" : "Missing", owner: "Client IT" }
    ],
    approvals: [],
    scopeChanges: recommendation.commercialImpact ? [{ id: `${input.id}-scope-1`, requestId: req.id, projectId: input.id, impact: "Both", approved: false }] : [],
    handoffs: [{ id: `${input.id}-handoff`, projectId: input.id, from: "Creative Lead", to: "Technical Lead", timestamp: now, notes: "Design tokens, sitemap, CMS model, and QA expectations reviewed.", accepted: input.stage !== "Design" }],
    qaRuns: [
      {
        id: `${input.id}-qa-1`,
        projectId: input.id,
        startedAt: now,
        completedAt: now,
        result: input.qaFail ? "Fail" : "Pass",
        accessibility: input.qaFail ? "Fail" : "Pass",
        mobile: "Pass",
        forms: "Pass",
        dataFeeds: input.request.includes("stock") ? "Fail" : "Pass",
        metadata: "Pass",
        analytics: "Pass",
        findings: input.qaFail ? [{ id: `${input.id}-a11y`, label: "Focus order skips disclosure link", severity: "High", resolved: false, wcag: "2.4.3" }] : []
      }
    ],
    launchReadiness: {
      dnsReady: Boolean(input.dnsReady),
      sslReady: input.stage !== "Onboarding",
      backupRef: input.stage === "Launch Authorization" ? `${input.id}-backup` : undefined,
      rollbackTarget: input.stage === "Launch Authorization" ? "previous-production-release" : undefined,
      deploymentOwner: "Priya Shah",
      releaseId: `${input.id}-release-2026-06`,
      environment: "Production",
      plannedLaunchTime: "2026-07-15T14:00:00.000Z"
    },
    deployments: [],
    debriefs: []
  };
}

const projects: Project[] = [
  project({ id: "project-meridian-rebuild", clientId: "client-meridian", name: "Corporate and Investor Relations Website Rebuild", stage: "Onboarding", health: "Blocked", deadline: "2026-07-15", request: "Add additional inspection robotics ROI calculator under contract review", qaFail: true, dnsReady: false }),
  project({ id: "project-northstar-qa", clientId: "client-northstar", name: "Client QA and Scope Control", stage: "Client QA", health: "Critical", deadline: "2026-07-08", request: "Additional project pages and investor calculator scope expansion", dnsReady: true }),
  project({ id: "project-helix-support", clientId: "client-helix", name: "Live Support Emergency", stage: "Account Management", health: "Critical", deadline: "2026-06-26", request: "Market open emergency outage with broken stock data on investor website", dnsReady: true }),
  project({ id: "project-atlas-launch", clientId: "client-atlas", name: "Launch Authorization", stage: "Launch Authorization", health: "Blocked", deadline: "2026-07-01", request: "Client authorization pending for launch", qaFail: true, dnsReady: true }),
  project({ id: "project-granite-onboarding", clientId: "client-granite", name: "Corporate Website Onboarding", stage: "Onboarding", health: "Blocked", deadline: "2026-07-20", request: "Missing executive imagery and data-provider credentials", dnsReady: false })
];

const integrations: Integration[] = [
  { id: "cms", name: "CMS", state: "Healthy", adapter: "CMSAdapter" },
  { id: "sec", name: "SEC filing feed", state: "Delayed", adapter: "SECFeedAdapter" },
  { id: "stock", name: "Stock data", state: "Failed", adapter: "StockDataAdapter" },
  { id: "newswire", name: "Newswire", state: "Healthy", adapter: "NewswireAdapter" },
  { id: "webcast", name: "Webcast", state: "Healthy", adapter: "WebcastAdapter" },
  { id: "email", name: "Email alerts", state: "Healthy", adapter: "EmailAlertAdapter" },
  { id: "crm", name: "CRM", state: "Degraded", adapter: "CRMAdapter" },
  { id: "billing", name: "Billing", state: "Healthy", adapter: "BillingAdapter" },
  { id: "analytics", name: "Analytics", state: "Healthy", adapter: "AnalyticsAdapter" },
  { id: "monitoring", name: "Monitoring", state: "Healthy", adapter: "MonitoringAdapter" },
  { id: "hosting", name: "Hosting", state: "Healthy", adapter: "HostingAdapter" },
  { id: "deployment", name: "Deployment", state: "Healthy", adapter: "DeploymentAdapter" },
  { id: "dns", name: "DNS", state: "Recovering", adapter: "DNSAdapter" },
  { id: "files", name: "File storage", state: "Healthy", adapter: "FileStorageAdapter" }
];

export function createSeedState(): AppState {
  const audit = [
    createAuditEvent({
      actor: "System",
      action: "Seed data loaded",
      entity: "VendorOS",
      before: "Empty",
      after: "Five-client simulated operating dataset",
      source: "System",
      risk: "Low"
    })
  ];
  const state: AppState = {
    users,
    session: {},
    clients,
    projects,
    integrations,
    integrationRuns: [],
    aiRecords: [],
    knowledge: [
      { id: "kb-launch", title: "IR launch authorization checklist", category: "Launch", owner: "Operations", verified: "2026-06-20", status: "Approved", versions: ["1.0", "1.1"], relatedWorkflow: "Launch Authorization" },
      { id: "kb-sec", title: "SEC feed delayed-state recovery", category: "Integrations", owner: "Technical", verified: "2026-06-12", status: "Human review required", versions: ["0.9"], relatedWorkflow: "Data integrations" }
    ],
    csReviews: clients.map((item, index) => ({
      id: `${item.id}-cs`,
      clientId: item.id,
      cadence: index === 0 ? "Day 30" : "Quarterly",
      status: index === 0 ? "Ready for Day 30 review" : "Scheduled",
      renewalHealth: item.health,
      testimonialStatus: "Not requested",
      referralStatus: "Not evaluated",
      expansionOpportunity: item.marginRisk === "High" ? "Executive retention review" : "Managed disclosure workflow"
    })),
    workflowTemplates: [{ id: "wf-standard", name: "Standard public-company website lifecycle", owner: "Operations Manager", stages: ["Sales", "Finance", "Onboarding", "Design", "Development", "Internal QA", "Client QA", "Launch Authorization", "Launch", "Post-Launch", "Customer Success", "Account Management"] }],
    audit,
    notifications: [
      { id: "note-stock", message: "Stock data integration failed for Helix support workflow.", risk: "High", entity: "stock", read: false },
      { id: "note-atlas", message: "Atlas cannot launch until accessibility and client authorization clear.", risk: "High", entity: "project-atlas-launch", read: false }
    ]
  };
  return { ...state, aiRecords: [mockAIProvider.generateOperationsBrief(state)] };
}
