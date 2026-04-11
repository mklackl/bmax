import chalk from "chalk";
import { readState, writeState, getPhaseLabel, type BmaxState } from "../utils/state.js";
import { readConfig } from "../utils/config.js";
import { withErrorHandling } from "../utils/errors.js";

interface LaunchOptions {
  projectDir: string;
}

export async function launchCommand(options: LaunchOptions): Promise<void> {
  await withErrorHandling(() => runLaunch(options));
}

async function runLaunch(options: LaunchOptions): Promise<void> {
  const { projectDir } = options;

  const config = await readConfig(projectDir);
  if (!config) {
    console.log(chalk.red("No bmax project found. Run bmax init first."));
    process.exitCode = 1;
    return;
  }

  const state = await readState(projectDir);
  const currentPhase = state?.currentPhase ?? 1;

  if (currentPhase < 4) {
    console.log(
      chalk.yellow(
        `Currently in Phase ${currentPhase} (${getPhaseLabel(currentPhase)}). ` +
          "Complete build phase before launching."
      )
    );
    console.log("Run bmax implement first to transition to Phase 4 (Build).\n");
    process.exitCode = 1;
    return;
  }

  // Transition to Phase 5
  const newState: BmaxState = {
    currentPhase: 5,
    status: "launching",
    startedAt: state?.startedAt ?? new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  await writeState(projectDir, newState);

  console.log(chalk.green("\nPhase 5: Launch\n"));
  console.log("Use the Launcher agent (Pip) to wire, verify, and ship.\n");
  console.log(chalk.bold("Step 1 — Wire & Verify (do this first):"));
  console.log("  /wire                — Connect services, deploy, smoke test");
  console.log("  /design-review       — Evaluate UI/UX quality against references");
  console.log("");
  console.log(chalk.bold("Step 2 — Launch Prep:"));
  console.log("  /launch-checklist    — Pre-launch audit");
  console.log("  /stripe-setup        — Stripe integration checklist");
  console.log("  /legal-compliance    — DSGVO, Impressum, AGB");
  console.log("  /seo-audit           — Technical SEO check");
  console.log("  /analytics-setup     — Analytics implementation guide");
  console.log("  /landing-page        — Landing page structure + copy");
  console.log("  /beta-launch         — Beta launch strategy");
  console.log("");
  console.log(chalk.dim("Growth commands (use anytime after launch):"));
  console.log("  /growth-metrics      — SaaS metrics dashboard design");
  console.log("  /user-feedback       — Collect and prioritize feedback");
  console.log("  /feature-prioritize  — Prioritize by revenue impact");
  console.log("  /churn-analysis      — Churn analysis and retention");
  console.log("");
}
