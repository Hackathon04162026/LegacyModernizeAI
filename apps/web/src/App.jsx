import { useEffect, useState } from "react";
import { mockReport } from "./mockReport";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const nav = [
  ["home", "Home", "Quick scan"],
  ["overview", "Overview", "Metrics and inventory"],
  ["analysis", "Analysis", "Security and complexity"],
  ["documentation", "Documentation", "Confluence-ready notes"],
  ["roadmap", "Roadmap", "Migration steps"],
];

const technologyTargets = {
  java: ["Java 21", "Java 25"],
  angular: ["Angular 20", "Angular 21"],
  react: ["React 19"],
};

const databaseTargets = {
  oracle: ["Oracle 19c", "Oracle 21c"],
  mssql: ["SQL Server 2019", "SQL Server 2022"],
  postgres: ["PostgreSQL 16"],
  none: ["No database target"],
};

const libraryTargets = ["Latest stable", "Current major", "Keep current"];

const emptyText = "Pending quick analysis";

const normalize = (item) => {
  if (item == null) return null;
  if (typeof item === "string" || typeof item === "number") {
    return { title: String(item), detail: "", meta: "" };
  }

  return {
    title: item.title ?? item.name ?? item.label ?? item.phase ?? item.category ?? "Item",
    detail: item.detail ?? item.description ?? item.summary ?? item.note ?? item.body ?? "",
    meta: item.meta ?? item.status ?? item.effort ?? item.value ?? item.version ?? item.scope ?? "",
    link: item.link ?? "",
    key: item.key ?? item.id ?? item.name ?? item.label ?? item.title ?? "",
    currentVersion: item.currentVersion ?? "",
    targetVersions: item.targetVersions ?? [],
  };
};

const list = (items, fallback = []) => (Array.isArray(items) && items.length ? items : fallback).map(normalize).filter(Boolean);
const titleCase = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
const label = (item) => item?.title || item?.label || item?.name || "Item";
const detail = (item) => item?.detail || item?.summary || item?.note || item?.description || "";
const meta = (item) => item?.meta || item?.status || item?.effort || item?.value || item?.version || "";
const slug = (value) => String(value || "sample-project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const createEmptyGeneratedSample = () => ({
  title: "Sample project preview",
  folder: "",
  summary: "",
  lines: [],
});

