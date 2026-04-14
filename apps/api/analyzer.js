import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const generatedSamplesRoot = path.resolve(process.cwd(), "generated_samples");

const targetVersionsByStack = {
  java: ["Java 21", "Java 25"],
  angular: ["Angular 20", "Angular 21"],
  react: ["React 19"]
};

const databaseTargetVersionsByType = {
  oracle: ["Oracle 19c", "Oracle 23ai"],
  mssql: ["SQL Server 2022", "SQL Server 2025"],
  postgres: ["PostgreSQL 16", "PostgreSQL 17"],
  mysql: ["MySQL 8.4", "MySQL 9"],
  sqlite: ["SQLite 3.46"]
};

const sourceExtensions = new Set([".java", ".js", ".jsx", ".ts", ".tsx"]);
const databaseExtensions = new Set([".sql", ".pls", ".pks", ".pkb", ".prc"]);
const packageJsonNames = new Set(["package.json"]);

export async function analyzeRepository(input = {}) {
  return analyzeRepositoryDeep(input);
}

export async function analyzeRepositoryQuick(input = {}) {
  return withResolvedRepository(input.repoUrl, async (resolved) => {
    const scan = await scanRepository({
      repoPath: resolved.repoPath,
      projectTypeHint: input.projectTypeHint,
      databaseHint: input.databaseHint
    });

    return buildQuickReport(scan, {
      repoUrl: input.repoUrl,
      sourceType: resolved.sourceType
    });
  });
}

export async function analyzeRepositoryDeep(input = {}) {
  return withResolvedRepository(input.repoUrl, async (resolved) => {
    const scan = await scanRepository({
      repoPath: resolved.repoPath,
      projectTypeHint: input.projectTypeHint,
      databaseHint: input.databaseHint
    });

    return buildDeepReport(scan, {
      repoUrl: input.repoUrl,
      sourceType: resolved.sourceType,
      selectedTargets: normalizeTargetSelections(input)
    });
  });
}

export async function generateSampleProject(input = {}) {
  const selections = normalizeTargetSelections(input);
  const requestedName = input.projectName || input.name || "modernized-sample";
  const folderSlug = sanitizeFolderName(requestedName);
  const folderSuffix = `${folderSlug}-${Date.now().toString(36)}`;
  const outputRoot = path.join(generatedSamplesRoot, folderSuffix);
  const techEntries = selections.technologies.length > 0 ? selections.technologies : normalizeSelectionList(input.targetTechnologies);
  const databaseEntries = selections.databases.length > 0 ? selections.databases : normalizeSelectionList(input.targetDatabases);
  const libraryEntries = selections.libraries.length > 0 ? selections.libraries : normalizeSelectionList(input.targetLibraries);
  const techLabels = uniqueLabels(techEntries);
  const databaseLabels = uniqueLabels(databaseEntries);
  const libraryLabels = uniqueLabels(libraryEntries);

  await fs.mkdir(outputRoot, { recursive: true });

  const createdFiles = [];
  const manifest = {
    generatedAt: new Date().toISOString(),
    projectName: requestedName,
    technologies: techLabels,
    databases: databaseLabels,
    libraries: libraryLabels
  };

  await writeGeneratedFile(outputRoot, "manifest.json", `${JSON.stringify(manifest, null, 2)}\n`, createdFiles);
  await writeGeneratedFile(
    outputRoot,
    "README.md",
    buildGeneratedReadme({
      projectName: requestedName,
      technologies: techLabels,
      databases: databaseLabels,
      libraries: libraryLabels
    }),
    createdFiles
  );

  if (techLabels.some((item) => item.key === "java")) {
    await writeJavaSample(outputRoot, createdFiles);
  }

  if (techLabels.some((item) => item.key === "angular")) {
    await writeAngularSample(outputRoot, createdFiles);
  }

  if (techLabels.some((item) => item.key === "react")) {
    await writeReactSample(outputRoot, createdFiles);
  }

  if (databaseLabels.length > 0) {
    await writeDatabaseSample(outputRoot, databaseLabels, createdFiles);
  }

  if (libraryLabels.length > 0) {
    await writeLibraryNotes(outputRoot, libraryLabels, createdFiles);
  }

  return {
    generatedAt: manifest.generatedAt,
    outputRoot,
    relativePath: path.relative(process.cwd(), outputRoot) || outputRoot,
    projectName: requestedName,
    technologies: techLabels,
    databases: databaseLabels,
    libraries: libraryLabels,
    files: createdFiles,
    summary: `Created a modernized sample project scaffold under ${outputRoot}.`
  };
}

async function withResolvedRepository(repoUrl, callback) {
  const resolved = await resolveRepository(repoUrl);

  try {
    return await callback(resolved);
  } finally {
    if (resolved.cleanup) {
      await resolved.cleanup();
    }
  }
}

async function scanRepository({ repoPath, projectTypeHint, databaseHint }) {
  const files = await listFiles(repoPath);
  const manifests = await readRelevantFiles(repoPath, files);
  const detectedProjectType = detectProjectType(manifests, projectTypeHint);
  const versions = detectVersions(manifests, detectedProjectType);
  const technologies = detectTechnologies(manifests, detectedProjectType, versions);
  const databases = detectDatabases(manifests, databaseHint);
  const detectedLibraries = detectLibraries(manifests, technologies);

  return {
    repoPath,
    files,
    manifests,
    detectedProjectType,
    versions,
    technologies,
    databases,
    detectedLibraries,
    documentationSections: buildDocumentationSections(manifests, repoPath),
    databaseNotes: buildDatabaseNotes(manifests, databases)
  };
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
      basename === "tsconfig.json" ||
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
  const packageJsonFiles = manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath)));
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

