import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { readJsonFile } from "./json.js";
import { validateState } from "./validate.js";
import type { RalphLoopStatus } from "./validate.js";
import { STATE_DIR } from "./constants.js";
import { atomicWriteFile } from "./file-system.js";
import { warn } from "./logger.js";
import { formatError } from "./errors.js";
import { readRalphRuntimeStatus } from "./ralph-runtime-state.js";

export interface BmaxState {
  currentPhase: number;
  status:
    | "researching"
    | "designing"
    | "architecting"
    | "building"
    | "launching"
    | "completed"
    | "planning"
    | "implementing";
  startedAt: string;
  lastUpdated: string;
}

export interface PhaseCommand {
  code: string;
  name: string;
  agent: string;
  description: string;
  required: boolean;
}

export interface PhaseInfo {
  name: string;
  agent: string;
  commands: PhaseCommand[];
}

export async function readState(projectDir: string): Promise<BmaxState | null> {
  const data = await readJsonFile<unknown>(join(projectDir, STATE_DIR, "current-phase.json"));
  if (data === null) return null;
  try {
    return validateState(data);
  } catch (err) {
    warn(`State file is corrupted, treating as uninitialized: ${formatError(err)}`);
    return null;
  }
}

export async function writeState(projectDir: string, state: BmaxState): Promise<void> {
  await mkdir(join(projectDir, STATE_DIR), { recursive: true });
  const target = join(projectDir, STATE_DIR, "current-phase.json");
  await atomicWriteFile(target, JSON.stringify(state, null, 2) + "\n");
}

export function getPhaseLabel(phase: number): string {
  const labels: Record<number, string> = {
    1: "Research",
    2: "Design",
    3: "Architect",
    4: "Build",
    5: "Launch",
  };
  return labels[phase] ?? "Unknown";
}

export function getPhaseInfo(phase: number): PhaseInfo {
  const info: Record<number, PhaseInfo> = {
    1: {
      name: "Research",
      agent: "Scout",
      commands: [
        {
          code: "CR",
          name: "Competitor Research",
          agent: "researcher",
          description: "Structured competitor analysis — features, pricing, weaknesses",
          required: false,
        },
        {
          code: "MR",
          name: "Market Research",
          agent: "researcher",
          description: "Market size, trends, customer segments, demand signals",
          required: false,
        },
        {
          code: "DR",
          name: "Domain Research",
          agent: "researcher",
          description: "Industry deep dive — terminology, regulations, landscape",
          required: false,
        },
        {
          code: "TR",
          name: "Technical Research",
          agent: "researcher",
          description: "Feasibility check — APIs, tech stack options",
          required: false,
        },
        {
          code: "BP",
          name: "Brainstorm",
          agent: "researcher",
          description: "Guided ideation — problem exploration and differentiation",
          required: false,
        },
        {
          code: "CB",
          name: "Create Brief",
          agent: "researcher",
          description: "Nail down your product idea into a lean brief",
          required: false,
        },
      ],
    },
    2: {
      name: "Design",
      agent: "Ada",
      commands: [
        {
          code: "CP",
          name: "Create PRD",
          agent: "product-designer",
          description: "Product requirements with pricing strategy baked in",
          required: true,
        },
        {
          code: "VP",
          name: "Validate PRD",
          agent: "product-designer",
          description: "Check PRD for gaps and missing monetization plan",
          required: false,
        },
        {
          code: "CU",
          name: "Create UX",
          agent: "product-designer",
          description: "User flows, key screens, and interaction design",
          required: false,
        },
        {
          code: "VU",
          name: "Validate UX",
          agent: "product-designer",
          description: "Review UX design for usability and conversion",
          required: false,
        },
      ],
    },
    3: {
      name: "Architect",
      agent: "Kit",
      commands: [
        {
          code: "CA",
          name: "Create Architecture",
          agent: "architect",
          description: "SaaS architecture — auth, billing, multi-tenancy",
          required: true,
        },
        {
          code: "CE",
          name: "Create Epics and Stories",
          agent: "builder",
          description: "Break down PRD into epics and stories",
          required: true,
        },
        {
          code: "VE",
          name: "Validate Epics and Stories",
          agent: "builder",
          description: "Check story completeness and consistency",
          required: false,
        },
        {
          code: "IR",
          name: "Implementation Readiness",
          agent: "architect",
          description: "Verify PRD, UX, and architecture are aligned",
          required: true,
        },
      ],
    },
    4: {
      name: "Build",
      agent: "Max",
      commands: [],
    },
    5: {
      name: "Launch",
      agent: "Pip",
      commands: [
        {
          code: "WR",
          name: "Wire & Verify",
          agent: "launcher",
          description: "Connect services, deploy, and smoke test",
          required: true,
        },
        {
          code: "DR",
          name: "Design Review",
          agent: "launcher",
          description: "Evaluate UI/UX quality against references",
          required: false,
        },
        {
          code: "LC",
          name: "Launch Checklist",
          agent: "launcher",
          description: "Pre-launch audit — SEO, legal, analytics, payments",
          required: true,
        },
        {
          code: "SS",
          name: "Stripe Setup",
          agent: "launcher",
          description: "Stripe integration — products, prices, webhooks",
          required: false,
        },
        {
          code: "LG",
          name: "Legal Compliance",
          agent: "launcher",
          description: "DSGVO, Impressum, cookie consent, AGB",
          required: false,
        },
        {
          code: "GM",
          name: "Growth Metrics",
          agent: "launcher",
          description: "SaaS metrics — MRR, churn, LTV, CAC",
          required: false,
        },
      ],
    },
  };
  return info[phase] ?? { name: "Unknown", agent: "Unknown", commands: [] };
}

const DEFAULT_RALPH_STATUS: RalphLoopStatus = {
  loopCount: 0,
  status: "not_started",
  tasksCompleted: 0,
  tasksTotal: 0,
};

export async function readRalphStatus(projectDir: string): Promise<RalphLoopStatus> {
  const result = await readRalphRuntimeStatus(projectDir);
  if (result.kind === "missing") {
    return DEFAULT_RALPH_STATUS;
  }

  if (result.kind === "ok") {
    return {
      loopCount: result.value.loopCount,
      status: result.value.status,
      tasksCompleted: result.value.tasksCompleted,
      tasksTotal: result.value.tasksTotal,
    };
  }

  const label =
    result.kind === "unreadable"
      ? "Ralph status file is unreadable"
      : "Ralph status file is corrupted";
  warn(`${label}, using defaults: ${formatError(result.error)}`);
  return DEFAULT_RALPH_STATUS;
}
