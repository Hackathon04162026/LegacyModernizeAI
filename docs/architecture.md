# Architecture

## Product Summary

LegacyModernizeAI is an AI-assisted modernization cockpit designed for hackathon demos and enterprise discussions. The system accepts legacy repositories, identifies stack and database dependencies, generates a modernization roadmap, surfaces security and complexity hotspots, drafts onboarding documentation, and previews a modernized user experience.

## Core Modules

### Frontend

- React + Vite dashboard
- intake form for repository URL, stack, and database
- modernization KPI cards
- phased migration plan
- documentation panel
- sample modernized application preview

### Backend

- Express API
- stack-aware analysis templates
- recommendation engine for target versions
- Codex orchestration placeholder for future prompt pipelines
- effort calculator

### Sample Projects

- `sample_project/java-oracle-legacy` represents a Java + Oracle legacy app
- `sample_project/angular-mssql-legacy` represents an Angular + MS SQL Server legacy app
- `sample_project/react-legacy` represents a React legacy frontend
- the fixtures are intentionally lightweight so the prototype can demonstrate stack detection, analysis, and preview generation without a full enterprise repo
- each fixture also includes obvious security and PII issues so the hotspot views are easy to demo

## Running the Prototype

1. Install dependencies with `npm install`.
2. Start the API with `npm run dev:api`.
3. Start the web app with `npm run dev:web`.
4. Open the local Vite URL printed in the terminal.

For a simpler demo, run `npm run build` and then `npm run dev:api`; the API will serve the built dashboard directly on the API port.

## Demo Flow

1. Open the dashboard and load a sample project or paste a repository URL.
2. Confirm the detected stack and choose target versions.
3. Run analysis to generate the modernization plan and effort estimate.
4. Review hotspots, generated documentation, and the before/after preview.
5. End with the CI workflow to show the prototype's delivery path.

## CI/CD

- GitHub Actions workflow
- installs dependencies
- runs lint and build
- verifies API smoke endpoint

## Why This Works For A Hackathon

- visually demoable in a few minutes
- practical enterprise use case
- clear before-versus-after story
- shows multiple Codex-assisted moments instead of a single chat box