function detectTechnologies(manifests, projectType, versions) {
  const technologies = [];
  const packageFiles = manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath)));
  const pkg = mergePackageJson(packageFiles);
  const dependencies = {
    ...(pkg?.dependencies ?? {}),
    ...(pkg?.devDependencies ?? {})
  };

  if (projectType === "java" || manifests.some((file) => path.extname(file.relativePath).toLowerCase() === ".java")) {
    technologies.push({
      key: "java",
      label: "Java",
      category: "runtime",
      currentVersion: versions.currentVersion,
      targetVersions: targetVersionsByStack.java,
      evidence: collectEvidence(manifests, [".java", "pom.xml", "build.gradle", "build.gradle.kts"]),
      confidence: 0.99
    });

    const springSource =
      (manifests.find((file) => path.basename(file.relativePath) === "pom.xml")?.content ?? "") +
      "\n" +
      (manifests.find((file) => file.relativePath.endsWith("build.gradle") || file.relativePath.endsWith("build.gradle.kts"))?.content ?? "");
    const springVersion =
      findMatch(springSource, /<spring-boot\.version>([^<]+)<\/spring-boot\.version>/i) ||
      findMatch(springSource, /spring-boot-starter-parent[\s\S]*?<version>([^<]+)<\/version>/i) ||
      findMatch(springSource, /id\s+["']org\.springframework\.boot["']\s+version\s+["']([^"']+)["']/i);

    technologies.push({
      key: "spring-boot",
      label: "Spring Boot",
      category: "framework",
      currentVersion: springVersion || null,
      targetVersions: ["Spring Boot 3.x"],
      evidence: collectEvidence(manifests, ["pom.xml", "build.gradle", "build.gradle.kts"]),
      confidence: springVersion ? 0.92 : 0.74
    });
  }

  if (dependencies["@angular/core"] || manifests.some((file) => path.basename(file.relativePath) === "angular.json")) {
    technologies.push({
      key: "angular",
      label: "Angular",
      category: "framework",
      currentVersion: `Angular ${majorVersion(dependencies["@angular/core"] || "10.0.0")}`,
      targetVersions: targetVersionsByStack.angular,
      evidence: collectEvidence(manifests, ["angular.json", "package.json"]),
      confidence: 0.99
    });
  }

  if (dependencies.react) {
    technologies.push({
      key: "react",
      label: "React",
      category: "framework",
      currentVersion: `React ${majorVersion(dependencies.react)}${dependencies["react-scripts"] ? " / CRA" : dependencies.vite ? " / Vite" : ""}`,
      targetVersions: targetVersionsByStack.react,
      evidence: collectEvidence(manifests, ["package.json"]),
      confidence: 0.98
    });
  }

  if (packageFiles.length > 0) {
    technologies.push({
      key: "nodejs",
      label: "Node.js",
      category: "runtime",
      currentVersion: pkg?.engines?.node || null,
      targetVersions: ["Node.js LTS"],
      evidence: collectEvidence(manifests, ["package.json"]),
      confidence: 0.9
    });
  }

  if (dependencies.typescript || manifests.some((file) => file.relativePath.endsWith("tsconfig.json") || file.relativePath.endsWith(".ts") || file.relativePath.endsWith(".tsx"))) {
    technologies.push({
      key: "typescript",
      label: "TypeScript",
      category: "language",
      currentVersion: dependencies.typescript || null,
      targetVersions: ["TypeScript 5.x"],
      evidence: collectEvidence(manifests, ["tsconfig.json", "package.json", ".ts", ".tsx"]),
      confidence: dependencies.typescript ? 0.92 : 0.68
    });
  }

  return dedupeByKey(technologies);
}

function detectDatabases(manifests, databaseHint) {
  const databaseFiles = manifests.filter((file) => databaseExtensions.has(path.extname(file.relativePath).toLowerCase()));
  const candidates = [];

  const addCandidate = (key, title, matcher) => {
    const matches = [];

    for (const file of databaseFiles) {
      const text = file.content.toLowerCase();
      if (matcher(text)) {
        matches.push({
          file: file.relativePath,
          evidence: describeDatabaseEvidence(text, key)
        });
      }
    }

    if (matches.length > 0) {
      candidates.push({
        key,
        title,
        confidence: Math.min(0.98, 0.6 + matches.length * 0.12),
        evidence: matches
      });
    }
  };

  addCandidate("oracle", "Oracle / PL-SQL", (text) => /create or replace (package|procedure|function|trigger)|\bdbms_|varchar2|sysdate|\bnvl\(|\bdual\b|\bpl\/sql\b/.test(text));
  addCandidate("mssql", "MS SQL Server", (text) => /\bnvarchar\b|\bgo\r?\n|\bdbo\.|\bgetdate\(\)|\bisnull\(|\bidentity\(/.test(text));
  addCandidate("postgres", "PostgreSQL", (text) => /\bserial\b|\bbigserial\b|\bjsonb\b|\breturning\b|\bplpgsql\b|\bnow\(\)|\bpublic\./.test(text));
  addCandidate("mysql", "MySQL", (text) => /\bauto_increment\b|\bengine=innodb\b|\blimit\b|\butf8mb4\b|\bifnull\(/.test(text));
  addCandidate("sqlite", "SQLite", (text) => /\bpragma\b|\bautoincrement\b|\bsqlite_/i.test(text));

  if (candidates.length === 0 && databaseHint && databaseHint !== "none") {
    const hinted = normalizeDatabaseHint(databaseHint);
    if (hinted) {
      candidates.push({
        ...hinted,
        confidence: 0.35,
        evidence: []
      });
    }
  }

  return candidates.length > 0 ? candidates : [{ key: "none", title: "No database selected", confidence: 1, evidence: [] }];
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
  const pkg = mergePackageJson(manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath))));
  const angularVersion = pkg?.dependencies?.["@angular/core"] || pkg?.devDependencies?.["@angular/core"] || "10.0.0";

  return {
    currentVersion: `Angular ${majorVersion(angularVersion)}`,
    targetVersions: targetVersionsByStack.angular
  };
}

function detectReactVersions(manifests) {
  const pkg = mergePackageJson(manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath))));
  const reactVersion = pkg?.dependencies?.react || pkg?.devDependencies?.react || "16.0.0";
  const buildTool = pkg?.dependencies?.["react-scripts"] ? " / CRA" : pkg?.devDependencies?.vite || pkg?.dependencies?.vite ? " / Vite" : "";

  return {
    currentVersion: `React ${majorVersion(reactVersion)}${buildTool}`,
    targetVersions: targetVersionsByStack.react
  };
}

function buildUpgradePlan(projectType, versions) {
  return buildRoadmap(projectType, versions, [], [], { security: [], complexity: [], pii: [], blockers: [], suggestions: [] }).phases.map((phase) => ({
    phase: phase.title,
    detail: phase.summary
  }));
}

function detectComplexityFindings(manifests) {
  const findings = manifests
    .filter((file) => sourceExtensions.has(path.extname(file.relativePath).toLowerCase()))
    .map((file) => {
      const lines = file.content.split(/\r?\n/);
      const lineCount = lines.length;
      const nestingTokens = (file.content.match(/\b(if|for|while|switch|catch|case|try)\b/g) || []).length;
      const logicalTokens = (file.content.match(/&&|\|\|/g) || []).length;
      const score = Math.round(lineCount / 12 + nestingTokens * 2 + logicalTokens);

      return {
        file: file.relativePath,
        score,
        lineCount
      };
    })
    .filter((entry) => entry.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => ({
      category: "complexity",
      severity: entry.score >= 14 ? "high" : "medium",
      file: entry.file,
      summary: `${entry.file} shows elevated complexity (score ${entry.score}) across about ${entry.lineCount} lines and should be split before migration.`,
      detail: `${entry.file} has ${entry.lineCount} lines with branching-heavy logic and should be decomposed before modernization.`,
      score: entry.score
    }));

  if (manifests.some((file) => file.relativePath.toLowerCase().includes("service"))) {
    findings.push({
      category: "complexity",
      severity: "medium",
      summary: "Service-layer ownership is blurred across controllers, services, and repositories, which will slow safe refactoring.",
      detail: "The repository structure suggests shared ownership across layers, so boundaries should be normalized before large refactors."
    });
  }

  return dedupeFindings(findings).slice(0, 5);
}

