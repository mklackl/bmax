import type { Platform } from "./types.js";

function getCommandIndexHint(platform: Platform): string {
  return `Read _bmad/COMMANDS.md and ask ${platform.displayName} to run the BMAD master agent`;
}

function getSkillHint(platform: Platform, skillName: string, skillsDir: string): string {
  if (platform.id === "codex") {
    return `Use the \`$${skillName}\` Codex Skill`;
  }

  return `Ask ${platform.displayName} to load the \`bmad-${skillName}\` skill from \`${skillsDir}\``;
}

export function getPlatformAnalysisHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /researcher to start research";
  }

  if (platform.commandDelivery.kind === "skills") {
    return getSkillHint(platform, "researcher", platform.commandDelivery.dir);
  }

  return getCommandIndexHint(platform);
}

export function getPlatformPrdHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /product-designer to create PRD";
  }

  if (platform.commandDelivery.kind === "skills") {
    return getSkillHint(platform, "create-prd", platform.commandDelivery.dir);
  }

  return getCommandIndexHint(platform);
}

export function getPlatformArchitectureHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /architect to create architecture";
  }

  if (platform.commandDelivery.kind === "skills") {
    return getSkillHint(platform, "architect", platform.commandDelivery.dir);
  }

  return getCommandIndexHint(platform);
}

export function getPlatformEpicsStoriesHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /create-epics-stories to define epics and stories";
  }

  if (platform.commandDelivery.kind === "skills") {
    return getSkillHint(platform, "create-epics-stories", platform.commandDelivery.dir);
  }

  return getCommandIndexHint(platform);
}

export function getPlatformReadinessHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /implementation-readiness to generate readiness report";
  }

  if (platform.commandDelivery.kind === "skills") {
    return getSkillHint(platform, "check-implementation-readiness", platform.commandDelivery.dir);
  }

  return getCommandIndexHint(platform);
}

export function getPlatformMasterAgentHint(platform: Platform): string {
  if (platform.commandDelivery.kind === "directory") {
    return "Run /bmax to navigate phases";
  }

  if (platform.commandDelivery.kind === "skills") {
    return platform.id === "codex"
      ? "Use the `$bmax` Codex Skill to navigate phases"
      : `Ask ${platform.displayName} to load the \`bmad-bmax\` skill from \`${platform.commandDelivery.dir}\``;
  }

  return getCommandIndexHint(platform);
}
