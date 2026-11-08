"use client";

import type { KeyboardEvent, ReactNode } from "react";

export const COMPONENT_LABELS: Record<string, string> = {
  monitor: "Monitor",
  power: "Power button and LED",
  speaker: "Motherboard speaker",
  cpu: "CPU and heatsink",
  ram: "RAM modules",
  motherboard: "Motherboard",
  psu: "Power supply (PSU)",
  case: "Chassis ground point",
  cable: "Power cable and outlet",
};

type PartProps = {
  id: string;
  selected: boolean;
  actionCount: number;
  onSelect: (id: string) => void;
  /** Bounding box for the focus/selection outline. */
  box: { x: number; y: number; width: number; height: number };
  children: ReactNode;
};

/** One clickable part of the illustration. Keyboard: Tab to focus, Enter or Space to select. */
function Part({ id, selected, actionCount, onSelect, box, children }: PartProps) {
  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  }
  return (
    <g
      className="pc-part"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${COMPONENT_LABELS[id]}: ${actionCount} related action${actionCount === 1 ? "" : "s"}`}
      onClick={() => onSelect(id)}
      onKeyDown={handleKeyDown}
    >
      <rect className="pc-part-outline" x={box.x - 4} y={box.y - 4} width={box.width + 8} height={box.height + 8} rx={6} />
      {children}
    </g>
  );
}

const STROKE = "#3a4d75";
const FILL = "#1d2d4d";
const LABEL = { fill: "#a9b6d3", fontSize: 10, fontFamily: "var(--font-jetbrains-mono), monospace" } as const;

/**
 * Side view of an open workstation. Purely presentational: it reports which part was chosen,
 * and the workbench shows the actions related to that part.
 */
export function PcTower({
  selected,
  onSelect,
  actionCounts,
}: {
  selected: string | null;
  onSelect: (componentId: string) => void;
  actionCounts: Record<string, number>;
}) {
  const part = (id: string) => ({
    id,
    selected: selected === id,
    actionCount: actionCounts[id] ?? 0,
    onSelect,
  });

  return (
    <svg
      viewBox="0 0 430 360"
      className="h-auto w-full max-w-xl"
      role="group"
      aria-label="Workstation illustration. Select a part to see related actions."
    >
      <title>Open workstation on the bench</title>

      {/* Monitor */}
      <Part {...part("monitor")} box={{ x: 10, y: 30, width: 130, height: 110 }}>
        <rect x={10} y={30} width={130} height={86} rx={6} fill="#0b1324" stroke={STROKE} strokeWidth={2} />
        <rect x={20} y={40} width={110} height={66} rx={2} fill="#0f1a2e" />
        <text x={75} y={78} textAnchor="middle" {...LABEL}>
          BIOS
        </text>
        <rect x={67} y={116} width={16} height={14} fill={STROKE} />
        <rect x={45} y={130} width={60} height={10} rx={3} fill={STROKE} />
      </Part>

      {/* Case shell (not clickable) */}
      <rect x={160} y={10} width={190} height={340} rx={10} fill="#111c33" stroke={STROKE} strokeWidth={3} />

      {/* Power button + LED on the front edge */}
      <Part {...part("power")} box={{ x: 166, y: 22, width: 26, height: 44 }}>
        <circle cx={179} cy={34} r={9} fill={FILL} stroke={STROKE} strokeWidth={2} />
        <path d="M179 29 v6 M175 31 a5 5 0 1 0 8 0" stroke="#a9b6d3" strokeWidth={1.5} fill="none" />
        <circle cx={179} cy={58} r={4} fill="#2dd4bf" />
      </Part>

      {/* Motherboard */}
      <Part {...part("motherboard")} box={{ x: 200, y: 26, width: 136, height: 214 }}>
        <rect x={200} y={26} width={136} height={214} rx={4} fill="#13305a" stroke="#2c4f86" strokeWidth={2} />
        <text x={210} y={232} {...LABEL}>
          MOTHERBOARD
        </text>
      </Part>

      {/* CPU + heatsink */}
      <Part {...part("cpu")} box={{ x: 214, y: 50, width: 70, height: 70 }}>
        <rect x={214} y={50} width={70} height={70} rx={6} fill={FILL} stroke={STROKE} strokeWidth={2} />
        <circle cx={249} cy={85} r={26} fill="none" stroke="#a9b6d3" strokeWidth={1.5} />
        <path d="M249 63 L249 107 M227 85 L271 85 M233 69 L265 101 M265 69 L233 101" stroke="#3a4d75" strokeWidth={1.5} />
        <text x={249} y={132} textAnchor="middle" {...LABEL}>
          CPU
        </text>
      </Part>

      {/* RAM sticks */}
      <Part {...part("ram")} box={{ x: 298, y: 44, width: 28, height: 110 }}>
        <rect x={300} y={46} width={9} height={106} rx={2} fill="#7b93ff" />
        <rect x={315} y={46} width={9} height={106} rx={2} fill="#7b93ff" opacity={0.75} />
        <text x={312} y={166} textAnchor="middle" {...LABEL}>
          RAM
        </text>
      </Part>

      {/* Speaker */}
      <Part {...part("speaker")} box={{ x: 214, y: 172, width: 34, height: 34 }}>
        <circle cx={231} cy={189} r={14} fill={FILL} stroke={STROKE} strokeWidth={2} />
        <circle cx={231} cy={189} r={6} fill="#a9b6d3" />
        <text x={256} y={193} {...LABEL}>
          SPK
        </text>
      </Part>

      {/* Chassis ground point */}
      <Part {...part("case")} box={{ x: 300, y: 252, width: 40, height: 14 }}>
        <rect x={300} y={252} width={40} height={14} rx={3} fill="#2a3a5c" stroke="#a9b6d3" strokeWidth={1} />
        <text x={320} y={262} textAnchor="middle" {...LABEL} fontSize={8}>
          GND
        </text>
      </Part>

      {/* Power supply */}
      <Part {...part("psu")} box={{ x: 176, y: 278, width: 160, height: 60 }}>
        <rect x={176} y={278} width={160} height={60} rx={4} fill={FILL} stroke={STROKE} strokeWidth={2} />
        <circle cx={210} cy={308} r={20} fill="none" stroke="#a9b6d3" strokeWidth={1.5} />
        <text x={250} y={312} {...LABEL}>
          PSU 650W
        </text>
      </Part>

      {/* Power cable to the wall outlet */}
      <Part {...part("cable")} box={{ x: 336, y: 290, width: 88, height: 60 }}>
        <path d="M336 308 C 365 308, 365 330, 392 330" stroke="#fbbf24" strokeWidth={3} fill="none" />
        <rect x={392} y={300} width={30} height={46} rx={4} fill="#0b1324" stroke={STROKE} strokeWidth={2} />
        <circle cx={402} cy={318} r={2.5} fill="#a9b6d3" />
        <circle cx={412} cy={318} r={2.5} fill="#a9b6d3" />
        <text x={407} y={340} textAnchor="middle" {...LABEL} fontSize={8}>
          AC
        </text>
      </Part>
    </svg>
  );
}
