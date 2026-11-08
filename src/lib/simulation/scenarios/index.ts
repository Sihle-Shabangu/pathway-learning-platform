import type { Scenario } from "../types";
import { hardwareTroubleshooting } from "./hardware-troubleshooting";

/** All scenarios by key. Add new scenario data files here. */
const SCENARIOS: Record<string, Scenario> = {
  [hardwareTroubleshooting.key]: hardwareTroubleshooting,
};

export function getScenario(key: string): Scenario | undefined {
  return SCENARIOS[key];
}
