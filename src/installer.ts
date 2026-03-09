import { cp, mkdir, readFile, readdir, rm, chmod, rename } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { debug, warn } from "./utils/logger.js";
import { formatError, isEnoent } from "./utils/errors.js";
import {
  exists,
  atomicWriteFile,
  parseGitignoreLines,
  replaceSection,
} from "./utils/file-system.js";
import { STATE_DIR, CONFIG_FILE, SKILLS_DIR, SKILLS_PREFIX } from "./utils/constants.js";
import type { Platform } from "./platform/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function getPackageVersion(): Promise<string> {
  const pkgPath = join(__dirname, "..", "package.json");
  try {
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  } catch (err) {
    if (!isEnoent(err)) {
      debug(`Failed to read package.json: ${formatError(err)}`);
    }
    return "unknown";
  }
}

export interface BundledVersions {
  bmadCommit: string;
}

export async function getBundledVersions(): Promise<BundledVersions> {
  const versionsPath = join(__dirname, "..", "bundled-versions.json");
  try {
    const versions = JSON.parse(await readFile(versionsPath, "utf-8"));
    if (!versions || typeof versions.bmadCommit !== "string") {
      throw new Error("Invalid bundled-versions.json structure: missing bmadCommit");
    }
    return {
      bmadCommit: versions.bmadCommit,
    };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid bundled-versions.json")) {
      throw err;
    }
    throw new Error(`Failed to read bundled-versions.json at ${versionsPath}`, { cause: err });
  }
}

export function getBundledBmadDir(): string {
  return join(__dirname, "..", "bmad");
}

export function getBundledRalphDir(): string {
  return join(__dirname, "..", "ralph");
}

export function getSlashCommandsDir(): string {
  return join(__dirname, "..", "slash-commands");
}

export interface UpgradeResult {
  updatedPaths: string[];
}

export interface PreviewInstallResult {
  wouldCreate: string[];
  wouldModify: string[];
  wouldSkip: string[];
}

export interface PreviewUpgradeResult {
  wouldUpdate: string[];
  wouldCreate: string[];
  wouldPreserve: string[];
}

const TEMPLATE_PLACEHOLDERS: Record<string, string> = {
  "PROMPT.md": "[YOUR PROJECT NAME]",
  "AGENT.md": "pip install -r requirements.txt",
};

async function isTemplateCustomized(filePath: string, templateName: string): Promise<boolean> {
  const placeholder = TEMPLATE_PLACEHOLDERS[templateName];
  if (!placeholder) return false;

  try {
    const content = await readFile(filePath, "utf-8");
    return !content.includes(placeholder);
  } catch (err) {
    if (isEnoent(err)) return false;
    throw err;
  }
}

/**
 * Lazily loads the default (claude-code) platform to avoid circular imports
 * and keep backward compatibility for callers that don't pass a platform.
 */
async function getDefaultPlatform(): Promise<Platform> {
  const { claudeCodePlatform } = await import("./platform/claude-code.js");
  return claudeCodePlatform;
}

/**
 * Deliver slash commands based on the platform's command delivery strategy.
 *
 * - "directory": Copy command files to a directory (e.g., .claude/commands/)
 * - "skills": No-op — commands are generated as skills by generateSkills()
 * - "index": No-op — commands are discoverable via _bmad/COMMANDS.md
 */
async function deliverCommands(
  projectDir: string,
  platform: Platform,
  slashCommandsDir: string
): Promise<string[]> {
  const delivery = platform.commandDelivery;

  if (delivery.kind !== "directory") {
    return [];
  }

  const slashFiles = await readdir(slashCommandsDir);
  const bundledCommandNames = new Set(slashFiles.filter((f) => f.endsWith(".md")));

  const commandsDir = join(projectDir, delivery.dir);
  await mkdir(commandsDir, { recursive: true });

  // Clean stale bmalph-owned commands before copying (preserve user-created commands)
  try {
    const existingCommands = await readdir(commandsDir);
    for (const file of existingCommands) {
      if (file.endsWith(".md") && bundledCommandNames.has(file)) {
        await rm(join(commandsDir, file), { force: true });
      }
    }
  } catch (err) {
    if (!isEnoent(err)) throw err;
  }

  for (const file of bundledCommandNames) {
    await cp(join(slashCommandsDir, file), join(commandsDir, file), { dereference: false });
  }

  return [`${delivery.dir}/`];
}

