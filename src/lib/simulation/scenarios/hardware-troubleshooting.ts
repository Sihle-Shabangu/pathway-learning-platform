import type { Scenario } from "../types";

/**
 * "Diagnose the dead workstation": scenario content only, no logic.
 * Everything fault-specific lives here as data; the engine never checks which fault it is.
 *
 * Flags used:
 *   unplugged, grounded            - safety precautions (both required before any repair)
 *   static_risk                    - set when a repair is attempted without them
 *   heard_beep_code                - RAM fault beep pattern heard (unlocks "Reseat the RAM")
 *   ram_reseated                   - unlocks "Test one RAM stick at a time"
 *   bad_module_found               - evidence for replacing RAM
 *   high_cpu_temp                  - unlocks "Inspect the heatsink"
 *   heatsink_dirty                 - evidence for re-pasting the CPU
 *   psu_confirmed                  - evidence for replacing the PSU
 *   diagnosed                      - the learner named the right fault
 */
export const hardwareTroubleshooting: Scenario = {
  key: "hardware-troubleshooting",
  title: "Diagnose the dead workstation",
  briefing:
    "A lab workstation has stopped working properly. Investigate the symptoms, work safely, find the hidden fault and fix it with as few wasted steps as possible.",
  safetyFlags: ["unplugged", "grounded"],
  safetyViolationFlag: "static_risk",
  safetyViolationFeedback:
    "Unsafe: you worked inside the case before unplugging it and grounding yourself. Mains power can hurt you and static electricity can destroy components.",
  redundantInvestigationFeedback: "You've already checked this. Repeating it tells you nothing new and wastes time.",
  scoring: {
    startScore: 100,
    redundantInvestigationPenalty: -3,
    safetySkippedPenalty: -15,
    efficiencyBonus: 10,
    efficiencyMaxActions: 6,
    minScore: 0,
    maxScore: 100,
  },

  faults: [
    {
      id: "FAULTY_RAM",
      name: "Faulty RAM module",
      symptoms: [
        "The workstation powers on and the fans spin.",
        "The monitor stays black: no display at all.",
        "The case makes a repeating pattern of beeps.",
      ],
      expertPath: ["listen_beeps", "unplug", "ground", "reseat_ram", "run_memory_test", "replace_ram"],
      explanation:
        "A repeating beep pattern at power-on is the motherboard reporting a memory error. Reseating rules out a loose module; testing one stick at a time isolates the bad one, which you then replace.",
    },
    {
      id: "FAILING_PSU",
      name: "Failing power supply",
      symptoms: [
        "Sometimes the workstation won't power on at all.",
        "When it does start, it shuts down at random.",
        "There is a faint burning smell near the back of the case.",
      ],
      expertPath: ["check_outlet", "unplug", "ground", "psu_tester", "replace_psu"],
      explanation:
        "Dead or intermittent power with random shutdowns and a burning smell points to the power supply. Rule out the outlet and cable first, then confirm with a PSU tester before replacing it.",
    },
    {
      id: "CPU_OVERHEATING",
      name: "CPU overheating",
      symptoms: [
        "The workstation boots normally.",
        "After a few minutes of heavy use it switches itself off.",
        "The fans get very loud just before it shuts down.",
      ],
      expertPath: ["bios_temps", "unplug", "ground", "inspect_heatsink", "reapply_paste"],
      explanation:
        "A machine that runs and then cuts out under load is protecting itself from heat. BIOS temperatures confirm it, the heatsink shows the cause (dust and dried thermal paste), and cleaning and re-pasting fixes it.",
    },
  ],

  actions: [
    // ---------------------------------------------------------------- Investigate
    {
      id: "check_power_led",
      label: "Check the power LED",
      group: "investigate",
      component: "power",
      outcomes: {
        FAULTY_RAM: { feedback: "The power LED is on and the fans spin. Power is reaching the motherboard.", scoreDelta: 0, correct: true },
        FAILING_PSU: { feedback: "The power LED flickers, then goes dark. Power delivery looks unstable.", scoreDelta: 0, correct: true },
        CPU_OVERHEATING: { feedback: "The power LED is steady. The machine starts and runs normally at first.", scoreDelta: 0, correct: true },
      },
      defaultOutcome: { feedback: "The power LED is on.", scoreDelta: 0, correct: true },
    },
    {
      id: "listen_beeps",
      label: "Listen for beep codes",
      group: "investigate",
      component: "speaker",
      outcomes: {
        FAULTY_RAM: {
          feedback: "Three short beeps, repeating. That is the motherboard's memory error code.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["heard_beep_code"],
        },
        FAILING_PSU: { feedback: "Silence. The board isn't staying powered long enough to beep.", scoreDelta: 0, correct: true },
        CPU_OVERHEATING: { feedback: "A single short beep: the power-on self test passed normally.", scoreDelta: 0, correct: true },
      },
      defaultOutcome: { feedback: "A single short beep: the self test passed.", scoreDelta: 0, correct: true },
    },
    {
      id: "check_outlet",
      label: "Check the outlet and power cable",
      group: "investigate",
      component: "cable",
      outcomes: {
        FAILING_PSU: {
          feedback: "The outlet and cable work fine with another device, so the fault is inside the PC.",
          scoreDelta: 0,
          correct: true,
        },
      },
      defaultOutcome: { feedback: "The outlet and cable work fine with another device.", scoreDelta: 0, correct: true },
    },
    {
      id: "bios_temps",
      label: "Open BIOS temperature readings",
      group: "investigate",
      component: "monitor",
      outcomes: {
        CPU_OVERHEATING: {
          feedback: "The CPU reads 96°C within minutes of booting. That is far above a safe temperature.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["high_cpu_temp"],
        },
        FAULTY_RAM: { feedback: "You can't reach the BIOS: there is no display to show it on.", scoreDelta: 0, correct: true },
        FAILING_PSU: { feedback: "Temperatures look normal (about 40°C) before the machine cuts out.", scoreDelta: 0, correct: true },
      },
      defaultOutcome: { feedback: "Temperatures look normal.", scoreDelta: 0, correct: true },
    },
    {
      id: "run_memory_test",
      label: "Test one RAM stick at a time",
      group: "investigate",
      component: "ram",
      requires: ["ram_reseated"],
      lockHint: "Reseat the RAM first to rule out a loose module.",
      outcomes: {
        FAULTY_RAM: {
          feedback: "With only the slot B module installed the beeps return. The slot A module boots cleanly: slot B is bad.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["bad_module_found"],
        },
      },
      defaultOutcome: { feedback: "Every module passes on its own. Memory isn't the problem.", scoreDelta: 0, correct: true },
    },
    {
      id: "psu_tester",
      label: "Use a PSU tester",
      group: "investigate",
      component: "psu",
      outcomes: {
        FAILING_PSU: {
          feedback: "The 12V rail reads 10.9V, well outside tolerance. The power supply is failing.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["psu_confirmed"],
        },
      },
      defaultOutcome: { feedback: "All rails are within tolerance. The power supply is healthy.", scoreDelta: 0, correct: true },
    },
    {
      id: "inspect_heatsink",
      label: "Inspect the CPU heatsink",
      group: "investigate",
      component: "cpu",
      requires: ["high_cpu_temp"],
      lockHint: "Check the BIOS temperatures first: is there any sign of overheating?",
      outcomes: {
        CPU_OVERHEATING: {
          feedback: "The heatsink fins are packed with dust and the thermal paste has dried to a crust.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["heatsink_dirty"],
        },
      },
      defaultOutcome: { feedback: "The heatsink is clean and firmly seated.", scoreDelta: 0, correct: true },
    },

    // ---------------------------------------------------------------- Safety
    {
      id: "unplug",
      label: "Unplug the power cable",
      group: "safety",
      component: "cable",
      outcomes: {},
      defaultOutcome: {
        feedback: "Power disconnected. Hold the power button for a few seconds to drain any stored charge.",
        scoreDelta: 0,
        correct: true,
        setsFlags: ["unplugged"],
      },
    },
    {
      id: "ground",
      label: "Ground yourself (anti-static strap)",
      group: "safety",
      component: "case",
      outcomes: {},
      defaultOutcome: {
        feedback: "Anti-static strap clipped to bare metal on the chassis. You're grounded.",
        scoreDelta: 0,
        correct: true,
        setsFlags: ["grounded"],
      },
    },

    // ---------------------------------------------------------------- Repair
    {
      id: "reseat_ram",
      label: "Reseat the RAM",
      group: "repair",
      component: "ram",
      requires: ["heard_beep_code"],
      lockHint: "There's no sign of a memory problem yet. What would the motherboard tell you at power-on?",
      outcomes: {
        FAULTY_RAM: {
          feedback: "Both modules reseated firmly. The beep code continues, so one module is likely faulty.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["ram_reseated"],
        },
      },
      defaultOutcome: {
        feedback: "Modules reseated. Nothing changes.",
        scoreDelta: 0,
        correct: true,
        setsFlags: ["ram_reseated"],
      },
    },
    {
      id: "replace_ram",
      label: "Replace the faulty RAM module",
      group: "repair",
      component: "ram",
      outcomes: {
        FAULTY_RAM: {
          feedback: "New module installed. The workstation passes its self test and shows a display. Fault fixed!",
          scoreDelta: 0,
          correct: true,
          resolves: true,
          evidence: {
            flags: ["bad_module_found"],
            penalty: -10,
            feedback: "Lucky guess: you replaced memory before finding which module was bad.",
          },
        },
      },
      defaultOutcome: {
        feedback: "New RAM installed, but the problem persists. Memory wasn't the cause, and that part cost money.",
        scoreDelta: -15,
        correct: false,
      },
    },
    {
      id: "replace_psu",
      label: "Replace the power supply",
      group: "repair",
      component: "psu",
      outcomes: {
        FAILING_PSU: {
          feedback: "New power supply installed. Power is stable and the random shutdowns stop. Fault fixed!",
          scoreDelta: 0,
          correct: true,
          resolves: true,
          evidence: {
            flags: ["psu_confirmed"],
            penalty: -10,
            feedback: "Lucky guess: you replaced the PSU without testing it first.",
          },
        },
      },
      defaultOutcome: {
        feedback: "New power supply installed, but the problem persists. The PSU was healthy.",
        scoreDelta: -15,
        correct: false,
      },
    },
    {
      id: "reapply_paste",
      label: "Clean dust and reapply thermal paste",
      group: "repair",
      component: "cpu",
      outcomes: {
        CPU_OVERHEATING: {
          feedback: "Heatsink cleaned and fresh paste applied. Under load the CPU now settles around 45°C. Fault fixed!",
          scoreDelta: 0,
          correct: true,
          resolves: true,
          evidence: {
            flags: ["heatsink_dirty"],
            penalty: -10,
            feedback: "Lucky guess: you re-pasted the CPU without confirming it was overheating.",
          },
        },
      },
      defaultOutcome: {
        feedback: "Fresh paste applied, but the problem persists. Cooling wasn't the issue.",
        scoreDelta: -10,
        correct: false,
      },
    },
    {
      id: "replace_motherboard",
      label: "Replace the motherboard",
      group: "repair",
      component: "motherboard",
      outcomes: {},
      defaultOutcome: {
        feedback:
          "You replaced the most expensive part with no evidence it was faulty, and the problem persists. Always gather evidence before swapping parts.",
        scoreDelta: -20,
        correct: false,
      },
    },

    // ---------------------------------------------------------------- Diagnose
    {
      id: "diagnose_ram",
      label: "Diagnose: faulty RAM",
      group: "diagnose",
      outcomes: {
        FAULTY_RAM: {
          feedback: "Correct. The repeating beep code points to a memory fault.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["diagnosed"],
        },
        FAILING_PSU: {
          feedback: "Not quite. Memory faults produce a beep code; here the power itself is unstable. Look at the power supply.",
          scoreDelta: -15,
          correct: false,
        },
        CPU_OVERHEATING: {
          feedback: "Not quite. The machine passes its self test, so memory is fine. It only fails after running for a while.",
          scoreDelta: -15,
          correct: false,
        },
      },
      defaultOutcome: { feedback: "That diagnosis doesn't fit the evidence.", scoreDelta: -15, correct: false },
    },
    {
      id: "diagnose_psu",
      label: "Diagnose: failing power supply",
      group: "diagnose",
      outcomes: {
        FAILING_PSU: {
          feedback: "Correct. Intermittent power, random shutdowns and a burning smell point to the power supply.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["diagnosed"],
        },
        FAULTY_RAM: {
          feedback: "Not quite. The beep pattern points to memory, not power: the board has power and is reporting an error.",
          scoreDelta: -15,
          correct: false,
        },
        CPU_OVERHEATING: {
          feedback: "Not quite. Power is steady until the machine heats up. The temperature points to cooling, not power.",
          scoreDelta: -15,
          correct: false,
        },
      },
      defaultOutcome: { feedback: "That diagnosis doesn't fit the evidence.", scoreDelta: -15, correct: false },
    },
    {
      id: "diagnose_cpu",
      label: "Diagnose: CPU overheating",
      group: "diagnose",
      outcomes: {
        CPU_OVERHEATING: {
          feedback: "Correct. Running normally and then cutting out under load is classic overheating.",
          scoreDelta: 0,
          correct: true,
          setsFlags: ["diagnosed"],
        },
        FAULTY_RAM: {
          feedback: "Not quite. An overheating PC would boot and show a display first. The beep pattern points to memory.",
          scoreDelta: -15,
          correct: false,
        },
        FAILING_PSU: {
          feedback: "Not quite. Temperatures are normal, and the machine sometimes won't start at all. That points to power, not heat.",
          scoreDelta: -15,
          correct: false,
        },
      },
      defaultOutcome: { feedback: "That diagnosis doesn't fit the evidence.", scoreDelta: -15, correct: false },
    },
  ],
};
