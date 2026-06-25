import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Archive,
  Brain,
  CheckCircle2,
  FileCheck2,
  Gauge,
  KeyRound,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Users
} from "lucide-react";
import { runIntegration } from "../adapters/integrations";
import { advanceProject, completeDeployment, completeRequirement, evaluateGate, prepareDeployment, recordApproval, resolveFinding } from "../domain/lifecycle";
import { assertPermission, hasPermission, permissionMatrix, visibleClientIds } from "../domain/permissions";
import { classifyRequest } from "../domain/requests";
import { AppState, Client, IntegrationState, Project, User } from "../domain/types";
import { mockAIProvider } from "../features/ai/provider";
import { loadState, resetState, saveState } from "../repositories/repository";

function currentPath() {
  return window.location.pathname;
}

export function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [path, setPath] = useState(currentPath());
  const [themePreference, setThemePreference] = useState(() => localStorage.getItem("vendorgroupos-theme") ?? "system");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [requestText, setRequestText] = useState("Additional investor calculator and integration requested after design approval");

  useEffect(() => {
    const handler = () => setPath(currentPath());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    const applyTheme = () => {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const resolved = themePreference === "system" ? (systemDark ? "dark" : "light") : themePreference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themePreference = themePreference;
      localStorage.setItem("vendorgroupos-theme", themePreference);
    };
    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [themePreference]);

  const user = state.users.find((candidate) => candidate.id === state.session.userId);
  const allClientIds = state.clients.map((client) => client.id);
  const allowedClientIds = user ? visibleClientIds(user, allClientIds) : [];
  const visibleClients = state.clients.filter((client) => allowedClientIds.includes(client.id) && !client.archived);
  const visibleProjects = state.projects.filter((project) => allowedClientIds.includes(project.clientId) && !project.archived);

  function navigate(nextPath: string) {
    window.history.pushState(null, "", nextPath);
    setPath(nextPath);
  }

  function commit(mutator: (draft: AppState, actor: User) => AppState, success: string) {
    if (!user) return navigate("/login");
    try {
      const next = mutator(state, user);
      setState({ ...next, aiRecords: [mockAIProvider.generateOperationsBrief(next), ...next.aiRecords.filter((record) => record.id !== "ai-ops-brief")] });
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    }
  }

  if (path === "/login" || !user) {
    return <Login state={state} setState={setState} navigate={navigate} />;
  }

  const segments = path.split("/").filter(Boolean);
  const projectId = segments[0] === "projects" ? segments[1] : undefined;
  const clientId = segments[0] === "clients" ? segments[1] : undefined;
  const activeProject = state.projects.find((project) => project.id === projectId) ?? visibleProjects[0];
  const activeClient = state.clients.find((client) => client.id === clientId) ?? state.clients.find((client) => client.id === activeProject?.clientId) ?? visibleClients[0];

  return (
    <main className="app-shell">
      <aside className="rail" aria-label="Primary navigation">
        <button className="brand-button" onClick={() => navigate("/")}>
          <span>VendorGroup</span>
          <strong>OS</strong>
        </button>
        <p className="rail-caption">Public-company operations, governed from one surface.</p>
        {[
          ["/", "Command"],
          ["/clients", "Clients"],
          ["/projects", "Projects"],
          ["/requests", "Requests"],
          ["/launch", "Launch"],
          ["/knowledge", "Knowledge"],
          ["/customer-success", "Success"],
          ["/governance", "Governance"],
          ["/settings", "Settings"]
        ].map(([href, label]) => (
          <button className={path === href || (href !== "/" && path.startsWith(href)) ? "active" : ""} key={href} onClick={() => navigate(href)}>
            {label}
          </button>
        ))}
        <div className="rail-status">
          <span>System state</span>
          <strong>{state.notifications.filter((note) => !note.read).length} alerts</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Private AI-native operating system</p>
            <h1>{titleForPath(path)}</h1>
          </div>
          <div className="topbar-actions">
            <div className="theme-toggle" aria-label="Theme preference">
              {[
                ["light", <Sun size={15} key="sun" />],
                ["dark", <Moon size={15} key="moon" />],
                ["system", <Monitor size={15} key="monitor" />]
              ].map(([mode, icon]) => (
                <button className={themePreference === mode ? "active" : ""} key={mode as string} onClick={() => setThemePreference(mode as string)} aria-label={`${mode} theme`}>
                  {icon}
                </button>
              ))}
            </div>
            <div className="session-chip">
              <KeyRound size={16} />
              <span>{user.name} · {user.role}</span>
              <button onClick={() => { setState({ ...state, session: {} }); navigate("/login"); }} aria-label="Log out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {message && <div className="notice" role="status"><CheckCircle2 size={18} /> {message}</div>}

        {path === "/" && <CommandCenter state={state} clients={visibleClients} projects={visibleProjects} navigate={navigate} />}
        {path === "/clients" && <Clients clients={visibleClients} query={query} setQuery={setQuery} navigate={navigate} canCreate={hasPermission(user, "client:create")} onCreate={() => commit(createClient, "Client created.")} />}
        {path === "/clients/new" && <CreateState label="Create client" onCreate={() => commit(createClient, "Client created.")} />}
        {path.startsWith("/clients/") && path !== "/clients/new" && activeClient && <ClientDetail client={activeClient} projects={visibleProjects.filter((project) => project.clientId === activeClient.id)} user={user} navigate={navigate} onArchive={() => commit((draft, actor) => archiveClient(draft, actor, activeClient.id), "Client archived.")} />}
        {path === "/projects" && <Projects projects={visibleProjects} clients={state.clients} navigate={navigate} canCreate={hasPermission(user, "project:create")} onCreate={() => commit(createProject, "Project created.")} />}
        {path === "/projects/new" && <CreateState label="Create project" onCreate={() => commit(createProject, "Project created.")} />}
        {path.startsWith("/projects/") && activeProject && <ProjectDetail project={activeProject} client={state.clients.find((client) => client.id === activeProject.clientId)!} overrideReason={overrideReason} setOverrideReason={setOverrideReason} requestText={requestText} setRequestText={setRequestText} commit={commit} />}
        {path === "/requests" && <Requests projects={visibleProjects} requestText={requestText} setRequestText={setRequestText} commit={commit} />}
        {path === "/launch" && <LaunchCenter projects={visibleProjects} user={user} commit={commit} />}
        {path.startsWith("/knowledge") && <Knowledge state={state} user={user} />}
        {path === "/customer-success" && <CustomerSuccess state={state} clients={visibleClients} />}
        {path.startsWith("/governance") && <Governance state={state} user={user} commit={commit} />}
        {path === "/settings" && <Settings state={state} />}
        {!knownRoute(path) && <Panel icon={<AlertTriangle />} title="Not found" action="404"><p>The requested VendorOS route does not exist.</p></Panel>}
      </section>
    </main>
  );
}