/**
 * Parse a CSV row handling double-quoted fields.
 */
function parseCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < row.length && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface CommandIndexEntry {
  name: string;
  description: string;
  invocation: string;
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  analyst: "Research, briefs, discovery",
  architect: "Technical design, architecture",
  pm: "PRDs, epics, stories",
  sm: "Sprint planning, status, coordination",
  dev: "Implementation, coding",
  "ux-designer": "User experience, wireframes",
  qa: "Test automation, quality assurance",
  "tech-writer": "Documentation, technical writing",
  "quick-flow-solo-dev": "Quick one-off tasks, small changes",
};

const BMALPH_COMMANDS: Record<string, { description: string; howToRun: string }> = {
  bmalph: {
    description: "BMAD master agent — navigate phases",
    howToRun: "Read and follow the master agent instructions in this file",
  },
  "bmalph-implement": {
    description: "Transition planning artifacts to Ralph format",
    howToRun: "Run `bmalph implement`",
  },
  "bmalph-status": {
    description: "Show current phase, Ralph progress, version info",
    howToRun: "Run `bmalph status`",
  },
  "bmalph-upgrade": {
    description: "Update bundled assets to current version",
    howToRun: "Run `bmalph upgrade`",
  },
  "bmalph-doctor": {
    description: "Check project health and report issues",
    howToRun: "Run `bmalph doctor`",
  },
  "bmalph-watch": {
    description: "Launch Ralph live dashboard",
    howToRun: "Run `bmalph run`",
  },
};

const PHASE_SECTIONS: Array<{ key: string; label: string }> = [
  { key: "1-analysis", label: "Phase 1: Analysis" },
  { key: "2-planning", label: "Phase 2: Planning" },
  { key: "3-solutioning", label: "Phase 3: Solutioning" },
  { key: "4-implementation", label: "Phase 4: Implementation" },
  { key: "anytime", label: "Utilities" },
];

// CSV column indices for bmad-help.csv
const CSV_COL_PHASE = 1;
const CSV_COL_NAME = 2;
const CSV_COL_WORKFLOW_FILE = 5;
const CSV_COL_DESCRIPTION = 10;

const FALLBACK_PHASE = "anytime";

/** Classification result for a single slash command. */
export interface ClassifiedCommand {
  name: string;
  description: string;
  /** First line of the slash command file (used for invocation column). */
  invocation: string;
  /** Full body content from the slash command file. */
  body: string;
  kind: "agent" | "workflow" | "bmalph" | "utility";
  /** Phase key for workflow commands (e.g. "1-analysis"). */
  phase?: string;
  /** For bmalph commands: how to run them. */
  howToRun?: string;
}

/** CLI-pointer bmalph commands are all bmalph-* except the master "bmalph" command. */
function isCliPointer(cmd: ClassifiedCommand): boolean {
  return cmd.kind === "bmalph" && cmd.name !== "bmalph";
}

/**
 * Classify all slash commands by reading CSV metadata and file contents.
 * Shared by generateCommandIndex() and generateSkills().
 */
