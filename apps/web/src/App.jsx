import { useEffect, useState } from "react";
import { mockReport } from "./mockReport";

const versionOptions = {
  java: ["Java 21", "Java 25"],
  angular: ["Angular 20", "Angular 21"],
  react: ["React 19"]
};

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const nav = [
  ["home", "Home", "Project intake and summary"],
  ["overview", "Overview", "Metrics and stack inventory"],
  ["analysis", "Analysis", "Findings and risk review"],
  ["documentation", "Documentation", "Generated guidance"],
  ["roadmap", "Roadmap", "Migration phases and effort"]
];

const sampleFallbacks = [
  { label: "Java / Oracle Legacy Sample", repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\java-oracle-legacy", projectType: "java", database: "oracle" },
  { label: "Angular / MS SQL Legacy Sample", repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\angular-mssql-legacy", projectType: "angular", database: "mssql" },
  { label: "React Legacy Sample", repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\react-legacy", projectType: "react", database: "none" }
];

const normalize = (item) => {
  if (item == null) return null;
  if (typeof item === "string" || typeof item === "number") return { title: String(item), detail: "", meta: "" };
  return {
    title: item.title ?? item.name ?? item.label ?? item.phase ?? item.category ?? "Item",
    detail: item.detail ?? item.description ?? item.summary ?? item.note ?? item.body ?? "",
    meta: item.meta ?? item.status ?? item.effort ?? item.value ?? item.version ?? item.scope ?? ""
  };
};

const list = (items, fallback = []) => (Array.isArray(items) && items.length ? items : fallback).map(normalize).filter(Boolean);
const titleCase = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const label = (item) => item?.title || item?.label || item?.name || "Item";
const detail = (item) => item?.detail || item?.summary || item?.note || item?.description || "";
const meta = (item) => item?.meta || item?.status || item?.effort || item?.value || item?.version || "";

function MetricCard({ label, value, accent, detail }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

function Panel({ eyebrow, title, description, children }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Hero({ report, samples, onApplySample, repoUrl, setRepoUrl, projectType, setProjectType, database, setDatabase, targetVersion, setTargetVersion, targetOptions, onSubmit, loading }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Application modernization workspace</p>
        <h1>Understand a legacy repo and shape the migration plan with confidence.</h1>
        <p className="hero-text">
          LegacyModernizeAI inspects Java, Angular, and React applications, captures stack and dependency context, and turns the output into a clearer plan for analysis, documentation, and modernization work.
        </p>
        <div className="hero-highlights">
          <article><strong>{report.readinessScore ?? "-"}/100</strong><span>Readiness score</span></article>
          <article><strong>{report.metrics?.securityIssues ?? "-"}</strong><span>Security issues</span></article>
          <article><strong>{report.metrics?.manualMigrationWeeks ?? "-"}w</strong><span>Manual effort</span></article>
        </div>
      </div>

      <form className="intake-card" onSubmit={onSubmit}>
        <div className="card-heading">
          <span>Quick start</span>
          <h2>Run a modernization scan</h2>
        </div>
        <div className="sample-row">
          {samples.map((sample) => (
            <button key={sample.label} type="button" className="sample-chip" onClick={() => onApplySample(sample)}>{sample.label}</button>
          ))}
        </div>
        <label>Repository URL or local path<input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} /></label>
        <div className="form-grid">
          <label>Project type
            <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              <option value="java">Java / Spring</option>
              <option value="angular">Angular</option>
              <option value="react">React</option>
            </select>
          </label>
          <label>Database
            <select value={database} onChange={(e) => setDatabase(e.target.value)}>
              <option value="oracle">Oracle / PL-SQL</option>
              <option value="mssql">MS SQL Server</option>
              <option value="none">No database</option>
            </select>
          </label>
        </div>
        <label>Target version
          <select value={targetVersion} onChange={(e) => setTargetVersion(e.target.value)}>
            {targetOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loading}>{loading ? "Analyzing..." : "Generate modernization plan"}</button>
      </form>
    </section>
  );
}
function Overview({ report }) {
  const tech = list(report.technologies, [report.detectedProjectType || "Legacy application"]);
  const dbs = list(report.databases, [report.database || "No database selected"]);
  const libs = list(report.detectedLibraries || report.libraries, [report.currentVersion || "Runtime baseline unavailable"]);
  const summary = [
    ["Repository", report.repoUrl || "Not provided"],
    ["Source", report.sourceType || "demo"],
    ["Files scanned", report.analyzedFilesCount ?? "-"],
    ["Analyzed at", report.analyzedAt ? new Date(report.analyzedAt).toLocaleString() : "Pending"]
  ];

  return (
    <Panel eyebrow="Overview" title="Snapshot of the current codebase" description="A concise view of the detected stack, repository metadata, and modernization readiness.">
      <div className="summary-strip">{summary.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="stack-columns">
        {[["Technologies", tech], ["Databases", dbs], ["Libraries", libs]].map(([title, items]) => (
          <article key={title}><h3>{title}</h3><div className="tag-cloud">{items.map((item) => <span key={`${title}-${label(item)}`}>{label(item)}</span>)}</div></article>
        ))}
      </div>
    </Panel>
  );
}

function Analysis({ report, groups }) {
  return (
    <Panel eyebrow="Analysis" title="Findings and risk review" description="Highlights of the areas that are most likely to affect modernization effort, stability, and security.">
      <div className="analysis-grid">
        {groups.map((group) => (
          <article key={group.title} className="analysis-card">
            <h3>{group.title}</h3>
            <ul>{group.items.length ? group.items.map((item) => <li key={`${group.title}-${label(item)}`}><strong>{label(item)}</strong>{detail(item) ? <span>{detail(item)}</span> : null}</li>) : <li>No findings were provided for this area.</li>}</ul>
          </article>
        ))}
      </div>
      <div className="highlight-row">
        <article><span>Security issues</span><strong>{report.metrics?.securityIssues ?? "-"}</strong></article>
        <article><span>Complexity hotspots</span><strong>{report.metrics?.complexityHotspots ?? "-"}</strong></article>
        <article><span>Maintainability gain</span><strong>{report.metrics?.maintainabilityGainPercent ?? "-"}%</strong></article>
      </div>
    </Panel>
  );
}

function Documentation({ report }) {
  const docs = list(report.docsRows, report.documentationSections?.map((item) => ({ title: item })) || [
    { title: "Modernization notes", detail: "Document the target runtime, package updates, and dependency decisions." },
    { title: "Ownership map", detail: "Capture service boundaries, business ownership, and review responsibilities." },
    { title: "Release guidance", detail: "Summarize build, test, deployment, and rollback steps for the migrated system." }
  ]);
  return (
    <Panel eyebrow="Documentation" title="Generated project guidance" description="Reference material for engineering handoff, onboarding, and migration follow-through.">
      <div className="docs-table">
        <div className="docs-head">
          <span>Section</span>
          <span>Focus</span>
          <span>Confluence link</span>
        </div>
        {docs.map((row) => (
          <div key={label(row)} className="docs-row">
            <div>
              <strong>{label(row)}</strong>
              {detail(row) ? <p>{detail(row)}</p> : null}
            </div>
            <span>{meta(row) || "Documentation"}</span>
            <a href={row.link || "https://confluence.example.com/display/LM/Modernization+Workspace"} target="_blank" rel="noreferrer">
              Open page
            </a>
          </div>
        ))}
      </div>
      <div className="docs-grid">
        {docs.map((row) => (
          <article key={label(row)} className="doc-card">
            <span>{meta(row) || "Documentation"}</span>
            <h3>{label(row)}</h3>
            {detail(row) ? <p>{detail(row)}</p> : null}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Roadmap({ report }) {
  const phases = list(report.roadmapSections || report.roadmap?.phases, report.upgradePlan?.map((item) => ({ title: item.phase, detail: item.detail })) || []);
  const manualWeeks = report.metrics?.manualMigrationWeeks ?? "-";
  const assistedWeeks = report.metrics?.codexAssistedWeeks ?? "-";
  const roadmapSummary = report.roadmap?.summary || "A staged path from the current stack to a more maintainable target baseline.";
  return (
    <Panel eyebrow="Roadmap" title="Migration sequence and effort" description="A practical path from current state to a more maintainable target stack, with effort framing for planning.">
      <p className="muted roadmap-summary">{roadmapSummary}</p>
      <div className="summary-strip">
        <div><span>Manual migration</span><strong>{manualWeeks} weeks</strong></div>
        <div><span>With AI assistance</span><strong>{assistedWeeks} weeks</strong></div>
        <div><span>Current stack</span><strong>{report.currentVersion || "Unavailable"}</strong></div>
        <div><span>Target stack</span><strong>{report.targetVersion || "Unavailable"}</strong></div>
      </div>
      <div className="roadmap-grid">
        {phases.length ? phases.map((item, index) => <article key={`${label(item)}-${index}`} className="roadmap-card"><span>Phase {index + 1}</span><h3>{label(item)}</h3>{detail(item) ? <p>{detail(item)}</p> : null}</article>) : <article className="roadmap-card"><span>Roadmap</span><h3>No roadmap data available</h3><p>The backend did not return roadmap sections for this analysis.</p></article>}
      </div>
      <div className="columns">
        <article><h3>Can accelerate</h3><ul>{list(report.canAccelerate, ["Dependency inventory and version mapping", "Upgrade sequencing and risk summaries", "Documentation draft generation"]).map((item) => <li key={label(item)}>{label(item)}</li>)}</ul></article>
        <article><h3>Needs manual review</h3><ul>{list(report.cannotAutomate, ["Business-rule validation for high-risk workflows", "Manual sign-off for schema-breaking database changes"]).map((item) => <li key={label(item)}>{label(item)}</li>)}</ul></article>
      </div>
    </Panel>
  );
}
export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [projectType, setProjectType] = useState("java");
  const [database, setDatabase] = useState("oracle");
  const [repoUrl, setRepoUrl] = useState(sampleFallbacks[0].repoUrl);
  const [targetVersion, setTargetVersion] = useState(versionOptions.java[0]);
  const [report, setReport] = useState(mockReport);
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState(sampleFallbacks);
  const [selectedTechnologyKey, setSelectedTechnologyKey] = useState("");
  const [selectedDatabaseKey, setSelectedDatabaseKey] = useState("");
  const technologies = Array.isArray(report.technologies) ? report.technologies : [];
  const databases = Array.isArray(report.databases) ? report.databases : [];
  const selectedTechnology = technologies.find((item) => item.key === selectedTechnologyKey) || technologies[0];
  const selectedDatabase = databases.find((item) => item.key === selectedDatabaseKey) || databases[0];
  const targetOptions = selectedTechnology?.targetVersions?.length ? selectedTechnology.targetVersions : report.availableTargetVersions?.length ? report.availableTargetVersions : versionOptions[projectType];

  useEffect(() => { setTargetVersion(versionOptions[projectType][0]); }, [projectType]);
  useEffect(() => {
    setSelectedTechnologyKey(technologies[0]?.key || "");
    setSelectedDatabaseKey(databases[0]?.key || "");
  }, [report]);
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiBase}/api/samples`);
        setSamples(response.ok ? (await response.json()) : sampleFallbacks);
      } catch {
        setSamples(sampleFallbacks);
      }
    })();
  }, []);

  const groups = (() => {
    if (report.findings && !Array.isArray(report.findings) && typeof report.findings === "object") {
      return Object.entries(report.findings).map(([title, items]) => ({
        title: titleCase(title),
        items: list(items)
      }));
    }
    if (Array.isArray(report.findings) && report.findings.length) {
      const bucket = new Map();
      report.findings.forEach((finding) => {
        const key = titleCase(finding.category ?? finding.group ?? finding.type ?? "General");
        if (!bucket.has(key)) bucket.set(key, []);
        bucket.get(key).push(normalize(finding));
      });
      return Array.from(bucket.entries()).map(([title, items]) => ({ title, items }));
    }
    return [
      { title: "Security", items: list(report.securityHotspots, ["Outdated dependencies need upgrading.", "Authentication flows should be reviewed for hardening."]) },
      { title: "Complexity", items: list(report.complexityHotspots, ["Service classes exceed manageable complexity thresholds.", "Controller and repository coupling slows upgrades."]) },
      { title: "Database", items: list(report.databaseNotes, ["Stored procedure dependencies should be mapped before schema changes.", "Dynamic SQL blocks require manual review for security and performance."]) }
    ];
  })();

  function applySample(sample) {
    setRepoUrl(sample.repoUrl);
    setProjectType(sample.projectType);
    setDatabase(sample.database);
    setTargetVersion(versionOptions[sample.projectType][0]);
    setActiveView("home");
  }

  async function runAnalysis(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, projectType, database, selectedTargetVersion: targetVersion })
      });
      if (!response.ok) throw new Error("analysis failed");
      const data = await response.json();
      setReport(data);
      setTargetVersion(data.targetVersion || targetVersion);
      setActiveView("overview");
    } catch {
      setReport({
        ...mockReport,
        repoUrl,
        targetVersion,
        detectedProjectType: projectType,
        database: database === "oracle" ? "Oracle / PL-SQL" : database === "mssql" ? "MS SQL Server" : "No database selected"
      });
      setActiveView("overview");
    } finally {
      setLoading(false);
    }
  }

  const pageTitle = ({ home: "Home", overview: "Overview", analysis: "Analysis", documentation: "Documentation", roadmap: "Roadmap" }[activeView] || "Home");

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">LM</span><div><strong>LegacyModernizeAI</strong><span>Modernization planning workspace</span></div></div>
        <nav className="topnav" aria-label="Primary navigation">
          {nav.map(([id, title, desc]) => (
            <button key={id} type="button" className={id === activeView ? "nav-link active" : "nav-link"} onClick={() => setActiveView(id)} aria-current={id === activeView ? "page" : undefined}>
              <span>{title}</span><small>{desc}</small>
            </button>
          ))}
        </nav>
      </header>

      <section className="page-banner">
        <div><p className="eyebrow">Current view</p><h2>{pageTitle}</h2></div>
        <div className="banner-chip"><span>Target</span><strong>{report.targetVersion || targetVersion}</strong></div>
      </section>

      {activeView === "home" ? (
        <>
          <Hero {...{ report, samples, onApplySample: applySample, repoUrl, setRepoUrl, projectType, setProjectType, database, setDatabase, targetVersion, setTargetVersion, targetOptions, onSubmit: runAnalysis, loading }} />
          <section className="home-support-grid">
            <article className="support-card"><span>What the scan covers</span><h3>Stack inventory, findings, documentation, and migration effort</h3><p>The report is organized so product owners and engineers can quickly review current state, risk areas, supporting docs, and the next recommended steps.</p></article>
            <article className="support-card"><span>Sample inputs</span><h3>Switch between representative legacy projects</h3><p>Choose a sample to preload a project path, stack type, database profile, and target version before running the analysis.</p></article>
          </section>
        </>
      ) : (
        <>
          <section className="metrics-grid">
            <MetricCard label="Readiness score" value={`${report.readinessScore ?? "-"}/100`} accent="#d85d39" detail="A quick view of modernization confidence." />
            <MetricCard label="Security issues" value={report.metrics?.securityIssues ?? "-"} accent="#c94e63" detail="Items that deserve attention before migration." />
            <MetricCard label="Complexity hotspots" value={report.metrics?.complexityHotspots ?? "-"} accent="#c88c1f" detail="Areas likely to slow change execution." />
            <MetricCard label="Effort reduction" value={`${report.metrics?.maintainabilityGainPercent ?? "-"}%`} accent="#2f966f" detail="Estimated maintainability improvement after the upgrade." />
          </section>
          {activeView === "overview" ? <Overview report={report} /> : null}
          {activeView === "overview" && (technologies.length > 1 || databases.length > 1) ? (
            <Panel eyebrow="Selection" title="Detected stack and data profiles" description="Projects can include multiple technologies, frameworks, and database styles. Use these selectors to focus the view while reviewing the analysis.">
              <div className="form-grid">
                <label>Detected technology
                  <select value={selectedTechnologyKey} onChange={(event) => { const next = technologies.find((item) => item.key === event.target.value); setSelectedTechnologyKey(event.target.value); if (next?.targetVersions?.[0]) setTargetVersion(next.targetVersions[0]); }}>
                    {technologies.map((item) => <option key={item.key} value={item.key}>{item.label}{item.currentVersion ? ` - ${item.currentVersion}` : ""}</option>)}
                  </select>
                </label>
                <label>Detected database
                  <select value={selectedDatabaseKey} onChange={(event) => setSelectedDatabaseKey(event.target.value)}>
                    {databases.map((item) => <option key={item.key} value={item.key}>{item.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="summary-strip">
                <div><span>Focused technology</span><strong>{selectedTechnology?.label || report.detectedProjectType}</strong></div>
                <div><span>Current version</span><strong>{selectedTechnology?.currentVersion || report.currentVersion}</strong></div>
                <div><span>Target options</span><strong>{(selectedTechnology?.targetVersions || targetOptions).join(", ")}</strong></div>
                <div><span>Focused database</span><strong>{selectedDatabase?.title || report.database}</strong></div>
              </div>
            </Panel>
          ) : null}
          {activeView === "analysis" ? <Analysis report={report} groups={groups} /> : null}
          {activeView === "documentation" ? <Documentation report={report} /> : null}
          {activeView === "roadmap" ? <Roadmap report={report} /> : null}
        </>
      )}
    </main>
  );
}
