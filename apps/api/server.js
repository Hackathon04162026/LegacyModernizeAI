import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { analyzeRepository, analyzeRepositoryDeep, analyzeRepositoryQuick, generateSampleProject } from "./analyzer.js";

const app = express();
const port = process.env.PORT || 4000;
const sampleRoot = path.resolve(process.cwd(), "sample_project");
const webDistRoot = path.resolve(process.cwd(), "apps/web/dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/api/samples", (_, res) => {
  res.json([
    {
      label: "Java / Oracle Legacy Sample",
      repoUrl: path.join(sampleRoot, "java-oracle-legacy"),
      projectType: "java",
      database: "oracle"
    },
    {
      label: "Angular / MS SQL Legacy Sample",
      repoUrl: path.join(sampleRoot, "angular-mssql-legacy"),
      projectType: "angular",
      database: "mssql"
    },
    {
      label: "React Legacy Sample",
      repoUrl: path.join(sampleRoot, "react-legacy"),
      projectType: "react",
      database: "none"
    }
  ]);
});

app.get("/api/demo-analysis", async (_, res) => {
  try {
    const report = await analyzeRepository({
      repoUrl: path.join(sampleRoot, "java-oracle-legacy"),
      projectTypeHint: "java",
      databaseHint: "oracle"
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/analyze/quick", async (req, res) => {
  const { repoUrl, projectType = "java", database = "oracle", targetSelections, targetTechnologies, targetDatabases, targetLibraries } = req.body ?? {};

  try {
    const report = await analyzeRepositoryQuick({
      repoUrl,
      projectTypeHint: projectType,
      databaseHint: database,
      targetSelections,
      targetTechnologies,
      targetDatabases,
      targetLibraries
    });

    res.json(report);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      repoUrl
    });
  }
});

app.post("/api/analyze/deep", async (req, res) => {
  const { repoUrl, projectType = "java", database = "oracle", targetSelections, targetTechnologies, targetDatabases, targetLibraries } = req.body ?? {};

  try {
    const report = await analyzeRepositoryDeep({
      repoUrl,
      projectTypeHint: projectType,
      databaseHint: database,
      targetSelections,
      targetTechnologies,
      targetDatabases,
      targetLibraries
    });

    res.json(report);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      repoUrl
    });
  }
});

app.post("/api/analyze", async (req, res) => {
  const { repoUrl, projectType = "java", database = "oracle", targetSelections, targetTechnologies, targetDatabases, targetLibraries } = req.body ?? {};

  try {
    const report = await analyzeRepositoryDeep({
      repoUrl,
      projectTypeHint: projectType,
      databaseHint: database,
      targetSelections,
      targetTechnologies,
      targetDatabases,
      targetLibraries
    });

    res.json(report);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      repoUrl
    });
  }
});

app.post("/api/sample-project", async (req, res) => {
  const { projectName, targetSelections, targetTechnologies, targetDatabases, targetLibraries } = req.body ?? {};

  try {
    const sample = await generateSampleProject({
      projectName,
      targetSelections,
      targetTechnologies,
      targetDatabases,
      targetLibraries
    });

    res.json(sample);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      projectName
    });
  }
});

app.post("/api/generate-sample", async (req, res) => {
  const { projectName, targetSelections, targetTechnologies, targetDatabases, targetLibraries } = req.body ?? {};

  try {
    const sample = await generateSampleProject({
      projectName,
      targetSelections,
      targetTechnologies,
      targetDatabases,
      targetLibraries
    });

    res.json(sample);
  } catch (error) {
    res.status(400).json({
      error: error.message,
      projectName
    });
  }
});

if (fs.existsSync(webDistRoot)) {
  app.use(express.static(webDistRoot));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    res.sendFile(path.join(webDistRoot, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`LegacyModernizeAI API listening on port ${port}`);
});
