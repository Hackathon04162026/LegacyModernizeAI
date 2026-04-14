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
  documentationSections: [
    "Service ownership and transaction boundaries",
    "Upgrade notes for deprecated annotations and security filters",
    "Onboarding guide for build, test, and deployment flow"
  ],
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