export async function classifyCommands(
  projectDir: string,
  slashCmdsDir: string
): Promise<ClassifiedCommand[]> {
  const helpCsvPath = join(projectDir, "_bmad/_config/bmad-help.csv");
  const helpCsv = await readFile(helpCsvPath, "utf-8");

  // Parse CSV: build workflow-file → {phase, description} lookup
  const csvLines = helpCsv.trimEnd().split(/\r?\n/);
  const workflowLookup = new Map<string, { phase: string; description: string }>();
  for (const line of csvLines.slice(1)) {
    if (!line.trim()) continue;
    const fields = parseCsvRow(line);
    const workflowFile = fields[CSV_COL_WORKFLOW_FILE]?.trim();
    if (workflowFile) {
      workflowLookup.set(workflowFile, {
        phase: fields[CSV_COL_PHASE]?.trim() ?? FALLBACK_PHASE,
        description: fields[CSV_COL_DESCRIPTION]?.trim() ?? fields[CSV_COL_NAME]?.trim() ?? "",
      });
    }
  }

  // Read slash command files
  const slashFiles = (await readdir(slashCmdsDir)).filter((f) => f.endsWith(".md")).sort();
  const results: ClassifiedCommand[] = [];

  for (const file of slashFiles) {
    const name = file.replace(/\.md$/, "");
    const body = (await readFile(join(slashCmdsDir, file), "utf-8")).trim();
    const firstLine = body.split("\n")[0]!.trim();

    // Extract _bmad/ file references from content
    const fileRefs = [...body.matchAll(/`(_bmad\/[^`]+)`/g)].map((m) => m[1]!);
    const agentRef = fileRefs.find((ref) => ref.includes("/agents/"));
    const workflowRef = fileRefs.find(
      (ref) => ref.includes("/workflows/") || ref.includes("/tasks/")
    );

    // Classify: bmalph CLI commands
    if (name.startsWith("bmalph")) {
      const known = BMALPH_COMMANDS[name];
      const desc = known?.description ?? name.replace(/-/g, " ");
      const howToRun = known?.howToRun ?? `Run \`bmalph ${name.replace("bmalph-", "")}\``;
      results.push({
        name,
        description: desc,
        invocation: firstLine,
        body,
        kind: "bmalph",
        howToRun,
      });
      continue;
    }

    // Classify: workflow/task commands (matched via CSV)
    if (workflowRef && workflowLookup.has(workflowRef)) {
      const csv = workflowLookup.get(workflowRef)!;
      results.push({
        name,
        description: csv.description,
        invocation: firstLine,
        body,
        kind: "workflow",
        phase: csv.phase,
      });
      continue;
    }

    // Classify: pure agent commands
    if (agentRef && !workflowRef) {
      results.push({
        name,
        description: AGENT_DESCRIPTIONS[name] ?? name,
        invocation: firstLine,
        body,
        kind: "agent",
      });
      continue;
    }

    // Fallback: unmatched commands go to utilities
    results.push({
      name,
      description: name.replace(/-/g, " "),
      invocation: firstLine,
      body,
      kind: "utility",
      phase: FALLBACK_PHASE,
    });
  }

  return results;
}

/**
 * Generate _bmad/COMMANDS.md from pre-classified slash commands.
 * Provides command discoverability for platforms without native slash command support.
 */
export async function generateCommandIndex(
  projectDir: string,
  classified: ClassifiedCommand[]
): Promise<void> {
  const agents: CommandIndexEntry[] = [];
  const phaseGroups: Record<string, CommandIndexEntry[]> = {};
  const bmalpEntries: Array<{ name: string; description: string; howToRun: string }> = [];

  for (const cmd of classified) {
    if (cmd.kind === "bmalph") {
      bmalpEntries.push({
        name: cmd.name,
        description: cmd.description,
        howToRun: cmd.howToRun!,
      });
    } else if (cmd.kind === "agent") {
      agents.push({ name: cmd.name, description: cmd.description, invocation: cmd.invocation });
    } else if (cmd.kind === "workflow") {
      const phase = cmd.phase!;
      if (!phaseGroups[phase]) phaseGroups[phase] = [];
      phaseGroups[phase].push({
        name: cmd.name,
        description: cmd.description,
        invocation: cmd.invocation,
      });
    } else {
      const phase = cmd.phase ?? FALLBACK_PHASE;
      if (!phaseGroups[phase]) phaseGroups[phase] = [];
      phaseGroups[phase].push({
        name: cmd.name,
        description: cmd.description,
        invocation: cmd.invocation,
      });
    }
  }

  // Build markdown
  const sections: string[] = ["# BMAD Commands\n\n> Auto-generated by bmalph. Do not edit.\n"];

  if (agents.length > 0) {
    sections.push(formatCommandTable("Agents", agents));
  }

  for (const { key, label } of PHASE_SECTIONS) {
    const entries = phaseGroups[key];
    if (entries && entries.length > 0) {
      sections.push(formatCommandTable(label, entries));
    }
  }

  if (bmalpEntries.length > 0) {
    sections.push(
      formatCommandTable(
        "bmalph CLI",
        bmalpEntries.map((b) => ({
          name: b.name,
          description: b.description,
          invocation: b.howToRun,
        })),
        "How to run"
      )
    );
  }

  await atomicWriteFile(join(projectDir, "_bmad/COMMANDS.md"), sections.join("\n"));
}

/**
 * Generate Codex Skills from pre-classified slash commands.
 * Creates .agents/skills/bmad-<name>/SKILL.md for each non-CLI-pointer command.
 */
