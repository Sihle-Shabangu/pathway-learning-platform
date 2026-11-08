import { describe, expect, it } from "vitest";
import { FAULT_NAMES, SCENARIO_OPTIONS } from "@/lib/simulation/scenarios/catalog";
import { hardwareTroubleshooting } from "@/lib/simulation/scenarios/hardware-troubleshooting";
import { getScenario } from "@/lib/simulation/scenarios";

describe("scenario catalog (browser-safe copy) matches the scenario data", () => {
  it("lists every registered scenario with its title", () => {
    for (const option of SCENARIO_OPTIONS) {
      expect(getScenario(option.key)?.title).toBe(option.title);
    }
  });

  it("has the same fault names as the scenario", () => {
    const fromScenario = Object.fromEntries(hardwareTroubleshooting.faults.map((fault) => [fault.id, fault.name]));
    expect(FAULT_NAMES).toEqual(fromScenario);
  });

  it("every expert path only uses actions that exist", () => {
    const ids = new Set(hardwareTroubleshooting.actions.map((action) => action.id));
    for (const fault of hardwareTroubleshooting.faults) {
      for (const actionId of fault.expertPath) expect(ids.has(actionId)).toBe(true);
    }
  });
});