function detectSecurityFindings(manifests, projectType) {
  const findings = [];

  for (const file of manifests) {
    const lower = file.content.toLowerCase();

    if (lower.includes("runtime.getruntime().exec")) {
      findings.push({
        category: "security",
        severity: "high",
        file: file.relativePath,
        summary: `${file.relativePath} invokes system commands directly and needs review before modernization.`,
        detail: "Direct process execution creates command-injection and operational risk."
      });
    }

    if (lower.includes("dangerouslysetinnerhtml") || lower.includes("innerhtml =")) {
      findings.push({
        category: "security",
        severity: "high",
        file: file.relativePath,
        summary: `${file.relativePath} writes raw HTML and should be hardened against injection risks.`,
        detail: "Raw HTML rendering should be audited for XSS risk before framework upgrades."
      });
    }

    if (lower.includes("password=") || lower.includes("apikey") || lower.includes("secret")) {
      findings.push({
        category: "security",
        severity: "medium",
        file: file.relativePath,
        summary: `${file.relativePath} appears to contain sensitive configuration that should move to managed secrets.`,
        detail: "Configuration values that look sensitive should be externalized before release."
      });
    }

    if (lower.includes("select * from") && lower.includes("+")) {
      findings.push({
        category: "security",
        severity: "high",
        file: file.relativePath,
        summary: `${file.relativePath} appears to build SQL dynamically and should be reviewed for injection and performance issues.`,
        detail: "Dynamic SQL concatenation can lead to injection vulnerabilities and unstable query plans."
      });
    }
  }

  const versionFinding = detectDependencyRisk(manifests, projectType);
  if (versionFinding) {
    findings.unshift({
      category: "security",
      severity: "medium",
      summary: versionFinding,
      detail: versionFinding
    });
  }

  return dedupeFindings(findings).slice(0, 6);
}

function detectPiiFindings(manifests) {
  const findings = [];
  const patterns = [
    { pattern: /\bssn\b|\bsocial security\b/i, label: "SSN-like identifiers" },
    { pattern: /\bcredit card\b|\bcard number\b|\bpan\b/i, label: "payment data" },
    { pattern: /\bdate of birth\b|\bdob\b/i, label: "birthdate fields" },
    { pattern: /\bphone\b|\bmobile\b|\baddress\b|\bemail\b/i, label: "contact fields" }
  ];

  for (const file of manifests) {
    const lower = file.content.toLowerCase();
    const isFixtureLike = /fixture|seed|sample|mock|test/i.test(file.relativePath);

    for (const entry of patterns) {
      if (entry.pattern.test(lower) && isFixtureLike) {
        findings.push({
          category: "pii",
          severity: "medium",
          file: file.relativePath,
          summary: `${file.relativePath} may contain ${entry.label} in fixture or seed data and should be reviewed before modernization.`,
          detail: "Potentially sensitive sample data should be masked or removed before refactoring and test expansion."
        });
      }
    }
  }

  return dedupeFindings(findings).slice(0, 4);
}

function detectBlockerFindings(manifests, technologies, databases, securityFindings) {
  const findings = [];
  const javaTech = technologies.find((item) => item.key === "java");
  const angularTech = technologies.find((item) => item.key === "angular");
  const reactTech = technologies.find((item) => item.key === "react");

  if (javaTech && javaTech.currentVersion && javaTech.currentVersion.includes("Java 8")) {
    findings.push({
      category: "blockers",
      severity: "high",
      summary: "Java 8-era dependencies are likely past enterprise support windows and should be upgraded with security regression testing.",
      detail: "The runtime baseline is old enough that library compatibility and toolchain support will likely block an automated jump."
    });
  }

  if (angularTech && majorVersion(extractVersion(angularTech.currentVersion)) < 18) {
    findings.push({
      category: "blockers",
      severity: "high",
      summary: "Angular dependencies are several major versions behind and likely include unsupported or vulnerable packages.",
      detail: "A version gap this large usually requires staged dependency upgrades and manual validation."
    });
  }

  if (reactTech && majorVersion(extractVersion(reactTech.currentVersion)) < 19) {
    findings.push({
      category: "blockers",
      severity: "medium",
      summary: "React and its tooling are behind the modern support baseline, increasing supply-chain and maintenance risk.",
      detail: "This stack should be aligned before larger UI refactors are attempted."
    });
  }

  if (databases.length > 1) {
    findings.push({
      category: "blockers",
      severity: "high",
      summary: "Multiple database dialects were detected, so migration work will need split playbooks and separate validation tracks.",
      detail: "Mixed SQL dialects usually require different compatibility rules, data movement plans, and rollback rehearsals."
    });
  }

  if (securityFindings.some((item) => item.summary.includes("dynamic SQL") || item.summary.includes("system commands"))) {
    findings.push({
      category: "blockers",
      severity: "medium",
      summary: "Security-sensitive code paths need manual review before automated refactoring.",
      detail: "Command execution and dynamic SQL should be isolated before large-scale modernization."
    });
  }

  return dedupeFindings(findings).slice(0, 5);
}

function buildSuggestionsFindings(projectType, versions, technologies, databases, detectedLibraries) {
  const findings = [];
  const databaseLabel = databases[0]?.title || "the current database";
  const primaryTech = technologies[0];

  findings.push({
    category: "suggestions",
    severity: "low",
    summary: `Start with a dependency and manifest inventory so ${primaryTech?.label || projectType} changes can be sequenced safely.`,
    detail: "A manifest-first approach keeps modernization decisions grounded in actual stack usage."
  });

  findings.push({
    category: "suggestions",
    severity: "low",
    summary: "Use the detected libraries list to separate framework upgrades from utility package cleanup.",
    detail: "This makes it easier for the UI to surface the major platform change set versus small dependency chores."
  });

  findings.push({
    category: "suggestions",
    severity: "low",
    summary: `Plan database work around ${databaseLabel} so schema, procedure, and data-migration tasks stay coordinated.`,
    detail: "Database modernization is usually the longest pole, so it should drive the execution order."
  });

  if (detectedLibraries.length > 0) {
    findings.push({
      category: "suggestions",
      severity: "low",
      summary: "Prioritize the libraries and frameworks that appear most central to the build before touching edge dependencies.",
      detail: "Core dependencies drive the highest compatibility risk and give the best ROI for early upgrades."
    });
  }

  return dedupeFindings(findings).slice(0, 5);
}

