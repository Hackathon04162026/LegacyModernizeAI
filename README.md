# LegacyModernizeAI

LegacyModernizeAI is a hackathon-ready prototype for AI-assisted codebase modernization. It accepts legacy Java, Angular, and React projects with Oracle, MS SQL Server, or PL/SQL dependencies and produces upgrade guidance, hotspot analysis, migration estimates, developer docs, and a modernized preview.

## Monorepo Structure

- `apps/web`: React dashboard for repo intake, findings, modernization planning, and before/after views
- `apps/api`: Express API that simulates Codex-powered analysis and report generation
- `sample_project`: lightweight legacy fixtures for demo input
- `.github/workflows/ci.yml`: CI/CD pipeline for install, lint, build, and smoke checks
- `docs/architecture.md`: architecture, demo flow, and judging narrative

## Quick Start

### One-Click Run Script

From PowerShell:

```powershell
.\run.ps1
```

That starts the simplest demo mode and serves the UI at `http://localhost:4000`.

For split dev mode with separate API and Vite windows:

```powershell
.\run.ps1 -Mode dev
```

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the API:

   ```bash
   npm run dev:api
   ```

3. Start the web app:

   ```bash
   npm run dev:web
   ```

4. Open the local web URL printed by Vite, usually `http://localhost:5173`.

### Single-Server Demo Mode

If you want one URL for the demo, build the frontend once and start the API:

```bash
npm run build
npm run dev:api
```

Then open `http://localhost:4000`. The API serves the built dashboard as well as the analysis endpoints.

### If Node Is Not Installed Globally

This repo can also run with the portable Node runtime placed under `tools/node`:

```powershell
$env:Path='D:\Project\LegacyModernizeAI\tools\node;' + $env:Path
npm install
npm run dev:api
npm run dev:web
```

## Sample Projects

- `sample_project/java-oracle-legacy` covers a Java + Oracle case with hardcoded PII, unsafe command execution, and dynamic SQL.
- `sample_project/angular-mssql-legacy` covers an Angular + MS SQL Server case with cookie leakage, browser storage of sensitive content, and unsafe DOM writes.
- `sample_project/react-legacy` covers a React legacy frontend with hardcoded tokens, PII leakage, `eval`, and raw HTML rendering.
- Each fixture is intentionally small so the app can detect the stack, analyze it, and show results quickly during a demo or standalone tests.

## Demo Flow

1. Start the API and web app, then open the dashboard.
2. Load a sample project from `sample_project` or paste a repository URL.
3. Confirm the detected stack and choose target versions.
4. Run analysis to generate the modernization plan and effort estimate.
5. Walk through hotspots, generated documentation, and the before/after preview.
6. Finish by showing the CI workflow that supports the prototype delivery path.
