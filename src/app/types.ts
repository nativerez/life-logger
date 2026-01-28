export type TimeBlock = "Morning" | "Afternoon" | "Evening" | "Late";
export type EnergyAfter = "+" | "0" | "-";

export type Entry = {
  id: string;
  date: string;           // YYYY-MM-DD
  timeBlock: TimeBlock;
  activity: string;
  lifeArea: string;
  withWhom: string;
  mode: string;
  durationHours: number;
  energyAfter: EnergyAfter;
  notes: string;
};

export const LIFE_AREAS = [
  "Family & Parenting",
  "Partner / Relationship",
  "Home & Chores",
  "Health & Exercise",
  "Leisure & Relaxation",
  "Social",
  "Personal Projects",
  "Learning",
  "Work (Core)",
  "Work (Overflow / After hours)",
  "Admin & Life Ops",
  "Travel / Commute",
  "Sleep / Recovery"
] as const;

export const WITH = ["Alone", "Partner", "Kids", "Family", "Friends", "Colleagues", "Other"] as const;
export const MODES = ["Rest", "Chore", "Focus", "Social", "Admin", "Reactive"] as const;
export const TIME_BLOCKS: TimeBlock[] = ["Morning", "Afternoon", "Evening", "Late"];
export const ENERGY: EnergyAfter[] = ["+", "0", "-"];