function buildFindings({ manifests, projectType, technologies, databases, detectedLibraries, versions }) {
  const security = detectSecurityFindings(manifests, projectType);
  const complexity = detectComplexityFindings(manifests);
  const pii = detectPiiFindings(manifests);
  const blockers = detectBlockerFindings(manifests, technologies, databases, security);
  const suggestions = buildSuggestionsFindings(projectType, versions, technologies, databases, detectedLibraries);

  return {
    security,
    complexity,
    pii,
    blockers,
    suggestions
  };
}

function buildRoadmap(projectType, versions, technologies, databases, findings) {
  const databaseLabel = databases[0]?.title || "the current database";
  const primaryTechnology = technologies[0]?.label || (projectType === "java" ? "Java" : projectType === "angular" ? "Angular" : "React");

  if (projectType === "java") {
    return {
      summary: `Modernize the ${primaryTechnology} stack, then sequence database and security-sensitive changes around ${databaseLabel}.`,
      phases: [
        {
          title: "Phase 1",
          summary: "Inventory Java and Spring dependencies, then upgrade build plugins to versions compatible with modern JDKs."
        },
        {
          title: "Phase 2",
          summary: `Move from ${versions.currentVersion} to ${versions.targetVersions[0]} with test stabilization and deprecated API cleanup.`
        },
        {
          title: "Phase 3",
          summary: "Refactor security filters, transaction boundaries, and oversized services before CI hardening."
        }
      ],
      focusAreas: findings.blockers.slice(0, 3).map((item) => item.summary)
    };
  }

  if (projectType === "angular") {
    return {
      summary: `Modernize the ${primaryTechnology} stack while keeping UI routing and ${databaseLabel} integration stable.`,
      phases: [
        {
          title: "Phase 1",
          summary: "Increment Angular CLI and TypeScript support in safe steps and remove deprecated RxJS patterns."
        },
        {
          title: "Phase 2",
          summary: `Target ${versions.targetVersions[0]} and convert brittle NgModule-heavy features toward standalone-friendly patterns.`
        },
        {
          title: "Phase 3",
          summary: "Add stricter linting, modern test coverage, and build pipeline validation."
        }
      ],
      focusAreas: findings.blockers.slice(0, 3).map((item) => item.summary)
    };
  }

  return {
    summary: `Modernize the ${primaryTechnology} stack, then land database and security changes in a controlled sequence.`,
    phases: [
      {
        title: "Phase 1",
        summary: "Replace legacy Create React App conventions and align package tooling with a supported modern stack."
      },
      {
        title: "Phase 2",
        summary: `Upgrade from ${versions.currentVersion} to ${versions.targetVersions[0]} and remove deprecated class lifecycle behavior.`
      },
      {
        title: "Phase 3",
        summary: "Split heavy pages into typed, testable UI and data layers with stronger security boundaries."
      }
    ],
    focusAreas: findings.blockers.slice(0, 3).map((item) => item.summary)
  };
}

function detectDependencyRisk(manifests, projectType) {
  if (projectType === "java") {
    const javaInfo = detectJavaVersions(manifests);
    if (javaInfo.currentVersion.includes("Java 8")) {
      return "Java 8-era dependencies are likely past enterprise support windows and should be upgraded with security regression testing.";
    }
  }

  const pkg = mergePackageJson(manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath))));
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

function buildDocsRows(documentationSections, technologies, databases) {
  const primaryTech = technologies[0]?.label || "Application stack";
  const databaseLabel = databases.length > 0 ? databases.map((item) => item.title).join(", ") : "No database selected";
  const confluenceLinks = {
    workspace: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/622608/LegacyModernizeAI+Documentation+Folder",
    architecture: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/229495/LegacyModernizeAI+-+Project+Intake+and+Scan+Summary",
    technology: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/229510/LegacyModernizeAI+-+Technology+and+Library+Detection",
    findings: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/819201/LegacyModernizeAI+-+Security+Complexity+and+PII+Findings",
    roadmap: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/622624/LegacyModernizeAI+-+Migration+Roadmap+and+Effort+Estimate",
    upgrades: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/98307/LegacyModernizeAI+-+Upgrade+Recommendations",
    documentation: "https://capgemini-team-hacakathon.atlassian.net/wiki/spaces/~7120209fddd516fad3496fae695bef8805785e/pages/851969/LegacyModernizeAI+-+Generated+Developer+Documentation"
  };

  return [
    {
      title: "Architecture summary",
      detail: `Capture the current ${primaryTech} boundaries, key modules, and migration assumptions.`,
      meta: "Architecture",
      link: confluenceLinks.architecture
    },
    {
      title: "Database touchpoints",
      detail: `Document procedures, schema dependencies, and rollout caveats for ${databaseLabel}.`,
      meta: "Data",
      link: confluenceLinks.findings
    },
    {
      title: "Upgrade decisions",
      detail: documentationSections[1] || "Track runtime, framework, and dependency decisions with rationale.",
      meta: "Engineering",
      link: confluenceLinks.upgrades
    },
    {
      title: "Onboarding notes",
      detail: documentationSections[2] || "Summarize how new developers build, test, and navigate the system.",
      meta: "Enablement",
      link: confluenceLinks.documentation
    }
  ];
}

function buildDatabaseNotes(manifests, databases) {
  const sqlFiles = manifests.filter((file) => databaseExtensions.has(path.extname(file.relativePath).toLowerCase()));
  const database = databases[0];

  if ((databases || []).length > 1) {
    return [
      "Multiple database dialects were detected, so schema modernization should be split into separate playbooks.",
      "Each dialect should get its own migration, validation, and rollback plan."
    ];
  }

  if (database?.key === "oracle") {
    return [
      "Oracle packages and procedures should be dependency-mapped before schema evolution.",
      sqlFiles.some((file) => file.content.toLowerCase().includes("execute immediate"))
        ? "Dynamic SQL is present and needs manual review for security and runtime behavior."
        : "Schema migration should capture package contracts and grant dependencies."
    ];
  }

  if (database?.key === "mssql") {
    return [
      "Stored procedures should be cataloged before ORM or API-layer upgrades.",
      sqlFiles.some((file) => file.content.toLowerCase().includes("nvarchar"))
        ? "MS SQL types are present and should be checked for ORM compatibility during framework upgrades."
        : "Database deployment sequencing should be folded into CI/CD before cutover."
    ];
  }

  return ["Database migration analysis is not in scope for this run."];
}

