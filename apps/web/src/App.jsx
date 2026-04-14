import { useEffect, useRef, useState } from "react";
import { mockReport } from "./mockReport";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const nav = [
  ["home", "Home", "Quick scan"],
  ["overview", "Overview", "Metrics and inventory"],
  ["analysis", "Analysis", "Security and complexity"],
  ["documentation", "Documentation", "Confluence-ready notes"],
  ["roadmap", "Roadmap", "Migration steps"],
  ["help", "Help", "How it works"],
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
const toMetricNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const clampPercent = (value) => Math.max(0, Math.min(100, toMetricNumber(value, 0)));

const createEmptyGeneratedSample = () => ({
  title: "Sample project preview",
  folder: "",
  summary: "",
  lines: [],
});

function ScoreDial({ value, label, detail }) {
  const score = clampPercent(value);
  const dialStyle = {
    background: `conic-gradient(#d85d39 0 ${score}%, rgba(28, 36, 49, 0.09) ${score}% 100%)`
  };

  return (
    <article className="score-dial-card">
      <span className="metric-label">{label}</span>
      <div className="score-dial" style={dialStyle}>
        <div className="score-dial-center">
          <strong>{score}</strong>
          <span>/100</span>
        </div>
      </div>
      <p>{detail}</p>
    </article>
  );
}

function MetricCard({ label, value, accent, detail, progress = 0, tone = "default" }) {
  const safeProgress = clampPercent(progress);
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <span className="metric-label">{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
      <div className="metric-bar" aria-hidden="true">
        <div className="metric-bar-fill" style={{ width: `${safeProgress}%`, background: accent }} />
      </div>
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
  const readinessScore = clampPercent(report.readinessScore);
  const securityIssues = toMetricNumber(report.metrics?.securityIssues, 0);
  const complexityHotspots = toMetricNumber(report.metrics?.complexityHotspots, 0);
  const maintainabilityGain = clampPercent(report.metrics?.maintainabilityGainPercent);
  const manualWeeks = toMetricNumber(report.metrics?.manualMigrationWeeks, 0);
  const assistedWeeks = toMetricNumber(report.metrics?.codexAssistedWeeks, 0);
  const timeSaved = Math.max(0, manualWeeks - assistedWeeks);
  const acceleration = manualWeeks > 0 ? clampPercent(((manualWeeks - assistedWeeks) / manualWeeks) * 100) : 0;
  const summary = [
    ["Repository", report.repoUrl || emptyText],
    ["Source", report.sourceType || emptyText],
    ["Files scanned", report.analyzedFilesCount ?? "-"],
    ["Analyzed at", report.analyzedAt ? new Date(report.analyzedAt).toLocaleString() : emptyText],
  ];

  return (
    <Panel eyebrow="Overview" title="Snapshot of the current codebase" description="A concise view of the detected stack, repository metadata, and modernization readiness.">
      <section className="overview-hero">
        <ScoreDial label="Readiness score" value={readinessScore} detail="Modernization confidence based on stack age, hotspot count, and migration sequencing." />
        <div className="metrics-grid metrics-grid-overview">
          <MetricCard
            label="Security pressure"
            value={securityIssues}
            accent="#c94e63"
            progress={Math.min(100, securityIssues * 20)}
            tone="risk"
            detail="Code paths and dependencies that need security review before upgrade execution."
          />
          <MetricCard
            label="Complexity hotspots"
            value={complexityHotspots}
            accent="#c88c1f"
            progress={Math.min(100, complexityHotspots * 18)}
            tone="warning"
            detail="High-friction modules likely to slow safe refactoring and testing."
          />
          <MetricCard
            label="Maintainability gain"
            value={`${maintainabilityGain}%`}
            accent="#2f966f"
            progress={maintainabilityGain}
            tone="success"
            detail="Expected maintainability lift once the selected modernization path lands."
          />
          <MetricCard
            label="Time saved with Codex"
            value={manualWeeks > 0 ? `${timeSaved}w` : "-"}
            accent="#3f74d9"
            progress={acceleration}
            tone="info"
            detail={manualWeeks > 0 ? `${acceleration}% faster than the manual-only migration estimate.` : "Migration acceleration appears after deep analysis estimates are available."}
          />
        </div>
      </section>

      <section className="overview-analytics">
        <article className="analytics-card analytics-card-dark">
          <span className="metric-label">Delivery outlook</span>
          <h3>Manual vs Codex-assisted migration</h3>
          <div className="effort-bars">
            <div>
              <div className="effort-meta">
                <span>Manual path</span>
                <strong>{manualWeeks || "-"} weeks</strong>
              </div>
              <div className="effort-track"><div className="effort-fill effort-fill-manual" style={{ width: `${manualWeeks > 0 ? 100 : 0}%` }} /></div>
            </div>
            <div>
              <div className="effort-meta">
                <span>With Codex agents</span>
                <strong>{assistedWeeks || "-"} weeks</strong>
              </div>
              <div className="effort-track"><div className="effort-fill effort-fill-assisted" style={{ width: `${manualWeeks > 0 ? Math.max(18, (assistedWeeks / manualWeeks) * 100) : 0}%` }} /></div>
            </div>
          </div>
          <p>{manualWeeks > 0 ? `${timeSaved} weeks can be redirected from manual analysis toward refactoring, validation, and rollout prep.` : "Run deep analysis to unlock the full effort comparison."}</p>
        </article>

        <article className="analytics-card">
          <span className="metric-label">Portfolio mix</span>
          <h3>Detected footprint</h3>
          <div className="footprint-grid">
            <div><strong>{tech.length}</strong><span>Technologies</span></div>
            <div><strong>{dbs.length}</strong><span>Databases</span></div>
            <div><strong>{libs.length}</strong><span>Libraries</span></div>
            <div><strong>{report.analyzedFilesCount ?? "-"}</strong><span>Files scanned</span></div>
          </div>
          <p>The overview combines framework inventory, data tier visibility, and dependency signals into a single modernization baseline.</p>
        </article>
      </section>

      <div className="summary-strip">{summary.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>

      <div className="stack-columns stack-columns-rich">
        {[
          ["Technologies", tech, "No technologies detected yet.", "Frameworks, runtimes, and primary stack anchors surfaced from manifests and source evidence."],
          ["Databases", dbs, "No databases detected yet.", "Database engines and procedural assets that influence migration sequencing and compatibility."],
          ["Libraries", libs, "No libraries detected yet.", "Supporting packages that may need coordinated upgrades alongside the core platform."],
        ].map(([title, items, fallback, description]) => (
          <article key={title} className="inventory-card">
            <h3>{title}</h3>
            <p>{description}</p>
            {items.length ? (
              <div className="inventory-list">
                {items.map((item) => (
                  <div key={`${title}-${label(item)}`} className="inventory-pill">
                    <strong>{label(item)}</strong>
                    <span>{detail(item) || meta(item) || item.currentVersion || "Detected in repository"}</span>
                  </div>
                ))}
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

function Help() {
  const featureCards = [
    {
      title: "Home",
      detail: "Start with a repository path or a sample project, run a quick scan, choose target versions, and launch the deeper analysis only after the team agrees on the target baseline.",
      points: ["Best for first-time users and live demos", "Shows repository intake, quick scan, target selection, and sample generation"],
    },
    {
      title: "Overview",
      detail: "Turns technical findings into a leadership-friendly modernization scorecard with readiness, risk pressure, time savings, and footprint metrics.",
      points: ["Great for sponsors, architects, and delivery leads", "Highlights where Codex can shorten analysis and planning time"],
    },
    {
      title: "Analysis",
      detail: "Shows the areas that need the most attention: security issues, complexity hotspots, and possible PII exposure that make upgrades risky.",
      points: ["Explains what can be automated and what still needs human review", "Helps new team members understand where to focus first"],
    },
    {
      title: "Documentation",
      detail: "Generates onboarding-friendly notes and Confluence-ready pages so new developers do not spend weeks reverse-engineering a legacy application.",
      points: ["Useful for handover, onboarding, architecture notes, and release planning", "Connects modernization work to living documentation"],
    },
    {
      title: "Roadmap",
      detail: "Breaks migration into understandable phases with effort comparisons between manual delivery and Codex-assisted execution.",
      points: ["Shows a believable path instead of a vague AI promise", "Helps enterprise teams plan budget, sequencing, and review gates"],
    },
  ];

  const benefits = [
    "Reduces weeks of manual repository discovery and dependency mapping.",
    "Helps new engineers get context without relying only on tribal knowledge.",
    "Highlights security, complexity, and documentation gaps before migration starts.",
    "Creates a shared modernization plan that engineering and leadership can both understand.",
    "Shows where Codex accelerates work while keeping manual review for risky areas.",
  ];

  const walkthrough = [
    ["Step 1", "Enter a repository path or choose one of the built-in sample projects."],
    ["Step 2", "Run quick analysis to detect the live technologies, libraries, and databases inside the repository."],
    ["Step 3", "Pick the desired target versions for the main stack, supporting libraries, and database platform."],
    ["Step 4", "Run deep analysis to unlock the detailed modernization findings, documentation, and roadmap pages."],
    ["Step 5", "Review generated documentation, Confluence links, and migration phases with the delivery team."],
    ["Step 6", "Approve the target direction and generate a sample modernized project output for discussion."],
  ];

  const guidanceAssets = [
    {
      title: "Step-by-step PDF guidelines",
      detail: "A page-by-page walkthrough with screenshot guidance, key highlights, and the order to present each part of the workspace clearly.",
      meta: "PDF guide",
      link: `${apiBase}/submission-assets/walkthrough-with-screenshots.md`,
    },
    {
      title: "Video guide with narration",
      detail: "A simple video flow with spoken explanation so the recording explains each page, the business problem, and the enterprise value in clear language.",
      meta: "Video guide",
      link: `${apiBase}/submission-assets/video-script-final.md`,
    },
  ];

  return (
    <Panel eyebrow="Help" title="How LegacyModernizeAI works" description="A simple guide to what the workspace does, why each page exists, and how it helps enterprise teams modernize legacy applications faster and with more confidence.">
      <section className="help-hero">
        <article className="help-story-card help-story-card-dark">
          <span className="metric-label">About the project</span>
          <h3>LegacyModernizeAI turns hidden legacy knowledge into a visible modernization plan.</h3>
          <p>Enterprise teams often inherit applications that nobody fully understands, where documentation is stale, dependencies are outdated, and migration decisions take months. This workspace shortens that discovery phase by scanning the codebase, surfacing what matters, and organizing the results into a plan that teams can act on.</p>
        </article>
        <article className="help-story-card">
          <span className="metric-label">Why it matters</span>
          <ul>
            {benefits.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      <section className="help-grid">
        {featureCards.map((card) => (
          <article key={card.title} className="help-card">
            <span className="metric-label">{card.title}</span>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
            <ul>
              {card.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="help-grid help-grid-two">
        <article className="help-card">
          <span className="metric-label">Workspace flow</span>
          <h3>How the workspace is typically used</h3>
          <div className="help-steps">
            {walkthrough.map(([step, text]) => (
              <div key={step}>
                <strong>{step}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="help-card">
          <span className="metric-label">Business value</span>
          <h3>How the workspace supports enterprise teams</h3>
          <div className="help-steps">
            <div>
              <strong>Faster onboarding</strong>
              <p>New developers can see architecture clues, risk areas, and documentation in one place instead of piecing them together over several weeks.</p>
            </div>
            <div>
              <strong>Safer upgrades</strong>
              <p>The workspace separates what can be automated from what needs manual sign-off, which is essential for enterprise modernization.</p>
            </div>
            <div>
              <strong>Real delivery value</strong>
              <p>This is not just code generation. It supports discovery, planning, documentation, and modernization readiness end to end.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="help-resource-section">
        <div className="section-heading">
          <span>Guides</span>
          <h2>PDF and video guidance</h2>
          <p>Use these guides to present the workspace clearly, capture screenshots in the right order, and record a narrated video that explains the product in simple language.</p>
        </div>
        <div className="help-resource-list help-resource-grid">
          {guidanceAssets.map((asset) => (
            <a key={asset.title} className="help-resource" href={asset.link} target="_blank" rel="noreferrer">
              <div>
                <strong>{asset.title}</strong>
                <p>{asset.detail}</p>
              </div>
              <span>{asset.meta}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="help-grid help-grid-two">
        <article className="help-card">
          <span className="metric-label">Recording guidance</span>
          <h3>Suggested order for screenshots and video capture</h3>
          <div className="help-steps">
            <div>
              <strong>1. Start with the problem</strong>
              <p>Open the home page and explain the pain of legacy discovery, missing documentation, and slow onboarding.</p>
            </div>
            <div>
              <strong>2. Show the main workspace pages</strong>
              <p>Capture Home, Overview, Analysis, Documentation, Roadmap, and the generated sample outcome in a simple sequence.</p>
            </div>
            <div>
              <strong>3. Finish with business value</strong>
              <p>Close on faster onboarding, clearer upgrade planning, and reduced time spent manually understanding old systems.</p>
            </div>
            <div>
              <strong>4. Keep the voiceover running</strong>
              <p>The video guide is written as narration, so the recording can explain what is on screen while moving from page to page.</p>
            </div>
          </div>
        </article>
      </section>
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

function inferTechnologiesFromLegacyReport(report) {
  const currentVersion = String(report.currentVersion || "");
  const items = [];

  if (/java/i.test(currentVersion)) {
    items.push({
      key: "java",
      label: "Java",
      category: "runtime",
      currentVersion,
      targetVersions: Array.isArray(report.availableTargetVersions) && report.availableTargetVersions.length ? report.availableTargetVersions : technologyTargets.java,
    });
  }

  if (/spring boot/i.test(currentVersion)) {
    const springVersion = currentVersion.match(/Spring Boot\s+([^\s/]+)/i)?.[1] || "";
    items.push({
      key: "spring-boot",
      label: "Spring Boot",
      category: "framework",
      currentVersion: springVersion || currentVersion,
      targetVersions: ["Spring Boot 3.x"],
    });
  }

  if (/angular/i.test(currentVersion) || report.detectedProjectType === "angular") {
    items.push({
      key: "angular",
      label: "Angular",
      category: "framework",
      currentVersion: currentVersion || "Angular legacy baseline",
      targetVersions: technologyTargets.angular,
    });
  }

  if (/react/i.test(currentVersion) || report.detectedProjectType === "react") {
    items.push({
      key: "react",
      label: "React",
      category: "framework",
      currentVersion: currentVersion || "React legacy baseline",
      targetVersions: technologyTargets.react,
    });
  }

  return items;
}

function inferDatabasesFromLegacyReport(report) {
  const database = String(report.database || "");
  if (!database) return [];

  if (/oracle/i.test(database)) {
    return [{ key: "oracle", title: "Oracle / PL-SQL", detail: database, targetVersions: databaseTargets.oracle }];
  }

  if (/sql server|mssql/i.test(database)) {
    return [{ key: "mssql", title: "MS SQL Server", detail: database, targetVersions: databaseTargets.mssql }];
  }

  if (/postgres/i.test(database)) {
    return [{ key: "postgres", title: "PostgreSQL", detail: database, targetVersions: databaseTargets.postgres }];
  }

  return [{ key: "none", title: database, detail: database, targetVersions: databaseTargets.none }];
}

function inferLibrariesFromLegacyReport(report) {
  const projectType = String(report.detectedProjectType || "").toLowerCase();
  const currentVersion = String(report.currentVersion || "");
  const items = [];

  if (projectType === "java" && /spring boot/i.test(currentVersion)) {
    const springVersion = currentVersion.match(/Spring Boot\s+([^\s/]+)/i)?.[1] || "";
    items.push({
      name: "spring-boot-starter-parent",
      version: springVersion || currentVersion,
      family: "spring",
      targetVersions: ["Spring Boot 3.x", "Current major", "Keep current"],
    });
  }

  if (projectType === "angular") {
    items.push({
      name: "@angular/core",
      version: currentVersion || "Legacy version",
      family: "angular",
      targetVersions: [...technologyTargets.angular, "Keep current"],
    });
  }

  if (projectType === "react") {
    items.push({
      name: "react",
      version: currentVersion || "Legacy version",
      family: "react",
      targetVersions: [...technologyTargets.react, "Keep current"],
    });
  }

  return items;
}

function normalizeIncomingReport(report) {
  const technologies = Array.isArray(report?.technologies) && report.technologies.length
    ? report.technologies
    : inferTechnologiesFromLegacyReport(report || {});
  const databases = Array.isArray(report?.databases) && report.databases.length
    ? report.databases
    : inferDatabasesFromLegacyReport(report || {});
  const detectedLibraries = Array.isArray(report?.detectedLibraries) && report.detectedLibraries.length
    ? report.detectedLibraries
    : inferLibrariesFromLegacyReport(report || {});

  const summary = report?.summary || {
    headline: technologies.length || databases.length
      ? `Quick scan found ${(technologies[0]?.label || report?.detectedProjectType || "the repository")} and ${(databases[0]?.title || report?.database || "the current data tier")} in the repository.`
      : "The repository has been profiled and is ready for target planning.",
    nextStep: "Review the detected stack and select the desired target versions before running deep analysis.",
    focus: technologies.length || databases.length
      ? `${technologies[0]?.label || "The detected stack"} and ${databases[0]?.title || report?.database || "the detected database"} are the main anchors for the next step.`
      : "Technology, libraries, and database signals are available for review.",
    libraryNote: detectedLibraries.length
      ? `${detectedLibraries.length} libraries were detected and can be reviewed in the target section.`
      : "Detected libraries will appear in the target section for modernization planning.",
  };

  return {
    ...report,
    technologies,
    databases,
    detectedLibraries,
    summary,
  };
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
  const [showQuickResults, setShowQuickResults] = useState(false);
  const [quickPhase, setQuickPhase] = useState("idle");
  const [approvalChoice, setApprovalChoice] = useState("no");
  const [generatedSample, setGeneratedSample] = useState(createEmptyGeneratedSample());
  const [generatedReady, setGeneratedReady] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [technologyTargetsState, setTechnologyTargetsState] = useState({});
  const [databaseTargetsState, setDatabaseTargetsState] = useState({});
  const [libraryTargetsState, setLibraryTargetsState] = useState({});
  const quickRevealTimerRef = useRef(null);

  const technologies = list(report.technologies, []);
  const databases = list(report.databases, []);
  const libraries = list(report.detectedLibraries || report.libraries, []);
  const quickIsLoading = quickPhase === "loading";
  const quickHasData = quickPhase === "ready" && showQuickResults && quickComplete;

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

  useEffect(() => () => {
    if (quickRevealTimerRef.current) {
      window.clearTimeout(quickRevealTimerRef.current);
      quickRevealTimerRef.current = null;
    }
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

  const pageTitle = ({ home: "Home", overview: "Overview", analysis: "Analysis", documentation: "Documentation", roadmap: "Roadmap", help: "Help" }[activeView] || "Home");

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
    setReport(normalizeIncomingReport(nextReport));
    setTechnologyTargetsState({});
    setDatabaseTargetsState({});
    setLibraryTargetsState({});
  }

  function applySample(sample) {
    if (quickRevealTimerRef.current) {
      window.clearTimeout(quickRevealTimerRef.current);
      quickRevealTimerRef.current = null;
    }
    setRepoUrl(sample.repoUrl || "");
    setShowSampleBrowser(false);
    setQuickComplete(false);
    setDeepComplete(false);
    setQuickError("");
    setQuickProgress(0);
    setShowQuickResults(false);
    setQuickPhase("idle");
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
    const startedAt = Date.now();
    const minimumLoadingMs = 1200;

    if (quickRevealTimerRef.current) {
      window.clearTimeout(quickRevealTimerRef.current);
      quickRevealTimerRef.current = null;
    }

    setLoadingQuick(true);
    setQuickComplete(false);
    setDeepComplete(false);
    setQuickError("");
    setQuickProgress(6);
    setShowQuickResults(false);
    setQuickPhase("loading");
    setGeneratedReady(false);
    setApprovalChoice("no");
    setGeneratedSample(createEmptyGeneratedSample());
    setReport({
      ...mockReport,
      repoUrl,
      sourceType: "loading"
    });
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
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, minimumLoadingMs - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => {
          quickRevealTimerRef.current = window.setTimeout(() => {
            quickRevealTimerRef.current = null;
            resolve();
          }, remaining);
        });
      }
      window.clearInterval(progressTimer);
      setQuickProgress(100);
      setQuickComplete(true);
      setInitialSelections(data);
      setShowQuickResults(true);
      setQuickPhase("ready");
      setActiveView("home");
    } catch {
      window.clearInterval(progressTimer);
      setQuickComplete(false);
      setDeepComplete(false);
      setQuickError("Quick analysis failed. Check that the API is running and the repository path is valid, then try again.");
      setShowQuickResults(false);
      setQuickPhase("idle");
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
    if (activeView === "help") return <Help />;
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
            const locked = id !== "home" && id !== "help" && !deepComplete;
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
                  <button type="submit" disabled={quickIsLoading || !repoUrl.trim()}>
                    {quickIsLoading ? "Running quick analysis..." : "Quick analysis"}
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

          {quickIsLoading ? (
            <LoadingBlock
              title="Quick analysis in progress"
              description="Detected technologies, libraries, databases, and target selectors will appear only after the scan reaches 100%."
              progress={quickProgress}
            />
          ) : quickHasData ? (
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
        </div>
      ) : activeView === "help" ? renderPage() : deepComplete ? renderPage() : (
        <Panel eyebrow="Locked" title="Run deep analysis to unlock the detailed pages" description="Overview, analysis, documentation, and roadmap pages become available after the deep analysis completes.">
          <p className="muted">The top navigation stays disabled until the project moves past the quick analysis stage.</p>
        </Panel>
      )}
    </main>
  );
}


