export type Habit = {
  id: string;
  name: string;
  type: "daily" | "weekly";
  monthlyGoal: number; // target completions for the month
  hex: string; // accent color
  initialCompletions: number[]; // 1-indexed day numbers
  routineId?: string; // optional link to a Routine
};

export type MonthConfig = {
  label: string;
  daysInMonth: number;
  todayDay: number; // last logged day (simulates "today")
  startDow: number; // day of week for the 1st (Mon=0 … Sun=6)
};

export const MONTH_CONFIG: MonthConfig = {
  label: "January 2025",
  daysInMonth: 31,
  todayDay: 24,
  startDow: 2, // Jan 1, 2025 = Wednesday
};

export const HABITS: Habit[] = [
  {
    id: "meditation",
    name: "Morning Meditation",
    type: "daily",
    monthlyGoal: 26,
    hex: "#8b5cf6",
    routineId: "routine-meditation",
    initialCompletions: [1,2,3,4,6,7,8,9,10,11,13,14,15,16,17,18,20,21,22,23,24],
  },
  {
    id: "exercise",
    name: "Exercise",
    type: "daily",
    monthlyGoal: 20,
    hex: "#10b981",
    routineId: "routine-exercise",
    initialCompletions: [1,3,4,6,8,10,11,13,15,17,18,20,22,24],
  },
  {
    id: "reading",
    name: "Reading",
    type: "daily",
    monthlyGoal: 20,
    hex: "#0ea5e9",
    initialCompletions: [2,3,5,7,9,10,12,14,16,17,19,21,23,24],
  },
  {
    id: "journaling",
    name: "Journaling",
    type: "daily",
    monthlyGoal: 15,
    hex: "#f59e0b",
    initialCompletions: [1,4,7,10,13,16,19,22],
  },
  {
    id: "cold-shower",
    name: "Cold Shower",
    type: "daily",
    monthlyGoal: 15,
    hex: "#06b6d4",
    initialCompletions: [1,2,3,6,7,8,13,14,15,20,21],
  },
  {
    id: "vitamins",
    name: "Vitamins",
    type: "daily",
    monthlyGoal: 28,
    hex: "#f43f5e",
    initialCompletions: [1,2,3,4,5,6,7,8,9,10,12,13,14,15,17,18,19,20,21,23,24],
  },
  {
    id: "water",
    name: "Drink Water",
    type: "daily",
    monthlyGoal: 30,
    hex: "#22d3ee",
    initialCompletions: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,21,22,23,24],
  },
];

export const STORAGE_KEY = "habitflow-completions-jan2025";
