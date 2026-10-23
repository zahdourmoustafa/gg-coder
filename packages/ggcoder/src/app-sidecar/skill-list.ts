import type { Skill } from "../core/skills.js";

/** One row of `GET /skills`: what a companion needs to offer a skill by name. */
export interface SkillRow {
  name: string;
  description: string;
  /** "bundled", "global" or "project": where the skill file came from. */
  source: string;
}

/**
 * The skills this session actually loaded, by name. Blocked skills are not
 * here: the safety scan kept them out, so offering them would name something
 * the agent refuses to load. Content stays out too — a companion lists them,
 * the agent reads them.
 */
export function skillRows(skills: readonly Skill[]): SkillRow[] {
  return skills
    .map(({ name, description, source }) => ({ name, description, source }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
