/**
 * Small, browser-safe facts about scenarios (keys, titles, fault names).
 * Deliberately does NOT import the scenario data files: client components import this,
 * and the full scenario (outcomes per fault) must never be shipped to the browser.
 * tests/unit/scenario-catalog.test.ts checks these values match the scenario data.
 */
export const SCENARIO_OPTIONS = [{ key: "hardware-troubleshooting", title: "Diagnose the dead workstation" }] as const;

export const FAULT_NAMES: Record<string, string> = {
  FAULTY_RAM: "Faulty RAM module",
  FAILING_PSU: "Failing power supply",
  CPU_OVERHEATING: "CPU overheating",
};

/** Display name for a fault id (only ever shown for completed attempts). */
export function faultLabel(faultId: string): string {
  return FAULT_NAMES[faultId] ?? faultId;
}