function Login({ state, setState, navigate }: { state: AppState; setState: (state: AppState) => void; navigate: (path: string) => void }) {
  const [email, setEmail] = useState("ops@vendorgroup.example");
  const [password, setPassword] = useState("demo-ops");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const user = state.users.find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) return setError("Invalid demo credentials.");
    setState({ ...state, session: { userId: user.id } });
    navigate("/");
  }
  return (
    <main className="login-shell">
      <form className="login-panel" onSubmit={submit}>
        <p className="eyebrow">VendorGroupOS</p>
        <h1>Sign in</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button>Enter command center</button>
        <small>Try `admin@vendorgroup.example` / `demo-admin` or `ops@vendorgroup.example` / `demo-ops`.</small>
      </form>
    </main>
  );
}

function CommandCenter({ state, clients, projects, navigate }: { state: AppState; clients: Client[]; projects: Project[]; navigate: (path: string) => void }) {
  const blocked = projects.filter((project) => project.health === "Blocked" || evaluateGate(project).length > 0);
  const launch = projects.filter((project) => ["Launch Authorization", "Launch"].includes(project.stage));
  const work = projects.flatMap((project) => project.requests);
  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Portfolio command center</p>
          <h2>{clients.length} clients · {projects.length} active projects</h2>
          <p>{state.aiRecords[0]?.response}</p>
        </div>
        <div className="health critical">{blocked.length} blockers</div>
      </section>
      <section className="kpi-grid">
        <Metric label="Launch candidates" value={launch.length} detail="Require explicit approval" />
        <Metric label="Work queue" value={work.length} detail="Concurrent requests" />
        <Metric label="Margin risk" value={clients.filter((client) => client.marginRisk === "High").length} detail="Executive review" />
        <Metric label="Alerts" value={state.notifications.filter((note) => !note.read).length} detail="Unread operations signals" />
      </section>
      <section className="split">
        <Panel icon={<ShieldCheck />} title="Project Pipeline" action="Deep links">
          {projects.map((project) => <button className="row-action" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}>{project.name}<span>{project.stage}</span></button>)}
        </Panel>
        <Panel icon={<Activity />} title="Integration Health" action="Mock adapters">
          <div className="integration-grid">{state.integrations.map((integration) => <span className={`pill ${integration.state.toLowerCase()}`} key={integration.id}>{integration.name}: {integration.state}</span>)}</div>
        </Panel>
      </section>
    </>
  );
}