function buildEffort({ fileCount, projectType, findings, technologies, databases }) {
  const manualMigrationWeeks = projectType === "java" ? 14 : projectType === "angular" ? 10 : 8;
  const codexAssistedWeeks = Math.max(3, manualMigrationWeeks - 4);
  const readinessPenalty = Math.min(
    30,
    findings.complexity.length * 3 +
      findings.security.length * 4 +
      findings.blockers.length * 5 +
      findings.pii.length * 2 +
      Math.round(fileCount / 12) +
      Math.max(0, databases.length - 1) * 2
  );
  const readinessScore = Math.max(52, 92 - readinessPenalty);

  return {
    securityIssues: findings.security.length,
    complexityHotspots: findings.complexity.length,
    piiFindings: findings.pii.length,
    blockers: findings.blockers.length,
    technologiesDetected: technologies.length,
    databasesDetected: databases.length,
    manualMigrationWeeks,
    codexAssistedWeeks,
    maintainabilityGainPercent: Math.min(55, 24 + findings.complexity.length * 4 + findings.security.length * 3),
    readinessScore
  };
}

function detectLibraries(manifests, technologies) {
  const results = [];
  const packageFiles = manifests.filter((file) => packageJsonNames.has(path.basename(file.relativePath)));
  const pkg = mergePackageJson(packageFiles);
  const packageEntries = [
    ...Object.entries(pkg.dependencies ?? {}).map(([name, version]) => ({ name, version, source: "package.json", kind: "dependency" })),
    ...Object.entries(pkg.devDependencies ?? {}).map(([name, version]) => ({ name, version, source: "package.json", kind: "devDependency" }))
  ];

  for (const entry of packageEntries) {
    results.push({
      name: entry.name,
      version: entry.version,
      kind: entry.kind,
      source: entry.source,
      family: inferLibraryFamily(entry.name),
      evidence: ["package.json"]
    });
  }

  for (const file of manifests) {
    if (path.basename(file.relativePath) === "pom.xml") {
      const matches = [...file.content.matchAll(/<artifactId>([^<]+)<\/artifactId>/gi)];
      for (const match of matches) {
        const artifactId = match[1].trim();
        results.push({
          name: artifactId,
          version: findVersionNearArtifact(file.content, artifactId),
          kind: "maven-artifact",
          source: file.relativePath,
          family: inferLibraryFamily(artifactId),
          evidence: [file.relativePath]
        });
      }
    }

    if (file.relativePath.endsWith("build.gradle") || file.relativePath.endsWith("build.gradle.kts")) {
      const matches = [...file.content.matchAll(/['"]([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+):([^'" )]+)['"]/g)];
      for (const match of matches) {
        const artifactId = match[2].trim();
        results.push({
          name: artifactId,
          version: match[3].trim(),
          kind: "gradle-dependency",
          source: file.relativePath,
          family: inferLibraryFamily(artifactId),
          evidence: [file.relativePath]
        });
      }
    }
  }

  const techNames = new Set(technologies.map((item) => item.key));
  return dedupeLibraryEntries(results).filter((entry) => !techNames.has(entry.name)).slice(0, 40);
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

function buildQuickReport(scan, context) {
  const targetOptions = buildTargetOptions(scan.technologies, scan.databases, scan.detectedLibraries);
  const primaryTechnology = scan.technologies[0] ?? {
    key: scan.detectedProjectType,
    label: scan.detectedProjectType === "java" ? "Java" : scan.detectedProjectType === "angular" ? "Angular" : "React",
    currentVersion: scan.versions.currentVersion,
    targetVersions: scan.versions.targetVersions
  };
  const primaryDatabase = scan.databases[0] ?? { key: "none", title: "No database selected" };
  const primaryTargetVersions = primaryTechnology.targetVersions || scan.versions.targetVersions;

  return {
    repoUrl: context.repoUrl,
    analyzedAt: new Date().toISOString(),
    sourceType: context.sourceType,
    analysisMode: "quick",
    detectedProjectType: scan.detectedProjectType,
    analyzedFilesCount: scan.files.length,
    currentVersion: primaryTechnology.currentVersion || scan.versions.currentVersion,
    targetVersion: primaryTargetVersions[0] || null,
    availableTargetVersions: primaryTargetVersions,
    database: scan.databases.length > 0 ? scan.databases.map((item) => item.title).join(", ") : primaryDatabase.title,
    technologies: scan.technologies,
    databases: scan.databases,
    detectedLibraries: scan.detectedLibraries,
    targetOptions,
    summary: buildQuickSummary(scan, primaryTechnology, primaryDatabase),
    quickInsights: buildQuickInsights(scan, primaryTechnology, primaryDatabase),
    metrics: {
      filesScanned: scan.files.length,
      technologiesDetected: scan.technologies.length,
      databasesDetected: scan.databases.length,
      librariesDetected: scan.detectedLibraries.length
    },
    sampleAppPreview: buildSamplePreview(scan.detectedProjectType)
  };
}

function buildDeepReport(scan, context) {
  const targetOptions = buildTargetOptions(scan.technologies, scan.databases, scan.detectedLibraries);
  const selectedTargets = context.selectedTargets || normalizeTargetSelections({});
  const selectedTargetVersions = buildSelectedTargetVersions(scan, selectedTargets);
  const primaryTechnology = scan.technologies[0] ?? {
    key: scan.detectedProjectType,
    label: scan.detectedProjectType === "java" ? "Java" : scan.detectedProjectType === "angular" ? "Angular" : "React",
    currentVersion: scan.versions.currentVersion,
    targetVersions: scan.versions.targetVersions
  };
  const primaryDatabase = scan.databases[0] ?? {
    key: "none",
    title: "No database selected"
  };
  const effectiveTargetVersions = selectedTargetVersions.technologies[primaryTechnology.key] || primaryTechnology.targetVersions || scan.versions.targetVersions;
  const effectiveVersions = {
    ...scan.versions,
    targetVersions: effectiveTargetVersions
  };
  const findings = buildFindings({
    manifests: scan.manifests,
    projectType: scan.detectedProjectType,
    technologies: scan.technologies,
    databases: scan.databases,
    detectedLibraries: scan.detectedLibraries,
    versions: effectiveVersions
  });
  const roadmap = buildRoadmap(scan.detectedProjectType, effectiveVersions, scan.technologies, scan.databases, findings);
  const effort = buildEffort({
    fileCount: scan.files.length,
    projectType: scan.detectedProjectType,
    findings,
    technologies: scan.technologies,
    databases: scan.databases
  });
  const metrics = {
    securityIssues: findings.security.length,
    complexityHotspots: findings.complexity.length,
    manualMigrationWeeks: effort.manualMigrationWeeks,
    codexAssistedWeeks: effort.codexAssistedWeeks,
    maintainabilityGainPercent: effort.maintainabilityGainPercent,
    readinessScore: effort.readinessScore
  };

  return {
    repoUrl: context.repoUrl,
    analyzedAt: new Date().toISOString(),
    sourceType: context.sourceType,
    analysisMode: "deep",
    detectedProjectType: scan.detectedProjectType,
    analyzedFilesCount: scan.files.length,
    currentVersion: primaryTechnology.currentVersion || scan.versions.currentVersion,
    targetVersion: effectiveTargetVersions[0] || null,
    availableTargetVersions: primaryTechnology.targetVersions || scan.versions.targetVersions,
    selectedTargetVersions,
    database: scan.databases.length > 0 ? scan.databases.map((item) => item.title).join(", ") : primaryDatabase.title,
    readinessScore: effort.readinessScore,
    metrics,
    technologies: scan.technologies,
    databases: scan.databases,
    detectedLibraries: scan.detectedLibraries,
    targetOptions,
    findings,
    roadmap,
    effort,
    docsRows: buildDocsRows(scan.documentationSections, scan.technologies, scan.databases),
    roadmapSections: roadmap.phases.map((phase) => ({
      title: phase.title,
      detail: phase.summary,
      meta: "Planned phase"
    })),
    upgradePlan: roadmap.phases.map((phase) => ({
      phase: phase.title,
      detail: phase.summary
    })),
    securityHotspots: findings.security.map((item) => item.summary),
    complexityHotspots: findings.complexity.map((item) => item.summary),
    databaseNotes: scan.databaseNotes,
    documentationSections: scan.documentationSections,
    canAutomate: [
      "Dependency inventory and version mapping",
      "Upgrade sequencing and risk summaries",
      "Documentation draft generation",
      "Sample modernized UI scaffolding"
    ],
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
    sampleAppPreview: buildSamplePreview(scan.detectedProjectType)
  };
}

function buildQuickSummary(scan, primaryTechnology, primaryDatabase) {
  const technologies = scan.technologies.filter((item) => ["java", "angular", "react"].includes(item.key)).map((item) => item.label);
  const databaseNames = scan.databases.filter((item) => item.key !== "none").map((item) => item.title);
  const librariesCount = scan.detectedLibraries.length;

  return {
    headline: `Quick scan found ${technologies.length > 0 ? technologies.join(", ") : "a legacy stack"} and ${databaseNames.length > 0 ? databaseNames.join(", ") : "no database marker"} in the repository.`,
    nextStep: "Use the target selectors to choose the desired modernization baseline, then run deep analysis for findings and roadmap output.",
    focus: `${primaryTechnology.label} and ${primaryDatabase.title} are the main anchors for the next step.`,
    libraryNote: librariesCount > 0 ? `${librariesCount} libraries were detected and can be reviewed in the target section.` : "No package libraries were detected in this quick pass."
  };
}

function buildQuickInsights(scan, primaryTechnology, primaryDatabase) {
  const insights = [
    `${scan.files.length} files were scanned for stack and dependency signals.`,
    `Primary runtime or UI stack: ${primaryTechnology.label}.`
  ];

  if (primaryTechnology.currentVersion) {
    insights.push(`Current version baseline: ${primaryTechnology.currentVersion}.`);
  }

  if (primaryDatabase.key !== "none") {
    insights.push(`Database signal detected: ${primaryDatabase.title}.`);
  }

  if (scan.detectedLibraries.length > 0) {
    insights.push(`${scan.detectedLibraries.length} libraries were discovered from manifests and build files.`);
  }

  return insights;
}

function buildTargetOptions(technologies, databases, detectedLibraries) {
  return {
    technologies: technologies.map((item) => ({
      key: item.key,
      label: item.label,
      category: item.category,
      currentVersion: item.currentVersion,
      targetVersions: getTargetVersionsForTechnology(item)
    })),
    databases: databases.map((item) => ({
      key: item.key,
      label: item.title,
      targetVersions: getTargetVersionsForDatabase(item)
    })),
    libraries: detectedLibraries.map((item) => ({
      key: item.name,
      name: item.name,
      family: item.family,
      currentVersion: item.version || null,
      targetVersions: getTargetVersionsForLibrary(item)
    }))
  };
}

function buildSelectedTargetVersions(scan, selectedTargets) {
  return {
    technologies: indexSelectionsByKey(scan.technologies, selectedTargets.technologies, (item) => getTargetVersionsForTechnology(item)),
    databases: indexSelectionsByKey(scan.databases, selectedTargets.databases, (item) => getTargetVersionsForDatabase(item)),
    libraries: indexSelectionsByKey(scan.detectedLibraries, selectedTargets.libraries, (item) => getTargetVersionsForLibrary(item))
  };
}

function indexSelectionsByKey(items, selections, fallbackFactory) {
  const map = {};

  for (const item of items) {
    const matchingSelection = findMatchingSelection(selections, item);
    const selectedVersions = normalizeSelectedVersions(matchingSelection, fallbackFactory(item));
    map[item.key || item.name] = selectedVersions;
  }

  return map;
}

function findMatchingSelection(selections, item) {
  return selections.find((selection) => {
    const normalizedKey = normalizeSelectionToken(selection.key || selection.id || selection.name || selection.label);
    const normalizedLabel = normalizeSelectionToken(selection.label || selection.name);
    const itemKey = normalizeSelectionToken(item.key || item.name || item.label);
    const itemLabel = normalizeSelectionToken(item.label || item.title || item.name);
    const itemFamily = normalizeSelectionToken(item.family);

    return (
      normalizedKey === itemKey ||
      normalizedKey === itemLabel ||
      normalizedLabel === itemKey ||
      normalizedLabel === itemLabel ||
      normalizedKey === itemFamily ||
      normalizedLabel === itemFamily
    );
  });
}

function normalizeSelectedVersions(selection, fallbackVersions) {
  if (!selection) {
    return fallbackVersions;
  }

  const explicitVersion = selection.targetVersion || selection.version || selection.value || selection.selectedVersion || selection.selected;
  if (explicitVersion) {
    return [explicitVersion];
  }

  const explicitVersions = selection.targetVersions || selection.versions || selection.options;
  if (Array.isArray(explicitVersions) && explicitVersions.length > 0) {
    return explicitVersions.map((item) => (typeof item === "string" ? item : item?.label || item?.value || item?.version)).filter(Boolean);
  }

  return fallbackVersions;
}

function normalizeTargetSelections(input = {}) {
  const selectedTargets = input.selectedTargets || input.targetSelections || {};

  return {
    technologies: normalizeSelectionList(selectedTargets.technologies || input.targetTechnologies || input.technologies),
    databases: normalizeSelectionList(selectedTargets.databases || input.targetDatabases || input.databases),
    libraries: normalizeSelectionList(selectedTargets.libraries || input.targetLibraries || input.libraries)
  };
}

function normalizeSelectionList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeSelectionEntry(entry))
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => normalizeSelectionEntry(entry, key))
      .filter(Boolean);
  }

  return [];
}

