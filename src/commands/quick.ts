import chalk from "chalk";
import { withErrorHandling } from "../utils/errors.js";
import { isInitialized } from "../installer.js";

interface QuickOptions {
  projectDir: string;
}

export async function quickCommand(options: QuickOptions): Promise<void> {
  await withErrorHandling(() => runQuick(options));
}

async function runQuick(options: QuickOptions): Promise<void> {
  const { projectDir } = options;

  const initialized = await isInitialized(projectDir);
  if (!initialized) {
    console.log(chalk.red("No bmax project found. Run bmax init first."));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.green("\n⚡ Quick Flow\n"));
  console.log("Skipping phase ceremony. Going straight to Builder (Max).\n");
  console.log(chalk.bold("Quick Flow commands:"));
  console.log("  /builder             — Builder agent with full menu");
  console.log("  Or use shortcuts directly:");
  console.log("  /quick-dev-new       — Unified: intent → plan → implement → review");
  console.log("  /quick-dev           — Quick implementation of a story");
  console.log("  /tech-spec           — Quick technical spec");
  console.log("");
  console.log(chalk.dim("For a full planning cycle, use the 5-phase flow instead:"));
  console.log(
    chalk.dim("  /researcher → /product-designer → /architect → bmax implement → bmax launch")
  );
  console.log("");
}
