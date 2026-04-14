import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const targetVersionsByStack = {
  java: ["Java 21", "Java 25"],
  angular: ["Angular 20", "Angular 21"],
  react: ["React 19"]
};

const sourceExtensions = new Set([".java", ".js", ".jsx", ".ts", ".tsx"]);
const databaseExtensions = new Set([".sql", ".pls", ".pks", ".pkb", ".prc"]);

export async function analyzeRepository({ repoUrl, projectTypeHint, databaseHint }) {
  const resolved = await resolveRepository(repoUrl);

  try {
    const files = await listFiles(resolved.repoPath);
    const manifests = await readRelevantFiles(resolved.repoPath, files);
    const detectedProjectType = detectProjectType(manifests, projectTypeHint);
    const database = detectDatabase(manifests, databaseHint);
    const versions = detectVersions(manifests, detectedProjectType);
    const complexityHotspots = detectComplexity(manifests, resolved.repoPath);
    const securityHotspots = detectSecurity(manifests, detectedProjectType);
    const documentationSections = buildDocumentationSections(manifests, resolved.repoPath);
    const databaseNotes = buildDatabaseNotes(manifests, database);
    const metrics = buildMetrics({
      fileCount: files.length,
      projectType: detectedProjectType,
      complexityCount: complexityHotspots.length,
      securityCount: securityHotspots.length
    });

    return {
      repoUrl,
      analyzedAt: new Date().toISOString(),
      sourceType: resolved.sourceType,
      detectedProjectType,
      analyzedFilesCount: files.length,
      currentVersion: versions.currentVersion,
      targetVersion: versions.targetVersions[0],
      availableTargetVersions: versions.targetVersions,
      database: database.title,
      readinessScore: metrics.readinessScore,
      metrics,
      upgradePlan: buildUpgradePlan(detectedProjectType, versions),
      securityHotspots,
      complexityHotspots,
      databaseNotes,
      documentationSections,
      cannotAutomate: [
        "Business-rule validation for high-risk workflows",
        "Manual sign-off for schema-breaking database changes",
        "Production cutover planning and rollback rehearsal"
      ],
      canAccelerate: [
        "Dependency inventory and version mapping",
        "Upgrade sequencing and risk summaries",
        "Documentation draft generation",
        "Sample modernized UI scaffolding"
      ],
      sampleAppPreview: buildSamplePreview(detectedProjectType)
    };
  } finally {
    if (resolved.cleanup) {
      await resolved.cleanup();
    }
  }
}

async function resolveRepository(repoUrl) {
  if (!repoUrl || !repoUrl.trim()) {
    throw new Error("Repository path or URL is required.");
  }

  const trimmed = repoUrl.trim();

  try {
    const stat = await fs.stat(trimmed);
    if (stat.isDirectory()) {
      return {
        repoPath: trimmed,
        sourceType: "local"
      };
    }
  } catch {
    // Treat as remote URL below.
  }

  const cloneRoot = await fs.mkdtemp(path.join(os.tmpdir(), "legacy-modernize-ai-"));
  await execFileAsync("git", ["clone", "--depth", "1", trimmed, cloneRoot]);

  return {
    repoPath: cloneRoot,
    sourceType: "git",
    cleanup: () => fs.rm(cloneRoot, { recursive: true, force: true })
  };
}

async function listFiles(rootDir) {
  const queue = [rootDir];
  const results = [];

  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "build") {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }

  return results;
}

async function readRelevantFiles(rootDir, files) {
  const manifests = [];

  for (const fullPath of files) {
    const basename = path.basename(fullPath).toLowerCase();
    const ext = path.extname(fullPath).toLowerCase();
    const relativePath = path.relative(rootDir, fullPath);

    if (
      basename === "package.json" ||
      basename === "angular.json" ||
      basename === "pom.xml" ||
      basename === "build.gradle" ||
      basename === "build.gradle.kts" ||
      basename === "application.properties" ||
      basename === "application.yml" ||
      sourceExtensions.has(ext) ||
      databaseExtensions.has(ext)
    ) {
      manifests.push({
        relativePath,
        fullPath,
        content: await fs.readFile(fullPath, "utf8")
      });
    }
  }

  return manifests;
}

