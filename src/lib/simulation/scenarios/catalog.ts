/** The scenarios an admin can build an activity from. Keep in sync with the scenario registry. */
export const SCENARIO_OPTIONS = [
  { key: "hardware-troubleshooting", title: "Diagnose the dead workstation" },
] as const;

export type ScenarioKey = (typeof SCENARIO_OPTIONS)[number]["key"];

/** Display names for fault ids, used where the full scenario isn't loaded. */
const FAULT_LABELS: Record<string, string> = {
  FAULTY_RAM: "Faulty RAM module",
  FAILING_PSU: "Failing power supply",
  CPU_OVERHEATING: "CPU overheating",
};

export function faultLabel(faultId: string): string {
  return FAULT_LABELS[faultId] ?? faultId;
}