function MetricCard({ label, value, accent, detail }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

function Panel({ eyebrow, title, description, children, compact = false }) {
  return (
    <section className={`panel ${compact ? "panel-compact" : ""}`}>
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FieldGroup({ labelText, children, hint }) {
  return (
    <label className="field-group">
      <span>{labelText}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function TargetSelect({ labelText, value, onChange, options, hint }) {
  return (
    <FieldGroup labelText={labelText} hint={hint}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldGroup>
  );
}

function LoadingBlock({ title, description, progress }) {
  return (
    <Panel eyebrow="Scanning" title={title} description={description}>
      <div className="loading-state">
        <span className="loading-spinner" aria-hidden="true" />
        <div>
          <strong>Analyzing repository structure...</strong>
          <p>The quick scan is reading manifests, stack markers, libraries, and database artifacts.</p>
          <div className="progress-block">
            <div className="progress-meta">
              <span>Quick analysis progress</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Overview({ report }) {
  const tech = list(report.technologies, []);
  const dbs = list(report.databases, []);
  const libs = list(report.detectedLibraries || report.libraries, []);
  const summary = [
    ["Repository", report.repoUrl || emptyText],
    ["Source", report.sourceType || emptyText],
    ["Files scanned", report.analyzedFilesCount ?? "-"],
    ["Analyzed at", report.analyzedAt ? new Date(report.analyzedAt).toLocaleString() : emptyText],
  ];

  return (
    <Panel eyebrow="Overview" title="Snapshot of the current codebase" description="A concise view of the detected stack, repository metadata, and modernization readiness.">
      <section className="metrics-grid metrics-grid-home">
        <MetricCard label="Readiness score" value={`${report.readinessScore ?? "-"}/100`} accent="#d85d39" detail="A fast view of modernization confidence." />
        <MetricCard label="Security issues" value={report.metrics?.securityIssues ?? "-"} accent="#c94e63" detail="Hotspots that need attention before the upgrade." />
        <MetricCard label="Complexity hotspots" value={report.metrics?.complexityHotspots ?? "-"} accent="#c88c1f" detail="Areas that may slow change execution." />
        <MetricCard label="Effort reduction" value={`${report.metrics?.maintainabilityGainPercent ?? "-"}%`} accent="#2f966f" detail="Estimated maintainability improvement after the migration." />
      </section>
      <div className="summary-strip">{summary.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      <div className="stack-columns">
        {[
          ["Technologies", tech, "No technologies detected yet."],
          ["Databases", dbs, "No databases detected yet."],
          ["Libraries", libs, "No libraries detected yet."],
        ].map(([title, items, fallback]) => (
          <article key={title}>
            <h3>{title}</h3>
            {items.length ? (
              <div className="tag-cloud">
                {items.map((item) => <span key={`${title}-${label(item)}`}>{label(item)}</span>)}
              </div>
            ) : (
              <p className="muted">{fallback}</p>
            )}
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Analysis({ report, groups }) {
  return (
    <Panel eyebrow="Analysis" title="Findings and risk review" description="Security, complexity, and PII hotspots that are likely to affect modernization effort.">
      <div className="analysis-grid">
        {groups.map((group) => (
          <article key={group.title} className="analysis-card">
            <h3>{group.title}</h3>
            <ul>
              {group.items.length ? group.items.map((item) => (
                <li key={`${group.title}-${label(item)}`}>
                  <strong>{label(item)}</strong>
                  {detail(item) ? <span>{detail(item)}</span> : null}
                </li>
              )) : <li>No findings were provided for this area.</li>}
            </ul>
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
  const docs = list(report.docsRows, report.documentationSections?.map((item) => ({ title: item })) || []);
  const fallbackDocs = [
    { title: "Modernization notes", detail: "Document the target runtime, package updates, and dependency decisions.", meta: "Architecture", link: "https://confluence.example.com/display/LM/Modernization+Workspace" },
    { title: "Ownership map", detail: "Capture service boundaries, business ownership, and review responsibilities.", meta: "Engineering", link: "https://confluence.example.com/display/LM/Modernization+Workspace" },
    { title: "Release guidance", detail: "Summarize build, test, deployment, and rollback steps for the migrated system.", meta: "Operations", link: "https://confluence.example.com/display/LM/Modernization+Workspace" },
  ];
  const rows = docs.length ? docs : fallbackDocs;

  return (
    <Panel eyebrow="Documentation" title="Generated project guidance" description="Reference material for handoff, onboarding, and migration follow-through.">
      <div className="docs-table">
        <div className="docs-head">
          <span>Section</span>
          <span>Focus</span>
          <span>Confluence link</span>
        </div>
        {rows.map((row) => (
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
        {rows.map((row) => (
          <article key={`doc-${label(row)}`} className="doc-card">
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
    <Panel eyebrow="Roadmap" title="Migration sequence and effort" description="A practical path from current state to a more maintainable target stack.">
      <p className="muted roadmap-summary">{roadmapSummary}</p>
      <div className="summary-strip">
        <div><span>Manual migration</span><strong>{manualWeeks} weeks</strong></div>
        <div><span>With AI assistance</span><strong>{assistedWeeks} weeks</strong></div>
        <div><span>Current stack</span><strong>{report.currentVersion || "Unavailable"}</strong></div>
        <div><span>Target stack</span><strong>{report.targetVersion || "Unavailable"}</strong></div>
      </div>
      <div className="roadmap-grid">
        {phases.length ? phases.map((item, index) => (
          <article key={`${label(item)}-${index}`} className="roadmap-card">
            <span>Phase {index + 1}</span>
            <h3>{label(item)}</h3>
            {detail(item) ? <p>{detail(item)}</p> : null}
          </article>
        )) : (
          <article className="roadmap-card">
            <span>Roadmap</span>
            <h3>No roadmap data available</h3>
            <p>The backend did not return roadmap sections for this analysis.</p>
          </article>
        )}
      </div>
      <div className="columns">
        <article>
          <h3>Can accelerate</h3>
          <ul>{list(report.canAccelerate, ["Dependency inventory and version mapping", "Upgrade sequencing and risk summaries", "Documentation draft generation"]).map((item) => <li key={label(item)}>{label(item)}</li>)}</ul>
        </article>
        <article>
          <h3>Needs manual review</h3>
          <ul>{list(report.cannotAutomate, ["Business-rule validation for high-risk workflows", "Manual sign-off for schema-breaking database changes"]).map((item) => <li key={label(item)}>{label(item)}</li>)}</ul>
        </article>
      </div>
    </Panel>
  );
}

function buildTargetOptionsForTechnology(tech) {
  return tech?.targetVersions?.length ? tech.targetVersions : technologyTargets[tech?.key] || ["Select a target"];
}

function buildTargetOptionsForDatabase(db) {
  return db?.targetVersions?.length ? db.targetVersions : databaseTargets[db?.key] || ["Select a target"];
}

function buildTargetOptionsForLibrary(library) {
  return library?.targetVersions?.length ? library.targetVersions : libraryTargets;
}

export default function App() {
  const [activeView, setActiveView] = useState("home");
  const [report, setReport] = useState(mockReport);
  const [repoUrl, setRepoUrl] = useState("");
  const [samples, setSamples] = useState([]);
  const [showSampleBrowser, setShowSampleBrowser] = useState(false);
  const [quickComplete, setQuickComplete] = useState(false);
  const [deepComplete, setDeepComplete] = useState(false);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [loadingDeep, setLoadingDeep] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [quickProgress, setQuickProgress] = useState(0);
  const [approvalChoice, setApprovalChoice] = useState("no");
  const [generatedSample, setGeneratedSample] = useState(createEmptyGeneratedSample());
  const [generatedReady, setGeneratedReady] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [technologyTargetsState, setTechnologyTargetsState] = useState({});
  const [databaseTargetsState, setDatabaseTargetsState] = useState({});
  const [libraryTargetsState, setLibraryTargetsState] = useState({});

  const technologies = list(report.technologies, []);
  const databases = list(report.databases, []);
  const libraries = list(report.detectedLibraries || report.libraries, []);
  const quickHasData = quickComplete && (technologies.length > 0 || databases.length > 0 || libraries.length > 0);

  const bannerSummary = deepComplete
    ? "Deep analysis unlocked"
    : quickComplete
      ? "Targets ready"
      : "Awaiting quick analysis";

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${apiBase}/api/samples`);
        if (!response.ok) throw new Error("samples failed");
        setSamples(await response.json());
      } catch {
        setSamples([]);
      }
    })();
  }, []);

  useEffect(() => {
    const nextTechTargets = {};
    technologies.forEach((tech, index) => {
      const key = tech.key || tech.title || `tech-${index}`;
      nextTechTargets[key] = technologyTargetsState[key] || buildTargetOptionsForTechnology(tech)[0] || "Select a target";
    });
    setTechnologyTargetsState(nextTechTargets);

    const nextDatabaseTargets = {};
    databases.forEach((db, index) => {
      const key = db.key || db.title || `db-${index}`;
      nextDatabaseTargets[key] = databaseTargetsState[key] || buildTargetOptionsForDatabase(db)[0] || "Select a target";
    });
    setDatabaseTargetsState(nextDatabaseTargets);

    const nextLibraryTargets = {};
    libraries.forEach((library, index) => {
      const key = library.key || library.name || library.title || `lib-${index}`;
      nextLibraryTargets[key] = libraryTargetsState[key] || buildTargetOptionsForLibrary(library)[0] || "Latest stable";
    });
    setLibraryTargetsState(nextLibraryTargets);
  }, [report]);

  const groups = (() => {
    if (report.findings && !Array.isArray(report.findings) && typeof report.findings === "object") {
      return Object.entries(report.findings).map(([groupTitle, items]) => ({ title: titleCase(groupTitle), items: list(items) }));
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
      { title: "PII", items: list(report.databaseNotes, ["Sensitive values should be masked or externalized before the migration."]) },
    ];
  })();

  const pageTitle = ({ home: "Home", overview: "Overview", analysis: "Analysis", documentation: "Documentation", roadmap: "Roadmap" }[activeView] || "Home");

  function buildTargetSelections() {
    return {
      technologies: technologies.map((tech, index) => {
        const key = tech.key || tech.title || `tech-${index}`;
        return {
          key,
          label: label(tech),
          currentVersion: tech.currentVersion || meta(tech) || null,
          targetVersion: technologyTargetsState[key] || buildTargetOptionsForTechnology(tech)[0]
        };
      }),
      databases: databases.map((db, index) => {
        const key = db.key || db.title || `db-${index}`;
        return {
          key,
          label: label(db),
          targetVersion: databaseTargetsState[key] || buildTargetOptionsForDatabase(db)[0]
        };
      }),
      libraries: libraries.map((library, index) => {
        const key = library.key || library.name || library.title || `lib-${index}`;
        return {
          key,
          name: label(library),
          family: library.family || null,
          currentVersion: library.version || meta(library) || null,
          targetVersion: libraryTargetsState[key] || buildTargetOptionsForLibrary(library)[0]
        };
      })
    };
  }

  function setInitialSelections(nextReport) {
    setReport(nextReport);
    setTechnologyTargetsState({});
    setDatabaseTargetsState({});
    setLibraryTargetsState({});
  }

  function applySample(sample) {
    setRepoUrl(sample.repoUrl || "");
    setShowSampleBrowser(false);
    setQuickComplete(false);
    setDeepComplete(false);
    setQuickError("");
    setQuickProgress(0);
    setGeneratedReady(false);
    setApprovalChoice("no");
    setGeneratedSample(createEmptyGeneratedSample());
    setReport({
      ...mockReport,
      repoUrl: sample.repoUrl || "",
      sourceType: "sample"
    });
  }

  async function runQuickAnalysis(event) {
    event.preventDefault();
    if (!repoUrl.trim()) return;

    setLoadingQuick(true);
    setQuickComplete(false);
    setDeepComplete(false);
    setQuickError("");
    setQuickProgress(6);
    setGeneratedReady(false);
    setApprovalChoice("no");
    setGeneratedSample(createEmptyGeneratedSample());
    const progressTimer = window.setInterval(() => {
      setQuickProgress((current) => {
        if (current >= 90) return current;
        if (current >= 72) return current + 3;
        if (current >= 45) return current + 6;
        return current + 9;
      });
    }, 260);

    try {
      let response = await fetch(`${apiBase}/api/analyze/quick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        response = await fetch(`${apiBase}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl }),
        });
      }

      if (!response.ok) throw new Error("analysis failed");
      const data = await response.json();
      window.clearInterval(progressTimer);
      setQuickProgress(100);
      setQuickComplete(true);
      setInitialSelections(data);
      setActiveView("home");
    } catch {
      window.clearInterval(progressTimer);
      setQuickComplete(false);
      setDeepComplete(false);
      setQuickError("Quick analysis failed. Check that the API is running and the repository path is valid, then try again.");
      setInitialSelections({ ...mockReport, repoUrl, analyzedAt: null, sourceType: "manual" });
      setActiveView("home");
    } finally {
      window.clearInterval(progressTimer);
      setLoadingQuick(false);
    }
  }

  async function runDeepAnalysis() {
    setLoadingDeep(true);
    try {
      const response = await fetch(`${apiBase}/api/analyze/deep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          targetSelections: buildTargetSelections()
        }),
      });

      if (!response.ok) throw new Error("analysis failed");
      const data = await response.json();
      setQuickComplete(true);
      setInitialSelections(data);
      setDeepComplete(true);
      setActiveView("home");
    } catch {
      setDeepComplete(true);
      setActiveView("home");
    } finally {
      setLoadingDeep(false);
    }
  }

  async function generateSampleProject() {
    const targetSelections = buildTargetSelections();

    setGeneratingSample(true);
    try {
      const response = await fetch(`${apiBase}/api/generate-sample`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: `${slug(repoUrl.split(/[\\/]/).filter(Boolean).pop() || "modernized-project")}-sample`,
          targetSelections
        }),
      });

      if (!response.ok) throw new Error("sample generation failed");
      const data = await response.json();
      const lines = [
        ...data.technologies.map((item) => `${item.label || item.name} -> ${item.targetVersion || item.value || "Selected"}`),
        ...data.databases.map((item) => `${item.label || item.name} -> ${item.targetVersion || item.value || "Selected"}`),
        ...data.libraries.map((item) => `${item.name || item.label} -> ${item.targetVersion || item.value || "Selected"}`)
      ];

      setGeneratedSample({
        title: data.projectName || "Generated sample project",
        folder: data.relativePath || data.outputRoot || "generated_samples",
        summary: data.summary || "A generated sample project is ready for review.",
        lines
      });
      setGeneratedReady(true);
    } catch {
      const techLines = targetSelections.technologies.map((tech) => `${tech.label} -> ${tech.targetVersion}`);
      const dbLines = targetSelections.databases.map((db) => `${db.label} -> ${db.targetVersion}`);
      const libraryLines = targetSelections.libraries.map((library) => `${library.name} -> ${library.targetVersion}`);
      const primaryTech = technologies[0]?.title || technologies[0]?.label || technologies[0]?.name || "modern-stack";

      setGeneratedSample({
        title: `${primaryTech} sample project`,
        folder: `generated_samples/${slug(primaryTech)}`,
        summary: "A sample preview is ready even though the API sample generation was unavailable.",
        lines: [...techLines, ...dbLines, ...libraryLines],
      });
      setGeneratedReady(true);
    } finally {
      setGeneratingSample(false);
    }
  }

  function renderPage() {
    if (activeView === "overview") return <Overview report={report} />;
    if (activeView === "analysis") return <Analysis report={report} groups={groups} />;
    if (activeView === "documentation") return <Documentation report={report} />;
    if (activeView === "roadmap") return <Roadmap report={report} />;
    return null;
  }

  return (
    <main className="app-shell">
      <header className="shell-header">
        <div className="header-row">
          <div className="brand-lockup">
            <span className="brand-mark">LM</span>
            <div>
              <strong>LegacyModernizeAI</strong>
              <span>Modernization planning workspace</span>
            </div>
          </div>
          <p className="header-blurb">
            Inspect legacy repositories, map technologies and libraries, then shape the target plan and sample output.
          </p>
          <div className="status-chip">
            <span>Phase</span>
            <strong>{deepComplete ? "Deep analysis complete" : quickComplete ? "Quick analysis complete" : "Awaiting scan"}</strong>
          </div>
        </div>

        <nav className="topnav" aria-label="Primary navigation">
          {nav.map(([id, title, desc]) => {
            const locked = id !== "home" && !deepComplete;
            return (
              <button
                key={id}
                type="button"
                className={id === activeView ? "nav-link active" : "nav-link"}
                onClick={() => {
                  if (!locked) setActiveView(id);
                }}
                disabled={locked}
                aria-disabled={locked}
                aria-current={id === activeView ? "page" : undefined}
                title={locked ? "Run deep analysis to unlock this page" : desc}
              >
                <span>{title}</span>
                <small>{desc}</small>
              </button>
            );
          })}
        </nav>
      </header>

      <section className="page-banner">
        <div>
          <p className="eyebrow">{pageTitle}</p>
          <h2>{deepComplete ? "Enterprise modernization workspace unlocked" : quickComplete ? "Quick analysis complete and target planning is ready" : "AI-assisted modernization planning for enterprise applications"}</h2>
          <p className="banner-description">
            LegacyModernizeAI analyzes legacy Java, Angular, and React repositories, detects frameworks, databases, and libraries, and turns that inventory into upgrade decisions, risk insights, documentation, and migration output.
          </p>
        </div>
        <div className="banner-chip">
          <span>Current target</span>
          <strong>{bannerSummary}</strong>
        </div>
      </section>

      {activeView === "home" ? (
        <div className="home-flow">
          <Panel eyebrow="Quick scan" title="Repository path and launch" description="Start with a repository path, then let the quick scan map the live technology, dependency, and database landscape before you choose targets.">
            <div className="launch-grid">
              <form className="quick-form quick-form-wide" onSubmit={runQuickAnalysis}>
                <FieldGroup labelText="Repository URL or local path" hint="No project is preloaded. Use one of the three sample folders or point to a real repository.">
                  <input
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder="D:\\Project\\LegacyModernizeAI\\sample_project\\java-oracle-legacy"
                  />
                </FieldGroup>
                <div className="launch-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowSampleBrowser((current) => !current)}>
                    {showSampleBrowser ? "Hide sample folders" : "Browse sample folders"}
                  </button>
                  <button type="submit" disabled={loadingQuick || !repoUrl.trim()}>
                    {loadingQuick ? "Running quick analysis..." : "Quick analysis"}
                  </button>
                </div>
              </form>

              {showSampleBrowser ? (
                <div className="sample-browser">
                  <span>Sample folders</span>
                  <div className="sample-browser-list">
                    {samples.length ? samples.map((sample) => (
                      <button key={sample.label} type="button" className="sample-pill" onClick={() => applySample(sample)}>
                        {sample.label}
                      </button>
                    )) : <p className="muted">Sample folders are temporarily unavailable. Paste a path manually.</p>}
                  </div>
                </div>
              ) : null}

              <aside className="spotlight-card">
                <span>Enterprise outcomes</span>
                <h3>From inventory to modernization action in a guided flow.</h3>
                <div className="spotlight-points">
                  <article>
                    <strong>Discover the real stack</strong>
                    <p>Surface main frameworks, supporting libraries, and database touchpoints from the repository itself.</p>
                  </article>
                  <article>
                    <strong>Decide the target baseline</strong>
                    <p>Choose technology, database, and library target versions before the deeper migration analysis starts.</p>
                  </article>
                  <article>
                    <strong>Generate a believable target sample</strong>
                    <p>Finish with a modernized sample output that mirrors the target decisions selected in the workspace.</p>
                  </article>
                </div>
              </aside>
            </div>
            {quickError ? <p className="error-banner">{quickError}</p> : null}
          </Panel>

          {quickHasData ? (
            <>
              <section className="insight-ribbon">
                <article>
                  <span>Quick scan summary</span>
                  <strong>{report.summary?.headline || "The repository has been profiled and is ready for target planning."}</strong>
                  <p>{report.summary?.nextStep || "Review the detected stack and select the desired target versions before running deep analysis."}</p>
                </article>
                <article>
                  <span>Focus area</span>
                  <strong>{report.summary?.focus || "Technology, libraries, and database signals are available for review."}</strong>
                  <p>{report.summary?.libraryNote || "Detected libraries will appear in the target section for modernization planning."}</p>
                </article>
              </section>

              <Panel eyebrow="Detected stack" title="Quick analysis results" description="Review the technologies, libraries, and databases discovered in the repository.">
                <div className="detected-grid">
                  <article className="detected-card">
                    <h3>Main technologies</h3>
                    {technologies.length ? technologies.map((tech) => (
                      <div key={`tech-${label(tech)}`} className="detected-item">
                        <strong>{label(tech)}</strong>
                        <span>{detail(tech) || tech.currentVersion || emptyText}</span>
                      </div>
                    )) : <p className="muted">{emptyText}</p>}
                  </article>
                  <article className="detected-card">
                    <h3>Libraries</h3>
                    {libraries.length ? libraries.map((library) => (
                      <div key={`lib-${label(library)}`} className="detected-item">
                        <strong>{label(library)}</strong>
                        <span>{detail(library) || meta(library) || emptyText}</span>
                      </div>
                    )) : <p className="muted">{emptyText}</p>}
                  </article>
                  <article className="detected-card">
                    <h3>Databases</h3>
                    {databases.length ? databases.map((db) => (
                      <div key={`db-${label(db)}`} className="detected-item">
                        <strong>{label(db)}</strong>
                        <span>{detail(db) || emptyText}</span>
                      </div>
                    )) : <p className="muted">{emptyText}</p>}
                  </article>
                </div>
              </Panel>

              <Panel eyebrow="Targets" title="Set the target versions" description="Select the runtime, database, and library targets before running the deep analysis.">
                <div className="targets-grid">
                  <article className="target-block">
                    <h3>Main technology targets</h3>
                    {technologies.length ? technologies.map((tech) => {
                      const key = tech.key || tech.title;
                      return (
                        <TargetSelect
                          key={`target-tech-${label(tech)}`}
                          labelText={label(tech)}
                          value={technologyTargetsState[key] || buildTargetOptionsForTechnology(tech)[0]}
                          options={buildTargetOptionsForTechnology(tech)}
                          hint={tech.currentVersion ? `Current: ${tech.currentVersion}` : "Choose a supported upgrade target."}
                          onChange={(value) => setTechnologyTargetsState((current) => ({ ...current, [key]: value }))}
                        />
                      );
                    }) : <p className="muted">Run quick analysis to reveal technology targets.</p>}
                  </article>

                  <article className="target-block">
                    <h3>Database targets</h3>
                    {databases.length ? databases.map((db) => {
                      const key = db.key || db.title;
                      return (
                        <TargetSelect
                          key={`target-db-${label(db)}`}
                          labelText={label(db)}
                          value={databaseTargetsState[key] || buildTargetOptionsForDatabase(db)[0]}
                          options={buildTargetOptionsForDatabase(db)}
                          hint={db.detail ? db.detail : "Choose a target version or keep the current database path."}
                          onChange={(value) => setDatabaseTargetsState((current) => ({ ...current, [key]: value }))}
                        />
                      );
                    }) : <p className="muted">Run quick analysis to reveal database targets.</p>}
                  </article>

                  <article className="target-block">
                    <h3>Library targets</h3>
                    {libraries.length ? libraries.map((library) => {
                      const key = library.key || library.name || library.title;
                      return (
                        <TargetSelect
                          key={`target-lib-${label(library)}`}
                          labelText={label(library)}
                          value={libraryTargetsState[key] || buildTargetOptionsForLibrary(library)[0]}
                          options={buildTargetOptionsForLibrary(library)}
                          hint={meta(library) ? `Current: ${meta(library)}` : "Select the desired target for this dependency."}
                          onChange={(value) => setLibraryTargetsState((current) => ({ ...current, [key]: value }))}
                        />
                      );
                    }) : <p className="muted">Run quick analysis to reveal library targets.</p>}
                  </article>
                </div>

                <div className="action-row">
                  <button type="button" onClick={runDeepAnalysis} disabled={loadingDeep || !quickComplete}>
                    {loadingDeep ? "Running deep analysis..." : "Deep analysis"}
                  </button>
                  <span className="action-hint">Deep analysis unlocks the overview, analysis, documentation, and roadmap pages.</span>
                </div>
              </Panel>

              {deepComplete ? (
                <Panel eyebrow="Final approval" title="Approve sample generation" description="Confirm the target selection before generating the sample project preview.">
                  <div className="decision-row">
                    <label className="decision-pill">
                      <input type="radio" name="approval" value="yes" checked={approvalChoice === "yes"} onChange={() => setApprovalChoice("yes")} />
                      <span>Yes, generate the sample</span>
                    </label>
                    <label className="decision-pill">
                      <input type="radio" name="approval" value="no" checked={approvalChoice === "no"} onChange={() => setApprovalChoice("no")} />
                      <span>No, keep the plan only</span>
                    </label>
                  </div>
                  <div className="action-row">
                    <button type="button" onClick={generateSampleProject} disabled={approvalChoice !== "yes" || generatingSample}>
                      {generatingSample ? "Generating sample..." : "Generate sample project"}
                    </button>
                    <span className="action-hint">The preview mirrors the selected target versions and folder layout.</span>
                  </div>
                  {generatedReady ? (
                    <article className="generated-preview">
                      <span>Sample project preview</span>
                      <h3>{generatedSample.title}</h3>
                      <p>{generatedSample.summary}</p>
                      <div className="preview-grid">
                        <div><span>Destination folder</span><strong>{generatedSample.folder}</strong></div>
                        <div><span>Technology targets</span><strong>{technologies.length ? technologies.map((tech) => {
                          const key = tech.key || tech.title;
                          return `${label(tech)}: ${technologyTargetsState[key] || buildTargetOptionsForTechnology(tech)[0]}`;
                        }).join("; ") : "Pending"}</strong></div>
                        <div><span>Database targets</span><strong>{databases.length ? databases.map((db) => {
                          const key = db.key || db.title;
                          return `${label(db)}: ${databaseTargetsState[key] || buildTargetOptionsForDatabase(db)[0]}`;
                        }).join("; ") : "Pending"}</strong></div>
                      </div>
                      {generatedSample.lines.length ? (
                        <ul>
                          {generatedSample.lines.map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      ) : null}
                    </article>
                  ) : null}
                </Panel>
              ) : null}
            </>
          ) : null}

          {loadingQuick ? (
            <>
              <LoadingBlock
                title="Quick analysis in progress"
                description="Detected technologies, libraries, databases, and target selectors will appear as soon as the quick scan completes."
                progress={quickProgress}
              />
              <LoadingBlock
                title="Preparing target selectors"
                description="Target technology, database, and library versions are being assembled from the detected stack."
                progress={quickProgress}
              />
            </>
          ) : null}
        </div>
      ) : deepComplete ? renderPage() : (
        <Panel eyebrow="Locked" title="Run deep analysis to unlock the detailed pages" description="Overview, analysis, documentation, and roadmap pages become available after the deep analysis completes.">
          <p className="muted">The top navigation stays disabled until the project moves past the quick analysis stage.</p>
        </Panel>
      )}
    </main>
  );
}