function detectProjectType(manifests, projectTypeHint) {
  const packageJsonFiles = manifests.filter((file) => path.basename(file.relativePath) === "package.json");
  const hasPom = manifests.some((file) => path.basename(file.relativePath) === "pom.xml");
  const hasGradle = manifests.some((file) => file.relativePath.endsWith("build.gradle") || file.relativePath.endsWith("build.gradle.kts"));
  const hasAngularJson = manifests.some((file) => path.basename(file.relativePath) === "angular.json");

  if (hasAngularJson) {
    return "angular";
  }

  for (const pkgFile of packageJsonFiles) {
    const pkg = safeJsonParse(pkgFile.content);
    const dependencies = {
      ...(pkg?.dependencies ?? {}),
      ...(pkg?.devDependencies ?? {})
    };

    if (dependencies["@angular/core"]) {
      return "angular";
    }

    if (dependencies.react) {
      return "react";
    }
  }

  if (hasPom || hasGradle) {
    return "java";
  }

  return projectTypeHint || "react";
}

function detectDatabase(manifests, databaseHint) {
  const databaseFiles = manifests.filter((file) => databaseExtensions.has(path.extname(file.relativePath).toLowerCase()));
  const combined = databaseFiles.map((file) => file.content.toLowerCase()).join("\n");

  if (databaseHint === "oracle" || combined.includes("create or replace package") || combined.includes("dbms_")) {
    return {
      key: "oracle",
      title: "Oracle / PL-SQL"
    };
  }

  if (databaseHint === "mssql" || combined.includes("nvarchar") || combined.includes("go\n") || combined.includes("dbo.")) {
    return {
      key: "mssql",
      title: "MS SQL Server"
    };
  }

  return {
    key: "none",
    title: "No database selected"
  };
}

function detectVersions(manifests, projectType) {
  if (projectType === "java") {
    return detectJavaVersions(manifests);
  }

  if (projectType === "angular") {
    return detectAngularVersions(manifests);
  }

  return detectReactVersions(manifests);
}