function normalizeSelectionEntry(entry, fallbackKey) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    return {
      key: normalizeSelectionKey(fallbackKey || entry),
      name: entry,
      label: entry,
      value: entry
    };
  }

  return {
    key: normalizeSelectionKey(entry.key || entry.id || entry.name || entry.label || fallbackKey || null),
    name: entry.name || entry.label || entry.key || fallbackKey || null,
    label: entry.label || entry.name || entry.key || fallbackKey || null,
    family: entry.family || null,
    category: entry.category || null,
    type: entry.type || null,
    value: entry.value || entry.targetVersion || entry.version || entry.selectedVersion || entry.target || null,
    targetVersion: entry.targetVersion || entry.version || entry.value || entry.selectedVersion || entry.target || null,
    targetVersions: Array.isArray(entry.targetVersions) ? entry.targetVersions : null
  };
}

function getTargetVersionsForTechnology(item) {
  if (item.key === "java") {
    return targetVersionsByStack.java;
  }

  if (item.key === "angular") {
    return targetVersionsByStack.angular;
  }

  if (item.key === "react") {
    return targetVersionsByStack.react;
  }

  if (item.key === "spring-boot") {
    return ["Spring Boot 3.x"];
  }

  if (item.key === "nodejs") {
    return ["Node.js LTS"];
  }

  if (item.key === "typescript") {
    return ["TypeScript 5.x"];
  }

  return ["Latest supported"];
}

