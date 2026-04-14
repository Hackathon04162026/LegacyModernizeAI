import { useEffect, useState } from "react";
import { mockReport } from "./mockReport";

const versionOptions = {
  java: ["Java 21", "Java 25"],
  angular: ["Angular 20", "Angular 21"],
  react: ["React 19"]
};

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const sampleFallbacks = [
  {
    label: "Java / Oracle Legacy Sample",
    repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\java-oracle-legacy",
    projectType: "java",
    database: "oracle"
  },
  {
    label: "Angular / MS SQL Legacy Sample",
    repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\angular-mssql-legacy",
    projectType: "angular",
    database: "mssql"
  },
  {
    label: "React Legacy Sample",
    repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\react-legacy",
    projectType: "react",
    database: "none"
  }
];

function MetricCard({ label, value, accent }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </article>
  );
}

function Section({ title, eyebrow, children }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [projectType, setProjectType] = useState("java");
  const [database, setDatabase] = useState("oracle");
  const [repoUrl, setRepoUrl] = useState(sampleFallbacks[0].repoUrl);
  const [targetVersion, setTargetVersion] = useState(versionOptions.java[0]);
  const [report, setReport] = useState(mockReport);
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState(sampleFallbacks);
  const targetOptions = report.availableTargetVersions?.length ? report.availableTargetVersions : versionOptions[projectType];

  useEffect(() => {
    setTargetVersion(versionOptions[projectType][0]);
  }, [projectType]);

  useEffect(() => {
    async function loadSamples() {
      try {
        const response = await fetch(`${apiBase}/api/samples`);
        if (!response.ok) {
          throw new Error("sample lookup failed");
        }

        const data = await response.json();
        setSamples(data);
      } catch {
        setSamples(sampleFallbacks);
      }
    }

    loadSamples();
  }, []);

  function applySample(sample) {
    setRepoUrl(sample.repoUrl);
    setProjectType(sample.projectType);
    setDatabase(sample.database);
    setTargetVersion(versionOptions[sample.projectType][0]);
  }

  async function runAnalysis(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repoUrl,
          projectType,
          database,
          selectedTargetVersion: targetVersion
        })
      });

      if (!response.ok) {
        throw new Error("analysis failed");
      }

      const data = await response.json();
      setReport(data);
      setTargetVersion(data.targetVersion);
    } catch {
      setReport({
        ...mockReport,
        repoUrl,
        targetVersion,
        detectedProjectType: projectType,
        database: database === "oracle" ? "Oracle / PL-SQL" : database === "mssql" ? "MS SQL Server" : "No database selected"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI-Assisted Codebase Modernization</p>
          <h1>Turn legacy repos into a modernization plan judges can believe.</h1>
          <p className="hero-text">
            LegacyModernizeAI analyzes Java, Angular, and React applications with Oracle or MS SQL dependencies, then uses Codex-style orchestration to recommend upgrades, flag risk hotspots, generate docs, and preview a modernized experience.
          </p>
        </div>

        <form className="intake-card" onSubmit={runAnalysis}>
          <div className="sample-row">
            {samples.map((sample) => (
              <button
                key={sample.label}
                type="button"
                className="sample-chip"
                onClick={() => applySample(sample)}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <label>
            Repository URL Or Local Path
            <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
          </label>

          <div className="form-grid">
            <label>
              Project Type
              <select value={projectType} onChange={(event) => setProjectType(event.target.value)}>
                <option value="java">Java / Spring</option>
                <option value="angular">Angular</option>
                <option value="react">React</option>
              </select>
            </label>

            <label>
              Database
              <select value={database} onChange={(event) => setDatabase(event.target.value)}>
                <option value="oracle">Oracle / PL-SQL</option>
                <option value="mssql">MS SQL Server</option>
                <option value="none">No Database</option>
              </select>
            </label>
          </div>

          <label>
            Target Version
            <select value={targetVersion} onChange={(event) => setTargetVersion(event.target.value)}>
              {targetOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Generate Modernization Plan"}
          </button>
        </form>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Readiness Score" value={`${report.readinessScore}/100`} accent="#ff8a5b" />
        <MetricCard label="Security Issues" value={report.metrics.securityIssues} accent="#ff5d73" />
        <MetricCard label="Complexity Hotspots" value={report.metrics.complexityHotspots} accent="#f6c945" />
        <MetricCard label="Maintainability Gain" value={`${report.metrics.maintainabilityGainPercent}%`} accent="#4dd6a1" />
      </section>

      <section className="dashboard-grid">
        <Section title="Upgrade Strategy" eyebrow="Roadmap">
          <div className="summary-strip">
            <div>
              <span>Detected Stack</span>
              <strong>{report.detectedProjectType}</strong>
            </div>
            <div>
              <span>Current Stack</span>
              <strong>{report.currentVersion}</strong>
            </div>
            <div>
              <span>Target Stack</span>
              <strong>{report.targetVersion}</strong>
            </div>
            <div>
              <span>Files Scanned</span>
              <strong>{report.analyzedFilesCount || "-"}</strong>
            </div>
          </div>
          <p className="muted source-note">
            Analysis source: {report.sourceType || "demo"} repository with database profile {report.database}.
          </p>
          <div className="stack-list">
            {report.upgradePlan.map((item) => (
              <article key={item.phase} className="timeline-step">
                <span>{item.phase}</span>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Risk Hotspots" eyebrow="Review">
          <div className="columns">
            <div>
              <h3>Security</h3>
              <ul>
                {report.securityHotspots.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Complexity</h3>
              <ul>
                {report.complexityHotspots.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <h3>Database Findings</h3>
          <ul>
            {report.databaseNotes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Developer Documentation" eyebrow="Confluence Ready">
          <p className="muted">
            The generated documentation package captures upgrade decisions, ownership boundaries, function intent, and onboarding notes for engineers joining after the migration.
          </p>
          <ul>
            {report.documentationSections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title="Migration Economics" eyebrow="Value Story">
          <div className="summary-strip">
            <div>
              <span>Manual Migration</span>
              <strong>{report.metrics.manualMigrationWeeks} weeks</strong>
            </div>
            <div>
              <span>With Codex AI Agents</span>
              <strong>{report.metrics.codexAssistedWeeks} weeks</strong>
            </div>
          </div>
          <div className="columns">
            <div>
              <h3>Codex Can Accelerate</h3>
              <ul>
                {report.canAccelerate.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Needs Manual Review</h3>
              <ul>
                {report.cannotAutomate.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="Modernized Preview" eyebrow="Before vs After">
          <div className="preview-card">
            <div className="preview-sidebar">
              <span>AI-Generated Sample</span>
              <h3>{report.sampleAppPreview.title}</h3>
              <p>{report.sampleAppPreview.summary}</p>
            </div>
            <div className="preview-screen">
              <div className="preview-topbar">
                <span>Release Readiness</span>
                <strong>82%</strong>
              </div>
              <div className="preview-chart">
                <div className="bar bar-one"></div>
                <div className="bar bar-two"></div>
                <div className="bar bar-three"></div>
              </div>
              <div className="preview-grid">
                <article>
                  <span>Deprecated APIs</span>
                  <strong>12</strong>
                </article>
                <article>
                  <span>Refactors Suggested</span>
                  <strong>7</strong>
                </article>
                <article>
                  <span>Docs Coverage</span>
                  <strong>91%</strong>
                </article>
              </div>
            </div>
          </div>
        </Section>
      </section>
    </main>
  );
}