function detectJavaVersions(manifests) {
  const pomFile = manifests.find((file) => path.basename(file.relativePath) === "pom.xml");
  const gradleFile = manifests.find((file) => file.relativePath.endsWith("build.gradle") || file.relativePath.endsWith("build.gradle.kts"));
  const source = pomFile?.content || gradleFile?.content || "";
  const javaVersion =
    findMatch(source, /<java\.version>([^<]+)<\/java\.version>/i) ||
    findMatch(source, /<maven\.compiler\.source>([^<]+)<\/maven\.compiler\.source>/i) ||
    normalizeGradleJavaVersion(findMatch(source, /sourceCompatibility\s*=\s*['"]?([^'"\n]+)['"]?/i)) ||
    "8";
  const springVersion =
    findMatch(source, /<spring-boot\.version>([^<]+)<\/spring-boot\.version>/i) ||
    findMatch(source, /spring-boot-starter-parent[\s\S]*?<version>([^<]+)<\/version>/i) ||
    findMatch(source, /id\s+["']org\.springframework\.boot["']\s+version\s+["']([^"']+)["']/i);

  return {
    currentVersion: `Java ${normalizeJavaVersion(javaVersion)}${springVersion ? ` / Spring Boot ${springVersion}` : ""}`,
    targetVersions: targetVersionsByStack.java
  };
}

function detectAngularVersions(manifests) {
  const pkgFile = manifests.find((file) => path.basename(file.relativePath) === "package.json");
  const pkg = safeJsonParse(pkgFile?.content);
  const angularVersion = pkg?.dependencies?.["@angular/core"] || pkg?.devDependencies?.["@angular/core"] || "10.0.0";

  return {
    currentVersion: `Angular ${majorVersion(angularVersion)}`,
    targetVersions: targetVersionsByStack.angular
  };
}

function detectReactVersions(manifests) {
  const pkgFile = manifests.find((file) => path.basename(file.relativePath) === "package.json");
  const pkg = safeJsonParse(pkgFile?.content);
  const reactVersion = pkg?.dependencies?.react || pkg?.devDependencies?.react || "16.0.0";
  const buildTool = pkg?.dependencies?.["react-scripts"] ? " / CRA" : pkg?.devDependencies?.vite || pkg?.dependencies?.vite ? " / Vite" : "";

  return {
    currentVersion: `React ${majorVersion(reactVersion)}${buildTool}`,
    targetVersions: targetVersionsByStack.react
  };
}

function buildUpgradePlan(projectType, versions) {
  if (projectType === "java") {
    return [
      { phase: "Phase 1", detail: "Inventory Java and Spring dependencies, then upgrade build plugins to versions compatible with modern JDKs." },
      { phase: "Phase 2", detail: `Move from ${versions.currentVersion} to ${versions.targetVersions[0]} with test stabilization and deprecated API cleanup.` },
      { phase: "Phase 3", detail: "Refactor security filters, transaction boundaries, and oversized services before CI hardening." }
    ];
  }

  if (projectType === "angular") {
    return [
      { phase: "Phase 1", detail: "Increment Angular CLI and TypeScript support in safe steps and remove deprecated RxJS patterns." },
      { phase: "Phase 2", detail: `Target ${versions.targetVersions[0]} and convert brittle NgModule-heavy features toward standalone-friendly patterns.` },
      { phase: "Phase 3", detail: "Add stricter linting, modern test coverage, and build pipeline validation." }
    ];
  }

  return [
    { phase: "Phase 1", detail: "Replace legacy Create React App conventions and align package tooling with a supported modern stack." },
    { phase: "Phase 2", detail: `Upgrade from ${versions.currentVersion} to ${versions.targetVersions[0]} and remove deprecated class lifecycle behavior.` },
    { phase: "Phase 3", detail: "Split heavy pages into typed, testable UI and data layers with stronger security boundaries." }
  ];
}

function detectComplexity(manifests, rootDir) {
  return manifests
    .filter((file) => sourceExtensions.has(path.extname(file.relativePath).toLowerCase()))
    .map((file) => {
      const lines = file.content.split(/\r?\n/);
      const lineCount = lines.length;
      const nestingTokens = (file.content.match(/\b(if|for|while|switch|catch|case)\b/g) || []).length;
      const logicalTokens = (file.content.match(/&&|\|\|/g) || []).length;
      const score = Math.round(lineCount / 12 + nestingTokens * 2 + logicalTokens);

      return {
        path: file.relativePath,
        score,
        lineCount
      };
    })
    .filter((entry) => entry.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => `${entry.path} shows elevated complexity (score ${entry.score}) across about ${entry.lineCount} lines and should be split before migration.`)
    .concat(
      manifests.some((file) => file.relativePath.toLowerCase().includes("service"))
        ? ["Service-layer ownership is blurred across controllers, services, and repositories, which will slow safe refactoring."]
        : []
    )
    .slice(0, 4);
}

function detectSecurity(manifests, projectType) {
  const findings = [];

  for (const file of manifests) {
    const lower = file.content.toLowerCase();

    if (lower.includes("runtime.getruntime().exec")) {
      findings.push(`${file.relativePath} invokes system commands directly and needs review before modernization.`);
    }

    if (lower.includes("dangerouslysetinnerhtml") || lower.includes("innerhtml =")) {
      findings.push(`${file.relativePath} writes raw HTML and should be hardened against injection risks.`);
    }

    if (lower.includes("password=") || lower.includes("apikey") || lower.includes("secret")) {
      findings.push(`${file.relativePath} appears to contain sensitive configuration that should move to managed secrets.`);
    }

    if (lower.includes("select * from") && lower.includes("+")) {
      findings.push(`${file.relativePath} appears to build SQL dynamically and should be reviewed for injection and performance issues.`);
    }
  }

  const versionFinding = detectDependencyRisk(manifests, projectType);
  if (versionFinding) {
    findings.unshift(versionFinding);
  }

  return dedupe(findings).slice(0, 4);
}

function detectDependencyRisk(manifests, projectType) {
  if (projectType === "java") {
    const javaInfo = detectJavaVersions(manifests);
    if (javaInfo.currentVersion.includes("Java 8")) {
      return "Java 8-era dependencies are likely past enterprise support windows and should be upgraded with security regression testing.";
    }
  }

  const pkgFile = manifests.find((file) => path.basename(file.relativePath) === "package.json");
  const pkg = safeJsonParse(pkgFile?.content);
  const deps = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {})
  };

  if (projectType === "angular" && majorVersion(deps["@angular/core"]) < 18) {
    return "Angular dependencies are several major versions behind and likely include unsupported or vulnerable packages.";
  }

  if (projectType === "react" && majorVersion(deps.react) < 19) {
    return "React and its tooling are behind the modern support baseline, increasing supply-chain and maintenance risk.";
  }

  return null;
}

function buildDocumentationSections(manifests, rootDir) {
  const topLevelFolders = new Set(
    manifests
      .map((file) => file.relativePath.split(path.sep)[0])
      .filter(Boolean)
  );

  const sections = [
    "Architecture summary and module ownership",
    "Upgrade decisions, target versions, and rollback notes",
    "Function-level onboarding notes for high-risk modules"
  ];

  if (topLevelFolders.has("src")) {
    sections.push("Source layout and entry-point walkthrough");
  }

  if (manifests.some((file) => file.relativePath.endsWith(".sql") || file.relativePath.endsWith(".pks") || file.relativePath.endsWith(".pkb"))) {
    sections.push("Database object inventory and migration caveats");
  }

  return sections.slice(0, 5);
}

function buildDatabaseNotes(manifests, database) {
  const sqlFiles = manifests.filter((file) => databaseExtensions.has(path.extname(file.relativePath).toLowerCase()));

  if (database.key === "oracle") {
    return [
      "Oracle packages and procedures should be dependency-mapped before schema evolution.",
      sqlFiles.some((file) => file.content.toLowerCase().includes("execute immediate"))
        ? "Dynamic SQL is present and needs manual review for security and runtime behavior."
        : "Schema migration should capture package contracts and grant dependencies."
    ];
  }

  if (database.key === "mssql") {
    return [
      "Stored procedures should be cataloged before ORM or API-layer upgrades.",
      sqlFiles.some((file) => file.content.toLowerCase().includes("nvarchar"))
        ? "MS SQL types are present and should be checked for ORM compatibility during framework upgrades."
        : "Database deployment sequencing should be folded into CI/CD before cutover."
    ];
  }

  return ["Database migration analysis is not in scope for this run."];
}

function buildMetrics({ fileCount, projectType, complexityCount, securityCount }) {
  const manualMigrationWeeks = projectType === "java" ? 14 : projectType === "angular" ? 10 : 8;
  const codexAssistedWeeks = Math.max(3, manualMigrationWeeks - 4);
  const readinessPenalty = Math.min(30, complexityCount * 3 + securityCount * 4 + Math.round(fileCount / 12));
  const readinessScore = Math.max(52, 92 - readinessPenalty);

  return {
    securityIssues: securityCount,
    complexityHotspots: complexityCount,
    manualMigrationWeeks,
    codexAssistedWeeks,
    maintainabilityGainPercent: Math.min(55, 24 + complexityCount * 4 + securityCount * 3),
    readinessScore
  };
}

function buildSamplePreview(projectType) {
  if (projectType === "java") {
    return {
      title: "Modernized Spring Operations Console",
      summary: "A service-focused dashboard backed by modern Java, clearer API boundaries, and safer deployment automation."
    };
  }

  if (projectType === "angular") {
    return {
      title: "Modernized Angular Portfolio Workspace",
      summary: "A lighter standalone-component UI with sharper routing boundaries and lower frontend complexity."
    };
  }

  return {
    title: "Modernized React Delivery Hub",
    summary: "A component-driven dashboard with stronger state boundaries, typed data flow, and better release visibility."
  };
}

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findMatch(value, pattern) {
  return value?.match(pattern)?.[1]?.trim() || null;
}

function normalizeGradleJavaVersion(value) {
  if (!value) {
    return null;
  }

  return value.replace("JavaVersion.VERSION_", "").replace("_", ".");
}

function normalizeJavaVersion(value) {
  if (value === "1.8") {
    return "8";
  }

  return value;
}

function majorVersion(value) {
  const match = value?.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function dedupe(items) {
  return [...new Set(items)];
}