function getTargetVersionsForDatabase(item) {
  return databaseTargetVersionsByType[item.key] || ["Validated target version"];
}

function getTargetVersionsForLibrary(item) {
  if (item.family === "spring") {
    return ["Spring Framework 6.x", "Latest compatible"];
  }

  if (item.family === "angular") {
    return targetVersionsByStack.angular;
  }

  if (item.family === "react") {
    return targetVersionsByStack.react;
  }

  if (item.family === "typescript") {
    return ["TypeScript 5.x"];
  }

  return ["Latest stable", "Latest compatible"];
}

async function writeGeneratedFile(rootDir, relativePath, content, createdFiles) {
  const fullPath = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
  createdFiles.push(path.relative(rootDir, fullPath));
}

function buildGeneratedReadme({ projectName, technologies, databases, libraries }) {
  const techLines = technologies.length > 0 ? technologies.map((item) => `- ${item.label}`).join("\n") : "- No explicit target technology";
  const databaseLines = databases.length > 0 ? databases.map((item) => `- ${item.label}`).join("\n") : "- No explicit target database";
  const libraryLines = libraries.length > 0 ? libraries.map((item) => `- ${item.name}${item.value ? ` (${item.value})` : ""}`).join("\n") : "- No explicit target library";

  return [
    `# ${projectName}`,
    "",
    "This scaffold was generated by LegacyModernizeAI to preview a modernized target-state application.",
    "",
    "## Target technologies",
    techLines,
    "",
    "## Target databases",
    databaseLines,
    "",
    "## Target libraries",
    libraryLines,
    "",
    "## Folder layout",
    "- `backend-java/` for Java modernization samples",
    "- `frontend-angular/` for Angular modernization samples",
    "- `frontend-react/` for React modernization samples",
    "- `database/` for schema and migration notes",
    "",
    "## Notes",
    "This is intentionally small but believable so the hackathon demo can show a generated target project without needing a full production build."
  ].join("\n");
}

async function writeJavaSample(rootDir, createdFiles) {
  const javaDir = path.join(rootDir, "backend-java");
  await writeGeneratedFile(
    javaDir,
    "pom.xml",
    [
      "<project xmlns=\"http://maven.apache.org/POM/4.0.0\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"",
      "  xsi:schemaLocation=\"http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd\">",
      "  <modelVersion>4.0.0</modelVersion>",
      "  <groupId>com.legacymodernize</groupId>",
      "  <artifactId>modernized-java-service</artifactId>",
      "  <version>0.1.0</version>",
      "  <properties>",
      "    <java.version>21</java.version>",
      "    <spring-boot.version>3.3.0</spring-boot.version>",
      "  </properties>",
      "  <dependencies>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-web</artifactId>",
      "    </dependency>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-test</artifactId>",
      "      <scope>test</scope>",
      "    </dependency>",
      "  </dependencies>",
      "</project>",
      ""
    ].join("\n"),
    createdFiles
  );

  await writeGeneratedFile(
    javaDir,
    "src/main/java/com/legacymodernize/app/ModernizedApplication.java",
    [
      "package com.legacymodernize.app;",
      "",
      "public class ModernizedApplication {",
      "  public static void main(String[] args) {",
      "    System.out.println(\"Modernized Java service ready for upgrade validation.\");",
      "  }",
      "}",
      ""
    ].join("\n"),
    createdFiles
  );

  await writeGeneratedFile(
    javaDir,
    "src/main/java/com/legacymodernize/app/web/StatusController.java",
    [
      "package com.legacymodernize.app.web;",
      "",
      "public class StatusController {",
      "  public String health() {",
      "    return \"ok\";",
      "  }",
      "}",
      ""
    ].join("\n"),
    createdFiles
  );
}

async function writeAngularSample(rootDir, createdFiles) {
  const angularDir = path.join(rootDir, "frontend-angular");
  await writeGeneratedFile(
    angularDir,
    "package.json",
    JSON.stringify(
      {
        name: "modernized-angular-workspace",
        private: true,
        version: "0.1.0",
        scripts: {
          start: "ng serve",
          build: "ng build"
        },
        dependencies: {
          "@angular/core": "^20.0.0",
          "@angular/common": "^20.0.0",
          "@angular/platform-browser": "^20.0.0",
          "rxjs": "^7.8.1",
          "zone.js": "^0.15.0"
        },
        devDependencies: {
          "@angular/cli": "^20.0.0",
          "typescript": "^5.6.0"
        }
      },
      null,
      2
    ) + "\n",
    createdFiles
  );

  await writeGeneratedFile(
    angularDir,
    "src/app/app.component.ts",
    [
      "export class AppComponent {",
      "  title = 'Modernized Angular workspace';",
      "}",
      ""
    ].join("\n"),
    createdFiles
  );

  await writeGeneratedFile(
    angularDir,
    "src/app/app.component.html",
    "<main class=\"workspace\"><h1>Modernized Angular workspace</h1><p>Target-ready UI shell generated by LegacyModernizeAI.</p></main>\n",
    createdFiles
  );
}