function Clients({ clients, query, setQuery, navigate, canCreate, onCreate }: { clients: Client[]; query: string; setQuery: (value: string) => void; navigate: (path: string) => void; canCreate: boolean; onCreate: () => void }) {
  const filtered = clients.filter((client) => `${client.name} ${client.ticker}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <Panel icon={<Users />} title="Client Portfolio" action={`${filtered.length} visible`}>
      <div className="control-row"><Search size={18} /><input aria-label="Search clients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, tickers, sectors" />{canCreate && <button onClick={onCreate}><Plus size={16} /> Client</button>}</div>
      <div className="record-grid">{filtered.map((client) => <button className="record" key={client.id} onClick={() => navigate(`/clients/${client.id}`)}><strong>{client.name}</strong><span>{client.ticker} · {client.health}</span><small>{client.activity[0]}</small></button>)}</div>
    </Panel>
  );
}

function ClientDetail({ client, projects, user, navigate, onArchive }: { client: Client; projects: Project[]; user: User; navigate: (path: string) => void; onArchive: () => void }) {
  return (
    <Panel icon={<Gauge />} title={client.name} action={client.ticker}>
      <div className="section-tabs"><span>Overview</span><span>Contacts</span><span>Websites</span><span>Projects</span><span>Requests</span><span>Assets</span><span>Approvals</span><span>Integrations</span><span>Account health</span><span>Activity</span>{hasPermission(user, "financial:view") && <span>Financials: {client.revenueSignal}</span>}</div>
      <div className="record-grid">
        {client.contacts.map((contact) => <article className="record" key={contact.id}><strong>{contact.name}</strong><span>{contact.title}</span><small>{contact.email}</small></article>)}
        {client.websites.map((site) => <article className="record" key={site.id}><strong>{site.domain}</strong><span>{site.type}</span><small>{site.status}</small></article>)}
        {projects.map((project) => <button className="record" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}><strong>{project.name}</strong><span>{project.stage}</span><small>{evaluateGate(project).length} gate blockers</small></button>)}
      </div>
      {hasPermission(user, "client:archive") && <button className="danger" onClick={onArchive}><Archive size={16} /> Archive client</button>}
    </Panel>
  );
}

function Projects({ projects, clients, navigate, canCreate, onCreate }: { projects: Project[]; clients: Client[]; navigate: (path: string) => void; canCreate: boolean; onCreate: () => void }) {
  return <Panel icon={<ShieldCheck />} title="Projects" action="Lifecycle controlled">{canCreate && <button onClick={onCreate}><Plus size={16} /> Project</button>}<div className="record-grid">{projects.map((project) => <button className="record" key={project.id} onClick={() => navigate(`/projects/${project.id}`)}><strong>{project.name}</strong><span>{clients.find((client) => client.id === project.clientId)?.name}</span><small>{project.stage} · due {project.deadline}</small></button>)}</div></Panel>;
}

function ProjectDetail({ project, client, overrideReason, setOverrideReason, requestText, setRequestText, commit }: { project: Project; client: Client; overrideReason: string; setOverrideReason: (value: string) => void; requestText: string; setRequestText: (value: string) => void; commit: (mutator: (draft: AppState, actor: User) => AppState, success: string) => void }) {
  const missing = evaluateGate(project);
  return (
    <>
      <Panel icon={<ShieldCheck />} title={project.name} action={`${client.name} · ${project.stage}`}>
        <div className="timeline">{["Overview", "Gates", "Tasks", "Assets", "Approvals", "Scope", "Handoff", "QA", "Launch", "Deployment", "Audit"].map((item) => <span key={item}>{item}</span>)}</div>
        <h3>Missing Requirements</h3>
        {missing.length ? missing.map((item) => <p className="blocker" key={item}>{item}</p>) : <p>No blockers for this stage.</p>}
        <div className="control-row"><input value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Override reason, if needed" /><button onClick={() => commit((draft, actor) => {
          const result = advanceProject(draft, project.id, actor, overrideReason);
          if (!result.ok) throw new Error(result.message);
          return result.state;
        }, "Lifecycle action completed.")}>Advance</button></div>
      </Panel>
      <section className="split">
        <Panel icon={<FileCheck2 />} title="Evidence Panel" action="Requirements, QA, approvals">
          {project.requirements.filter((requirement) => requirement.stage === project.stage || !requirement.complete).slice(0, 5).map((requirement) => <button className="row-action" disabled={requirement.complete} key={requirement.id} onClick={() => commit((draft, actor) => completeRequirement(draft, project.id, requirement.id, actor, `${requirement.label} evidence recorded.`), "Requirement completed.")}>{requirement.complete ? "Complete" : "Complete"}<span>{requirement.label}</span></button>)}
          {project.qaRuns.flatMap((run) => run.findings).map((finding) => <button className="row-action" disabled={finding.resolved} key={finding.id} onClick={() => commit((draft, actor) => resolveFinding(draft, project.id, finding.id, actor, "Accessibility evidence attached."), "QA finding resolved.")}>Resolve<span>{finding.label}</span></button>)}
        </Panel>
        <Panel icon={<Sparkles />} title="Request Intake" action="Structured scope recommendation">
          <div className="control-row"><input aria-label="Request description" value={requestText} onChange={(event) => setRequestText(event.target.value)} /><button onClick={() => commit((draft, actor) => addRequest(draft, actor, project.id, requestText), "Request created and classified.")}>Classify</button></div>
          {project.requests.map((request) => <article className="record" key={request.id}><strong>{request.title}</strong><span>{request.recommendation.classification} · {Math.round(request.recommendation.confidence * 100)}%</span><small>{request.recommendation.explanation}</small></article>)}
        </Panel>
      </section>
    </>
  );
}

function Requests({ projects, requestText, setRequestText, commit }: { projects: Project[]; requestText: string; setRequestText: (value: string) => void; commit: (mutator: (draft: AppState, actor: User) => AppState, success: string) => void }) {
  const project = projects[0];
  return <Panel icon={<Sparkles />} title="Requests" action="Create, classify, escalate, resolve">{project && <div className="control-row"><input aria-label="Request description" value={requestText} onChange={(event) => setRequestText(event.target.value)} /><button onClick={() => commit((draft, actor) => addRequest(draft, actor, project.id, requestText), "Request created.")}>Create request</button></div>}<div className="record-grid">{projects.flatMap((item) => item.requests).map((request) => <article className="record" key={request.id}><strong>{request.title}</strong><span>{request.recommendation.classification}</span><small>{request.status} · human review {request.recommendation.humanReviewRequired ? "required" : "optional"}</small></article>)}</div></Panel>;
}

function LaunchCenter({ projects, user, commit }: { projects: Project[]; user: User; commit: (mutator: (draft: AppState, actor: User) => AppState, success: string) => void }) {
  const launchProjects = projects.filter((project) => ["Launch Authorization", "Launch"].includes(project.stage));
  return <Panel icon={<Rocket />} title="Launch Center" action="No checkbox launches">{launchProjects.map((project) => <article className="record" key={project.id}><strong>{project.name}</strong><span>{evaluateGate(project).length} readiness blockers</span><small>Release {project.launchReadiness.releaseId}</small><div className="control-row">{hasPermission(user, "launch:authorize") && <button onClick={() => commit((draft, actor) => recordApproval(draft, project.id, actor, { type: "Launch", source: actor.role.startsWith("Client") ? "Client" : "Internal", decision: "Approved", artifactVersion: project.launchReadiness.releaseId ?? "release", note: "Launch authorization recorded with evidence." }), "Approval recorded.")}>Authorize</button>}{hasPermission(user, "deployment:prepare") && <button onClick={() => commit((draft, actor) => prepareDeployment(draft, project.id, actor), "Deployment prepared.")}>Prepare</button>}{hasPermission(user, "deployment:complete") && <button onClick={() => commit((draft, actor) => completeDeployment(draft, project.id, actor), "Deployment completed.")}>Complete deployment</button>}</div></article>)}</Panel>;
}

function Knowledge({ state, user }: { state: AppState; user: User }) {
  return <Panel icon={<Brain />} title="Knowledge Base" action="Drafts, verification, approvals">{state.knowledge.map((article) => <article className="record" key={article.id}><strong>{article.title}</strong><span>{article.category} · {article.status}</span><small>Owner {article.owner} · verified {article.verified}</small></article>)}{!hasPermission(user, "knowledge:publish") && <p className="error">Publishing is restricted for your role.</p>}</Panel>;
}

function CustomerSuccess({ state, clients }: { state: AppState; clients: Client[] }) {
  return <Panel icon={<Gauge />} title="Customer Success" action="Reviews and account health"><div className="record-grid">{state.csReviews.filter((review) => clients.some((client) => client.id === review.clientId)).map((review) => <article className="record" key={review.id}><strong>{clients.find((client) => client.id === review.clientId)?.name}</strong><span>{review.cadence} · {review.renewalHealth}</span><small>{review.expansionOpportunity}</small></article>)}</div></Panel>;
}

function Governance({ state, user, commit }: { state: AppState; user: User; commit: (mutator: (draft: AppState, actor: User) => AppState, success: string) => void }) {
  return <Panel icon={<Lock />} title="Governance" action="Roles, workflows, integrations, audit"><div className="record-grid"><article className="record"><strong>Roles and permissions</strong><span>{Object.keys(permissionMatrix).length} roles</span><small>{hasPermission(user, "roles:manage") ? "Manageable" : "Read-only"}</small></article><article className="record"><strong>Workflow templates</strong><span>{state.workflowTemplates[0].name}</span><small>{state.workflowTemplates[0].stages.length} stages</small></article>{state.integrations.map((integration) => <button className="record" key={integration.id} onClick={() => commit((draft, actor) => runIntegration(draft, integration.id, actor, integration.state === "Failed" ? "Recovered" : "Failed" as IntegrationState), "Integration simulation recorded.")}><strong>{integration.name}</strong><span>{integration.state}</span><small>{integration.adapter}</small></button>)}<article className="record"><strong>Simulated append-only audit trail</strong><span>{state.audit.length} events</span><small>Browser-local, not server-immutable.</small></article></div>{hasPermission(user, "demo:reset") && <button className="danger" onClick={() => commit(() => resetState(), "Demo state reset.")}>Destructive demo reset</button>}</Panel>;
}

function Settings({ state }: { state: AppState }) {
  return <Panel icon={<KeyRound />} title="Settings" action="Simulation configuration"><div className="record-grid">{state.users.map((user) => <article className="record" key={user.id}><strong>{user.name}</strong><span>{user.email}</span><small>{user.role}</small></article>)}</div></Panel>;
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Panel({ icon, title, action, children }: { icon: ReactNode; title: string; action: string; children: ReactNode }) {
  return <section className="panel"><header><span className="panel-icon">{icon}</span><h2>{title}</h2><em>{action}</em></header>{children}</section>;
}

function CreateState({ label, onCreate }: { label: string; onCreate: () => void }) {
  return <Panel icon={<Plus />} title={label} action="Validated demo form"><p>This local alpha creates a deterministic demo record with audit history.</p><button onClick={onCreate}><Plus size={16} /> {label}</button></Panel>;
}

function createClient(state: AppState, user: User): AppState {
  assertPermission(user, "client:create");
  const id = `client-demo-${state.clients.length + 1}`;
  const client: Client = { id, name: `Demo Public Company ${state.clients.length + 1}`, ticker: "NASDAQ: DEMO", industry: "Simulated issuer", health: "Healthy", archived: false, services: ["Corporate website"], revenueSignal: "$72k ARR simulated", marginRisk: "Low", contacts: [], websites: [], activity: ["Created through VendorOS demo form."] };
  return { ...state, clients: [client, ...state.clients] };
}

function archiveClient(state: AppState, user: User, clientId: string): AppState {
  assertPermission(user, "client:archive");
  return { ...state, clients: state.clients.map((client) => (client.id === clientId ? { ...client, archived: true } : client)) };
}

function createProject(state: AppState, user: User): AppState {
  assertPermission(user, "project:create");
  const client = state.clients.find((candidate) => !candidate.archived)!;
  const project: Project = { ...state.projects[0], id: `project-demo-${state.projects.length + 1}`, clientId: client.id, name: `Demo Project ${state.projects.length + 1}`, stage: "Sales", health: "Healthy", archived: false, requests: [], approvals: [], scopeChanges: [], deployments: [], debriefs: [] };
  return { ...state, projects: [project, ...state.projects] };
}

function addRequest(state: AppState, user: User, projectId: string, text: string): AppState {
  assertPermission(user, "scope:create");
  const project = state.projects.find((candidate) => candidate.id === projectId);
  if (!project) throw new Error("Project not found");
  if (project.requests.some((request) => request.description.toLowerCase() === text.toLowerCase())) throw new Error("Duplicate request detected.");
  const recommendation = classifyRequest(text);
  const request = { id: crypto.randomUUID(), clientId: project.clientId, projectId, title: text.slice(0, 72), description: text, recommendation, severity: recommendation.classification === "Emergency issue" ? "Emergency" as const : "Medium" as const, complianceSensitive: /ir|investor|filing|stock/i.test(text), owner: recommendation.commercialImpact ? "Executive" as const : "Operations Manager" as const, due: "2026-07-15", status: recommendation.commercialImpact ? "Escalated" as const : "Open" as const };
  return { ...state, projects: state.projects.map((candidate) => candidate.id === projectId ? { ...candidate, requests: [request, ...candidate.requests], scopeChanges: recommendation.commercialImpact ? [{ id: crypto.randomUUID(), requestId: request.id, projectId, impact: "Both", approved: false }, ...candidate.scopeChanges] : candidate.scopeChanges } : candidate) };
}

function titleForPath(path: string) {
  if (path === "/") return "Command Center";
  if (path.includes("governance")) return "Governance";
  return path.split("/").filter(Boolean)[0]?.replace("-", " ") ?? "Command Center";
}

function knownRoute(path: string) {
  return path === "/" || ["/clients", "/clients/new", "/projects", "/projects/new", "/requests", "/launch", "/knowledge", "/customer-success", "/governance", "/governance/roles", "/governance/workflows", "/governance/automations", "/governance/audit", "/settings"].includes(path) || path.startsWith("/clients/") || path.startsWith("/projects/") || path.startsWith("/requests/");
}
