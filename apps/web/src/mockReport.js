export const mockReport = {
  repoUrl: "D:\\Project\\LegacyModernizeAI\\sample_project\\java-oracle-legacy",
  analyzedAt: new Date().toISOString(),
  sourceType: "local",
  detectedProjectType: "java",
  analyzedFilesCount: 4,
  currentVersion: "Java 8 / Spring Boot 2.1",
  targetVersion: "Java 21",
  availableTargetVersions: ["Java 21", "Java 25"],
  database: "Oracle / PL-SQL",
  readinessScore: 64,
  metrics: {
    securityIssues: 4,
    complexityHotspots: 4,
    manualMigrationWeeks: 14,
    codexAssistedWeeks: 9,
    maintainabilityGainPercent: 39
  },
  upgradePlan: [
    { phase: "Phase 1", detail: "Upgrade build plugins and dependency management first." },
    { phase: "Phase 2", detail: "Move deprecated Spring APIs to supported equivalents." },
    { phase: "Phase 3", detail: "Adopt Java 21 language and runtime improvements after test stabilization." }
  ],
  securityHotspots: [
    "Outdated Spring dependencies with known CVE exposure.",
    "Legacy authentication filters without modern hardening patterns."
  ],
  complexityHotspots: [
    "Service classes exceed maintainable method complexity thresholds.",
    "Tight controller-service-repository coupling slows framework upgrades."
  ],
  databaseNotes: [
    "Package procedures need dependency mapping before schema evolution.",
    "Dynamic SQL blocks require manual review for security and performance."
  ],
  technologies: [
    { title: "Java 8", detail: "Detected application runtime" },
    { title: "Spring Boot 2.1", detail: "Framework baseline" },
    { title: "Maven", detail: "Build and dependency management" }
  ],
  databases: [
    { key: "oracle", title: "Oracle", detail: "Primary relational store" },
    { key: "mssql", title: "MS SQL Server", detail: "Secondary reporting footprint" }
  ],
  detectedLibraries: [
    { name: "Spring Security", version: "5.x", kind: "framework" },
    { name: "Hibernate", version: "5.x", kind: "persistence" },
    { name: "JUnit", version: "4.x", kind: "testing" }
  ],
  findings: {
    security: [
      { title: "Outdated dependencies", detail: "Several packages are several releases behind current supported versions." },
      { title: "Authentication hardening", detail: "The current filter chain should be reviewed for modern security controls." }
    ],
    complexity: [
      { title: "Large service classes", detail: "Some service methods bundle too many responsibilities." }
    ],
    pii: [
      { title: "Sensitive fixture data", detail: "Legacy service logic contains personally identifiable values that should be masked." }
    ],
    suggestions: [
      { title: "Split framework and data upgrades", detail: "Treat runtime modernization and procedure review as separate execution tracks." }
    ]
  },
  documentationSections: [
    "Service ownership and transaction boundaries",
    "Upgrade notes for deprecated annotations and security filters",
    "Onboarding guide for build, test, and deployment flow"
  ],
  docsRows: [
    { title: "Service ownership", detail: "Capture the primary owner, boundaries, and escalation path.", meta: "Architecture", link: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/229495/LegacyModernizeAI+-+Project+Intake+and+Scan+Summary" },
    { title: "Upgrade notes", detail: "Summarize API replacements and configuration changes.", meta: "Engineering", link: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/98307/LegacyModernizeAI+-+Upgrade+Recommendations" },
    { title: "Release guide", detail: "Document build, test, deploy, and rollback steps.", meta: "Operations", link: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/851969/LegacyModernizeAI+-+Generated+Developer+Documentation" }
  ],
  roadmapSections: [
    { title: "Inventory and baseline", detail: "Confirm packages, database touchpoints, and runtime constraints.", meta: "Planned phase" },
    { title: "Framework upgrade", detail: "Move to supported Spring and Java versions while stabilizing tests.", meta: "Planned phase" },
    { title: "Operational hardening", detail: "Finish security review, release documentation, and rollout readiness.", meta: "Planned phase" }
  ],
  roadmap: {
    summary: "Modernize the runtime, stabilize integration boundaries, and complete documentation and rollout readiness in staged phases."
  },
  cannotAutomate: [
    "Business-rule validation for high-risk workflows",
    "Manual sign-off for schema-breaking database changes"
  ],
  canAccelerate: [
    "Dependency inventory and version mapping",
    "Upgrade sequencing and risk summaries",
    "Documentation draft generation",
    "Sample modernized UI scaffolding"
  ],
  sampleAppPreview: {
    title: "Modernized Operations Dashboard",
    summary: "A cleaner, component-driven dashboard with actionable KPIs, upgrade tracking, and risk visualization."
  }
};