export async function generateSkills(
  projectDir: string,
  classified: ClassifiedCommand[]
): Promise<void> {
  const skillsBaseDir = join(projectDir, SKILLS_DIR);

  // Cleanup: remove existing bmad-* skill directories
  try {
    const existingDirs = await readdir(skillsBaseDir);
    for (const dir of existingDirs) {
      if (dir.startsWith(SKILLS_PREFIX)) {
        await rm(join(skillsBaseDir, dir), { recursive: true, force: true });
      }
    }
  } catch (err) {
    if (!isEnoent(err)) throw err;
  }

  // Generate skills for non-CLI-pointer commands
  for (const cmd of classified) {
    if (isCliPointer(cmd)) continue;

    const skillDir = join(skillsBaseDir, `${SKILLS_PREFIX}${cmd.name}`);
    await mkdir(skillDir, { recursive: true });

    const skillContent = `---
name: ${cmd.name}
description: >
  ${cmd.description}. Use when the user asks about ${cmd.name.replace(/-/g, " ")}.
metadata:
  managed-by: bmalph
---

${cmd.body}
`;

    await atomicWriteFile(join(skillDir, "SKILL.md"), skillContent);
  }
}

function formatCommandTable(
  heading: string,
  entries: CommandIndexEntry[],
  thirdCol = "Invocation"
): string {
  const lines = [
    `## ${heading}\n`,
    `| Command | Description | ${thirdCol} |`,
    "|---------|-------------|------------|",
  ];
  for (const e of entries) {
    lines.push(`| ${e.name} | ${e.description} | ${e.invocation} |`);
  }
  return lines.join("\n") + "\n";
}

interface BmadSwapContext {
  dest: string;
  backup: string;
  staged: string;
  hasBackup: boolean;
}

async function prepareBmadSwap(
  projectDir: string,
  bundledBmadDir: string
): Promise<BmadSwapContext> {
  const dest = join(projectDir, "_bmad");
  const backup = join(projectDir, "_bmad.old");
  const staged = join(projectDir, "_bmad.new");
  const destExists = await exists(dest);
  const backupExists = await exists(backup);
  let hasBackup = false;

  if (destExists && backupExists) {
    throw new Error(
      "Found both _bmad and _bmad.old from a previous failed install or upgrade. " +
        "Restore or remove one of them before retrying."
    );
  }

  if (backupExists) {
    hasBackup = true;
    debug("Found existing _bmad.old from previous failed rollback, preserving backup");
  } else if (destExists) {
    try {
      await rename(dest, backup);
      hasBackup = true;
    } catch (err) {
      if (!isEnoent(err)) throw err;
      debug("_bmad disappeared before it could be preserved, continuing without backup");
    }
  } else {
    debug("No existing _bmad to preserve (first install)");
  }

  // Stage new content.
  await rm(staged, { recursive: true, force: true });
  await cp(bundledBmadDir, staged, { recursive: true, dereference: false });

  return { dest, backup, staged, hasBackup };
}

async function finalizeBmadInstall(
  projectDir: string,
  slashCommandsDir: string,
  platform: Platform
): Promise<Awaited<ReturnType<typeof classifyCommands>>> {
  await generateManifests(projectDir);

  const classified = await classifyCommands(projectDir, slashCommandsDir);
  await generateCommandIndex(projectDir, classified);

  const projectName = await deriveProjectName(projectDir);
  const escapedName = projectName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await atomicWriteFile(
    join(projectDir, "_bmad/config.yaml"),
    `# BMAD Configuration - Generated by bmalph
platform: ${platform.id}
project_name: "${escapedName}"
output_folder: _bmad-output
user_name: BMad
communication_language: English
document_output_language: English
user_skill_level: intermediate
planning_artifacts: _bmad-output/planning-artifacts
implementation_artifacts: _bmad-output/implementation-artifacts
project_knowledge: docs
modules:
  - bmm
`
  );

  return classified;
}