async function writeReactSample(rootDir, createdFiles) {
  const reactDir = path.join(rootDir, "frontend-react");
  await writeGeneratedFile(
    reactDir,
    "package.json",
    JSON.stringify(
      {
        name: "modernized-react-workspace",
        private: true,
        version: "0.1.0",
        scripts: {
          dev: "vite",
          build: "vite build"
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          vite: "^6.0.0"
        }
      },
      null,
      2
    ) + "\n",
    createdFiles
  );

  await writeGeneratedFile(
    reactDir,
    "src/App.jsx",
    [
      "export default function App() {",
      "  return (",
      "    <main>",
      "      <h1>Modernized React workspace</h1>",
      "      <p>Generated sample output ready for migration review.</p>",
      "    </main>",
      "  );",
      "}",
      ""
    ].join("\n"),
    createdFiles
  );
}

async function writeDatabaseSample(rootDir, databases, createdFiles) {
  const databaseDir = path.join(rootDir, "database");
  const databaseName = databases[0]?.label || "Database";
  await writeGeneratedFile(
    databaseDir,
    "schema.sql",
    [
      `-- ${databaseName} modernization sample`,
      "CREATE TABLE modernization_audit (",
      "  audit_id INT PRIMARY KEY,",
      "  source_system VARCHAR(120) NOT NULL,",
      "  target_state VARCHAR(120) NOT NULL,",
      "  created_at TIMESTAMP NOT NULL",
      ");",
      ""
    ].join("\n"),
    createdFiles
  );
}

async function writeLibraryNotes(rootDir, libraries, createdFiles) {
  const notesDir = path.join(rootDir, "libraries");
  await writeGeneratedFile(
    notesDir,
    "target-libraries.json",
    `${JSON.stringify(
      libraries.map((item) => ({
        name: item.name,
        currentVersion: item.currentVersion || null,
        targetVersions: item.targetVersions || []
      })),
      null,
      2
    )}\n`,
    createdFiles
  );
}

function sanitizeFolderName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "modernized-sample";
}

function uniqueLabels(entries) {
  const seen = new Map();

  for (const entry of entries) {
    const key = normalizeSelectionToken(entry.key || entry.name || entry.label);
    if (!seen.has(key)) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()];
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

function mergePackageJson(packageFiles) {
  return packageFiles.reduce(
    (acc, file) => {
      const pkg = safeJsonParse(file.content);
      if (!pkg) {
        return acc;
      }

      acc.dependencies = {
        ...(acc.dependencies ?? {}),
        ...(pkg.dependencies ?? {})
      };
      acc.devDependencies = {
        ...(acc.devDependencies ?? {}),
        ...(pkg.devDependencies ?? {})
      };
      acc.engines = {
        ...(acc.engines ?? {}),
        ...(pkg.engines ?? {})
      };
      return acc;
    },
    { dependencies: {}, devDependencies: {}, engines: {} }
  );
}

function collectEvidence(manifests, markers) {
  const evidence = [];

  for (const marker of markers) {
    const matchedFile = manifests.find((file) => {
      if (marker.startsWith(".")) {
        return file.relativePath.toLowerCase().endsWith(marker.toLowerCase());
      }

      return path.basename(file.relativePath).toLowerCase() === marker.toLowerCase();
    });

    if (matchedFile) {
      evidence.push(matchedFile.relativePath);
    }
  }

  return dedupe(evidence);
}

function dedupeByKey(items) {
  const map = new Map();

  for (const item of items) {
    if (!map.has(item.key)) {
      map.set(item.key, item);
      continue;
    }

    const existing = map.get(item.key);
    map.set(item.key, {
      ...existing,
      ...item,
      evidence: dedupe([...(existing.evidence ?? []), ...(item.evidence ?? [])])
    });
  }

  return [...map.values()];
}

function dedupeLibraryEntries(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${item.name}:${item.version || ""}:${item.source}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function dedupeFindings(items) {
  const map = new Map();

  for (const item of items) {
    const key = `${item.category}:${item.file || ""}:${item.summary}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

function describeDatabaseEvidence(text, key) {
  if (key === "oracle") {
    return text.includes("dbms_") ? "dbms_ package usage" : "Oracle PL/SQL syntax";
  }

  if (key === "mssql") {
    return text.includes("nvarchar") ? "nvarchar column types" : "SQL Server query syntax";
  }

  if (key === "postgres") {
    return text.includes("jsonb") ? "jsonb usage" : "PostgreSQL dialect features";
  }

  if (key === "mysql") {
    return text.includes("auto_increment") ? "auto_increment columns" : "MySQL dialect features";
  }

  return "SQLite dialect features";
}

function normalizeDatabaseHint(databaseHint) {
  if (!databaseHint) {
    return null;
  }

  if (databaseHint === "oracle") {
    return { key: "oracle", title: "Oracle / PL-SQL" };
  }

  if (databaseHint === "mssql") {
    return { key: "mssql", title: "MS SQL Server" };
  }

  if (databaseHint === "postgres") {
    return { key: "postgres", title: "PostgreSQL" };
  }

  if (databaseHint === "mysql") {
    return { key: "mysql", title: "MySQL" };
  }

  if (databaseHint === "sqlite") {
    return { key: "sqlite", title: "SQLite" };
  }

  return null;
}

function inferLibraryFamily(name) {
  if (name.startsWith("@angular/") || name === "rxjs" || name === "zone.js") {
    return "angular";
  }

  if (name === "react" || name === "react-dom" || name === "react-router" || name === "react-router-dom" || name === "vite" || name === "react-scripts") {
    return "react";
  }

  if (name.startsWith("spring-boot") || name.startsWith("spring-")) {
    return "spring";
  }

  if (name === "typescript" || name === "tslib") {
    return "typescript";
  }

  return "library";
}

function findVersionNearArtifact(content, artifactId) {
  const regex = new RegExp(`<artifactId>${escapeRegExp(artifactId)}<\\/artifactId>[\\s\\S]*?<version>([^<]+)<\\/version>`, "i");
  return findMatch(content, regex);
}

function extractVersion(value) {
  return value?.match(/(\d+(?:\.\d+)*)/)?.[1] || value || "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSelectionToken(value) {
  return (value || "").toString().trim().toLowerCase();
}

function normalizeSelectionKey(value) {
  const token = normalizeSelectionToken(value);

  if (!token) {
    return "";
  }

  if (token.includes("java")) {
    return "java";
  }

  if (token.includes("angular")) {
    return "angular";
  }

  if (token.includes("react")) {
    return "react";
  }

  if (token.includes("spring boot") || token.includes("spring-boot")) {
    return "spring-boot";
  }

  if (token.includes("typescript")) {
    return "typescript";
  }

  if (token.includes("node")) {
    return "nodejs";
  }

  if (token.includes("oracle")) {
    return "oracle";
  }

  if (token.includes("sql server") || token.includes("mssql")) {
    return "mssql";
  }

  if (token.includes("postgres")) {
    return "postgres";
  }

  if (token.includes("mysql")) {
    return "mysql";
  }

  if (token.includes("sqlite")) {
    return "sqlite";
  }

  return token.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || token;
}