async function rollbackBmadFinalization(swap: BmadSwapContext, error: unknown): Promise<never> {
  debug(`BMAD finalization failed after swap: ${formatError(error)}`);

  try {
    await rm(swap.dest, { recursive: true, force: true });

    if (swap.hasBackup) {
      await rename(swap.backup, swap.dest);
    }
  } catch (rollbackErr) {
    throw new Error(
      "BMAD finalization failed after swap and rollback also failed. " +
        `Original error: ${formatError(error)}. ` +
        `Rollback error: ${formatError(rollbackErr)}`,
      {
        cause: rollbackErr,
      }
    );
  }

  if (swap.hasBackup) {
    throw new Error(
      "BMAD finalization failed after swap; previous BMAD installation was restored.",
      {
        cause: error,
      }
    );
  }

  throw new Error(
    "BMAD finalization failed after swap; incomplete BMAD installation was cleaned up.",
    {
      cause: error,
    }
  );
}

async function commitBmadSwap(swap: BmadSwapContext): Promise<void> {
  if (!swap.hasBackup) return;
  await rm(swap.backup, { recursive: true, force: true });
}

export async function copyBundledAssets(
  projectDir: string,
  platform?: Platform
): Promise<UpgradeResult> {
  const p = platform ?? (await getDefaultPlatform());
  const bmadDir = getBundledBmadDir();
  const ralphDir = getBundledRalphDir();
  const slashCommandsDir = getSlashCommandsDir();

  // Validate source directories exist
  if (!(await exists(bmadDir))) {
    throw new Error(`BMAD source directory not found at ${bmadDir}. Package may be corrupted.`);
  }
  if (!(await exists(ralphDir))) {
    throw new Error(`Ralph source directory not found at ${ralphDir}. Package may be corrupted.`);
  }
  if (!(await exists(slashCommandsDir))) {
    throw new Error(
      `Slash commands directory not found at ${slashCommandsDir}. Package may be corrupted.`
    );
  }

  // Atomic copy: rename-aside pattern to prevent data loss.
  const bmadSwap = await prepareBmadSwap(projectDir, bmadDir);

  // Swap in.
  try {
    await rename(bmadSwap.staged, bmadSwap.dest);
  } catch (err) {
    // Restore original on failure.
    debug(`Rename failed, restoring original: ${formatError(err)}`);
    try {
      await rename(bmadSwap.backup, bmadSwap.dest);
    } catch (restoreErr) {
      if (!isEnoent(restoreErr)) {
        debug(`Could not restore _bmad.old: ${formatError(restoreErr)}`);
      }
    }
    throw err;
  }

  const classified = await (async (): Promise<Awaited<ReturnType<typeof classifyCommands>>> => {
    try {
      return await finalizeBmadInstall(projectDir, slashCommandsDir, p);
    } catch (err) {
      return await rollbackBmadFinalization(bmadSwap, err);
    }
  })();

  await commitBmadSwap(bmadSwap);

  // Generate Codex Skills for skills-based platforms.
  if (p.commandDelivery.kind === "skills") {
    await generateSkills(projectDir, classified);
  }

  // Copy Ralph templates → .ralph/
  await mkdir(join(projectDir, ".ralph"), { recursive: true });

  // Preserve customized PROMPT.md and @AGENT.md on upgrade
  const promptCustomized = await isTemplateCustomized(
    join(projectDir, ".ralph/PROMPT.md"),
    "PROMPT.md"
  );
  const agentCustomized = await isTemplateCustomized(
    join(projectDir, ".ralph/@AGENT.md"),
    "AGENT.md"
  );

  if (!promptCustomized) {
    await cp(join(ralphDir, "templates/PROMPT.md"), join(projectDir, ".ralph/PROMPT.md"), {
      dereference: false,
    });
  }
  if (!agentCustomized) {
    await cp(join(ralphDir, "templates/AGENT.md"), join(projectDir, ".ralph/@AGENT.md"), {
      dereference: false,
    });
  }
  await cp(join(ralphDir, "RALPH-REFERENCE.md"), join(projectDir, ".ralph/RALPH-REFERENCE.md"), {
    dereference: false,
  });

  // Copy .ralphrc from template (skip if user has customized it)
  const ralphrcDest = join(projectDir, ".ralph/.ralphrc");
  if (!(await exists(ralphrcDest))) {
    // Read template and inject platform driver
    let ralphrcContent = await readFile(join(ralphDir, "templates/ralphrc.template"), "utf-8");
    // Replace default PLATFORM_DRIVER value with the actual platform id
    ralphrcContent = ralphrcContent.replace(
      /PLATFORM_DRIVER="\$\{PLATFORM_DRIVER:-[^"]*\}"/,
      `PLATFORM_DRIVER="\${PLATFORM_DRIVER:-${p.id}}"`
    );
    await atomicWriteFile(ralphrcDest, ralphrcContent);
  }

  // Copy Ralph loop and lib → .ralph/
  // Add version marker to ralph_loop.sh
  const loopContent = await readFile(join(ralphDir, "ralph_loop.sh"), "utf-8");
  const markerLine = `# bmalph-version: ${await getPackageVersion()}`;
  // Use .* to handle empty version (edge case) and EOF without newline
  const markedContent = loopContent.includes("# bmalph-version:")
    ? loopContent.replace(/# bmalph-version:.*/, markerLine)
    : loopContent.replace(/^(#!.+\r?\n)/, `$1${markerLine}\n`);
  await atomicWriteFile(join(projectDir, ".ralph/ralph_loop.sh"), markedContent);
  await chmod(join(projectDir, ".ralph/ralph_loop.sh"), 0o755);
  await rm(join(projectDir, ".ralph/lib"), { recursive: true, force: true });
  await cp(join(ralphDir, "lib"), join(projectDir, ".ralph/lib"), {
    recursive: true,
    dereference: false,
  });

  // Copy Ralph utilities → .ralph/
  await cp(join(ralphDir, "ralph_import.sh"), join(projectDir, ".ralph/ralph_import.sh"), {
    dereference: false,
  });
  await chmod(join(projectDir, ".ralph/ralph_import.sh"), 0o755);
  await cp(join(ralphDir, "ralph_monitor.sh"), join(projectDir, ".ralph/ralph_monitor.sh"), {
    dereference: false,
  });
  await chmod(join(projectDir, ".ralph/ralph_monitor.sh"), 0o755);

  // Copy Ralph drivers → .ralph/drivers/
  const driversDir = join(ralphDir, "drivers");
  if (await exists(driversDir)) {
    const destDriversDir = join(projectDir, ".ralph/drivers");
    await rm(destDriversDir, { recursive: true, force: true });
    await cp(driversDir, destDriversDir, { recursive: true, dereference: false });
    // Make driver scripts executable
    try {
      const driverFiles = await readdir(destDriversDir);
      for (const file of driverFiles) {
        if (file.endsWith(".sh")) {
          await chmod(join(destDriversDir, file), 0o755);
        }
      }
    } catch (err) {
      debug(`chmod on driver scripts failed (non-fatal): ${formatError(err)}`);
    }
  }

  // Deliver slash commands based on platform strategy
  const commandPaths = await deliverCommands(projectDir, p, slashCommandsDir);

  // Update .gitignore
  await updateGitignore(projectDir);

  const updatedPaths = [
    "_bmad/",
    ".ralph/ralph_loop.sh",
    ".ralph/ralph_import.sh",
    ".ralph/ralph_monitor.sh",
    ".ralph/lib/",
    ...(!promptCustomized ? [".ralph/PROMPT.md"] : []),
    ...(!agentCustomized ? [".ralph/@AGENT.md"] : []),
    ".ralph/RALPH-REFERENCE.md",
    ...commandPaths,
    ".gitignore",
  ];

  return { updatedPaths };
}

export async function installProject(projectDir: string, platform?: Platform): Promise<void> {
  // Create user directories (not overwritten by upgrade)
  await mkdir(join(projectDir, STATE_DIR), { recursive: true });
  await mkdir(join(projectDir, ".ralph/specs"), { recursive: true });
  await mkdir(join(projectDir, ".ralph/logs"), { recursive: true });
  await mkdir(join(projectDir, ".ralph/docs/generated"), { recursive: true });

  await copyBundledAssets(projectDir, platform);
}

async function deriveProjectName(projectDir: string): Promise<string> {
  try {
    const configPath = join(projectDir, CONFIG_FILE);
    const raw = await readFile(configPath, "utf-8");
    const config = JSON.parse(raw);
    if (config.name) return config.name;
  } catch (err) {
    if (!isEnoent(err)) {
      warn(`Could not read ${CONFIG_FILE}: ${formatError(err)}`);
    }
  }
  return basename(projectDir);
}

export async function generateManifests(projectDir: string): Promise<void> {
  const configDir = join(projectDir, "_bmad/_config");
  await mkdir(configDir, { recursive: true });

  const coreHelpPath = join(projectDir, "_bmad/core/module-help.csv");
  const bmmHelpPath = join(projectDir, "_bmad/bmm/module-help.csv");

  // Validate CSV files exist before reading
  if (!(await exists(coreHelpPath))) {
    throw new Error(
      `Core module-help.csv not found at ${coreHelpPath}. BMAD installation may be incomplete.`
    );
  }
  if (!(await exists(bmmHelpPath))) {
    throw new Error(
      `BMM module-help.csv not found at ${bmmHelpPath}. BMAD installation may be incomplete.`
    );
  }

  const coreContent = await readFile(coreHelpPath, "utf-8");
  const bmmContent = await readFile(bmmHelpPath, "utf-8");

  // Extract header from core (first line) and data lines from both
  const coreLines = coreContent.trimEnd().split(/\r?\n/);
  const bmmLines = bmmContent.trimEnd().split(/\r?\n/);

  if (!coreLines[0]?.trim()) {
    throw new Error(`Core module-help.csv is empty at ${coreHelpPath}`);
  }
  if (!bmmLines[0]?.trim()) {
    throw new Error(`BMM module-help.csv is empty at ${bmmHelpPath}`);
  }

  const normalize = (line: string): string => line.replace(/,+$/, "");

  const header = normalize(coreLines[0]);
  const bmmHeader = normalize(bmmLines[0]);

  // Validate headers match (warn if mismatch but continue)
  if (header && bmmHeader && header !== bmmHeader) {
    warn(`CSV header mismatch detected. BMAD modules may have incompatible formats.`);
    debug(
      `CSV header mismatch details - core: "${header.slice(0, 50)}...", bmm: "${bmmHeader.slice(0, 50)}..."`
    );
  }

  const coreData = coreLines
    .slice(1)
    .filter((l) => l.trim())
    .map(normalize);
  const bmmData = bmmLines
    .slice(1)
    .filter((l) => l.trim())
    .map(normalize);

  const combined = [header, ...coreData, ...bmmData].join("\n") + "\n";

  await atomicWriteFile(join(configDir, "task-manifest.csv"), combined);
  await atomicWriteFile(join(configDir, "workflow-manifest.csv"), combined);
  await atomicWriteFile(join(configDir, "bmad-help.csv"), combined);
}

async function updateGitignore(projectDir: string): Promise<void> {
  const gitignorePath = join(projectDir, ".gitignore");
  let existing = "";

  try {
    existing = await readFile(gitignorePath, "utf-8");
  } catch (err) {
    if (!isEnoent(err)) throw err;
  }

  const existingLines = parseGitignoreLines(existing);

  const entries = [".ralph/logs/", "_bmad-output/"];
  const newEntries = entries.filter((e) => !existingLines.has(e));

  if (newEntries.length === 0) return;

  const suffix =
    existing.length > 0 && !existing.endsWith("\n")
      ? "\n" + newEntries.join("\n") + "\n"
      : newEntries.join("\n") + "\n";

  await atomicWriteFile(gitignorePath, existing + suffix);
}

/**
 * Merge the BMAD instructions snippet into the platform's instructions file.
 * Creates the file if it doesn't exist, replaces an existing BMAD section on upgrade.
 */
export async function mergeInstructionsFile(
  projectDir: string,
  platform?: Platform
): Promise<void> {
  const p = platform ?? (await getDefaultPlatform());
  const instructionsPath = join(projectDir, p.instructionsFile);
  const snippet = p.generateInstructionsSnippet();
  const marker = p.instructionsSectionMarker;

  // Ensure parent directory exists for nested paths (e.g. .cursor/rules/)
  await mkdir(dirname(instructionsPath), { recursive: true });

  let existing = "";
  try {
    existing = await readFile(instructionsPath, "utf-8");
  } catch (err) {
    if (!isEnoent(err)) throw err;
  }

  if (existing.includes(marker)) {
    await atomicWriteFile(instructionsPath, replaceSection(existing, marker, "\n" + snippet));
    return;
  }

  await atomicWriteFile(instructionsPath, existing + snippet);
}

export async function isInitialized(projectDir: string): Promise<boolean> {
  return exists(join(projectDir, CONFIG_FILE));
}

export async function previewInstall(
  projectDir: string,
  platform?: Platform
): Promise<PreviewInstallResult> {
  const p = platform ?? (await getDefaultPlatform());
  const wouldCreate: string[] = [];
  const wouldModify: string[] = [];
  const wouldSkip: string[] = [];

  // Directories that would be created
  const dirsToCreate = [
    `${STATE_DIR}/`,
    ".ralph/specs/",
    ".ralph/logs/",
    ".ralph/docs/generated/",
    "_bmad/",
  ];

  // Add command directory based on delivery strategy
  if (p.commandDelivery.kind === "directory") {
    dirsToCreate.push(`${p.commandDelivery.dir}/`);
  } else if (p.commandDelivery.kind === "skills") {
    dirsToCreate.push(`${SKILLS_DIR}/`);
  }

  for (const dir of dirsToCreate) {
    if (await exists(join(projectDir, dir))) {
      if (
        dir === "_bmad/" ||
        (p.commandDelivery.kind === "directory" && dir === `${p.commandDelivery.dir}/`) ||
        (p.commandDelivery.kind === "skills" && dir === `${SKILLS_DIR}/`)
      ) {
        wouldModify.push(dir);
      }
    } else {
      wouldCreate.push(dir);
    }
  }

  // Files that would be created/modified
  const filesToCheck = [
    { path: ".ralph/PROMPT.md", isTemplate: true },
    { path: ".ralph/@AGENT.md", isTemplate: true },
    { path: ".ralph/ralph_loop.sh", isTemplate: false },
    { path: CONFIG_FILE, isTemplate: false },
  ];

  for (const file of filesToCheck) {
    if (await exists(join(projectDir, file.path))) {
      if (file.isTemplate) {
        wouldModify.push(file.path);
      }
    } else {
      wouldCreate.push(file.path);
    }
  }

  // .gitignore would be modified if it exists, created otherwise
  if (await exists(join(projectDir, ".gitignore"))) {
    wouldModify.push(".gitignore");
  } else {
    wouldCreate.push(".gitignore");
  }

  // Instructions file integration check
  try {
    const content = await readFile(join(projectDir, p.instructionsFile), "utf-8");
    if (content.includes(p.instructionsSectionMarker)) {
      wouldSkip.push(`${p.instructionsFile} (already integrated)`);
    } else {
      wouldModify.push(p.instructionsFile);
    }
  } catch (err) {
    if (isEnoent(err)) {
      wouldCreate.push(p.instructionsFile);
    } else {
      throw err;
    }
  }

  return { wouldCreate, wouldModify, wouldSkip };
}

export async function previewUpgrade(
  projectDir: string,
  platform?: Platform
): Promise<PreviewUpgradeResult> {
  const p = platform ?? (await getDefaultPlatform());
  const managedPaths: Array<{ path: string; isDir: boolean; templateName?: string }> = [
    { path: "_bmad/", isDir: true },
    { path: ".ralph/ralph_loop.sh", isDir: false },
    { path: ".ralph/ralph_import.sh", isDir: false },
    { path: ".ralph/ralph_monitor.sh", isDir: false },
    { path: ".ralph/lib/", isDir: true },
    { path: ".ralph/PROMPT.md", isDir: false, templateName: "PROMPT.md" },
    { path: ".ralph/@AGENT.md", isDir: false, templateName: "AGENT.md" },
    { path: ".ralph/RALPH-REFERENCE.md", isDir: false },
    { path: ".gitignore", isDir: false },
  ];

  // Add command directory based on delivery strategy
  if (p.commandDelivery.kind === "directory") {
    managedPaths.push({ path: `${p.commandDelivery.dir}/`, isDir: true });
  } else if (p.commandDelivery.kind === "skills") {
    managedPaths.push({ path: `${SKILLS_DIR}/`, isDir: true });
  }

  const wouldUpdate: string[] = [];
  const wouldCreate: string[] = [];
  const wouldPreserve: string[] = [];

  for (const { path: pathStr, templateName } of managedPaths) {
    const fullPath = join(projectDir, pathStr.replace(/\/$/, ""));
    if (await exists(fullPath)) {
      if (templateName && (await isTemplateCustomized(fullPath, templateName))) {
        wouldPreserve.push(pathStr);
      } else {
        wouldUpdate.push(pathStr);
      }
    } else {
      wouldCreate.push(pathStr);
    }
  }

  return { wouldUpdate, wouldCreate, wouldPreserve };
}
