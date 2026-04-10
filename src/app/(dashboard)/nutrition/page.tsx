"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  loadNutritionEntries,
  saveNutritionEntries,
  loadNutritionGoals,
  saveNutritionGoals,
  getTodayEntries,
  getDayTotals,
  generateNutritionId,
  generateFoodId,
  todayDateString,
  type NutritionEntry,
  type NutritionGoals,
  type MealType,
  type FoodItem,
} from "@/lib/nutritionData";

// ── constants ─────────────────────────────────────────────────────────────────

const MEAL_ORDER: MealType[] = [
  "breakfast",
  "pre_training",
  "lunch",
  "post_training",
  "dinner",
  "snack",
];

const MEAL_META: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: "Breakfast", emoji: "🌅" },
  pre_training: { label: "Pre-Training", emoji: "⚡" },
  lunch: { label: "Lunch", emoji: "☀️" },
  post_training: { label: "Post-Training", emoji: "💪" },
  dinner: { label: "Dinner", emoji: "🌙" },
  snack: { label: "Snack", emoji: "🍎" },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  return days;
}

function offsetDate(base: string, delta: number): string {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sumFoodCalories(foods: FoodItem[]): number {
  return foods.reduce((s, f) => s + (f.calories ?? 0), 0);
}

function sumFoodProtein(foods: FoodItem[]): number {
  return foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);
}

// ── Recharts tooltip ──────────────────────────────────────────────────────────

interface ChartPayloadItem {
  value: number;
  payload: { date: string; label: string };
}

function CalorieTooltip({
  active,
  payload,
  goal,
}: {
  active?: boolean;
  payload?: ChartPayloadItem[];
  goal?: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-[#1a1f35] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="text-white/40 mb-0.5">{item.payload.label}</p>
      <p className="font-semibold text-violet-300">{item.value} kcal</p>
      {goal != null && goal > 0 && (
        <p className="text-white/30 mt-0.5">Goal: {goal} kcal</p>
      )}
    </div>
  );
}

// ── food item row ─────────────────────────────────────────────────────────────

interface FoodItemRow {
  id: string;
  name: string;
  calories: string;
  proteinG: string;
  notes: string;
}

function blankFoodRow(): FoodItemRow {
  return { id: generateFoodId(), name: "", calories: "", proteinG: "", notes: "" };
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function NutritionPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "log" | "history">(
    "today"
  );

  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({});

  // Log Meal tab
  const [logMealType, setLogMealType] = useState<MealType>("breakfast");
  const [logDate, setLogDate] = useState("");
  const [foodRows, setFoodRows] = useState<FoodItemRow[]>([blankFoodRow()]);
  const [mealNotes, setMealNotes] = useState("");

  // History tab
  const [historyDate, setHistoryDate] = useState("");
  const [showGoalsForm, setShowGoalsForm] = useState(false);
  const [goalCalInput, setGoalCalInput] = useState("");
  const [goalProtInput, setGoalProtInput] = useState("");

  // Pre-select meal type from today tab shortcut
  const [pendingMealType, setPendingMealType] = useState<MealType | null>(null);

  useEffect(() => {
    setMounted(true);
    const e = loadNutritionEntries();
    const g = loadNutritionGoals();
    setEntries(e);
    setGoals(g);
    const today = todayDateString();
    setLogDate(today);
    setHistoryDate(today);
    setGoalCalInput(g.dailyCalories != null ? String(g.dailyCalories) : "");
    setGoalProtInput(g.dailyProteinG != null ? String(g.dailyProteinG) : "");
  }, []);

  useEffect(() => {
    if (pendingMealType !== null) {
      setLogMealType(pendingMealType);
      setActiveTab("log");
      setPendingMealType(null);
    }
  }, [pendingMealType]);

  if (!mounted) return null;

  // ── log meal handlers ───────────────────────────────────────────────────────

  const logCaloriesPreview = foodRows.reduce(
    (s, r) => s + (parseFloat(r.calories) || 0),
    0
  );
  const logProteinPreview = foodRows.reduce(
    (s, r) => s + (parseFloat(r.proteinG) || 0),
    0
  );

  function updateFoodRow(id: string, field: keyof FoodItemRow, value: string) {
    setFoodRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function removeFoodRow(id: string) {
    setFoodRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function saveMeal() {
    const validFoods = foodRows.filter((r) => r.name.trim());
    if (validFoods.length === 0 || !logDate) return;

    const foods: FoodItem[] = validFoods.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      ...(r.calories ? { calories: parseFloat(r.calories) } : {}),
      ...(r.proteinG ? { proteinG: parseFloat(r.proteinG) } : {}),
      ...(r.notes ? { notes: r.notes.trim() } : {}),
    }));

    const totalCal = foods.reduce((s, f) => s + (f.calories ?? 0), 0);
    const totalProt = foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);

    const entry: NutritionEntry = {
      id: generateNutritionId(),
      date: logDate,
      mealType: logMealType,
      foods,
      ...(totalCal > 0 ? { totalCalories: totalCal } : {}),
      ...(totalProt > 0 ? { totalProteinG: totalProt } : {}),
      ...(mealNotes.trim() ? { notes: mealNotes.trim() } : {}),
      createdAt: new Date().toISOString(),
    };

    const updated = [...entries, entry];
    setEntries(updated);
    saveNutritionEntries(updated);
    setFoodRows([blankFoodRow()]);
    setMealNotes("");
    setActiveTab("today");
  }

  function deleteMealEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveNutritionEntries(updated);
  }

  function saveGoals() {
    const g: NutritionGoals = {
      ...(goalCalInput ? { dailyCalories: parseFloat(goalCalInput) } : {}),
      ...(goalProtInput ? { dailyProteinG: parseFloat(goalProtInput) } : {}),
    };
    setGoals(g);
    saveNutritionGoals(g);
    setShowGoalsForm(false);
  }

  // ── today data ──────────────────────────────────────────────────────────────

  const today = todayDateString();
  const todayNutritionEntries = getTodayEntries(entries);
  const todayTotals = getDayTotals(entries, today);

  // ── history data ────────────────────────────────────────────────────────────

  const historyTotals = getDayTotals(entries, historyDate);
  const historyMeals = entries
    .filter((e) => e.date === historyDate)
    .sort(
      (a, b) =>
        MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
    );

  const last7Days = getLastNDays(7);
  const chartData = last7Days.map((date) => {
    const t = getDayTotals(entries, date);
    const d = new Date(date + "T12:00:00");
    return {
      date,
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      calories: t.calories,
    };
  });

  // ── render helpers ──────────────────────────────────────────────────────────

  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors";
  const labelCls =
    "block text-[11px] text-white/40 mb-1 uppercase tracking-wider";
  const btnPrimary =
    "px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-medium transition-all";
  const btnGhost =
    "px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 text-xs transition-colors";

  return (
    <div className="space-y-7 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold text-white">🥗 Nutrition</h1>
          <p className="text-sm text-white/30 mt-0.5">{today}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(["today", "log", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-violet-600/80 to-pink-600/80 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab === "today"
              ? "📊 Today"
              : tab === "log"
              ? "✏️ Log Meal"
              : "📅 History"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ TODAY TAB ═══════════════════════ */}
      {activeTab === "today" && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-white">
              🥗 Today&apos;s Fuel
            </h2>
            <p className="text-sm text-white/30 mt-0.5">{today}</p>
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Calories
              </p>
              <p className="text-2xl font-bold text-white">
                {todayTotals.calories}
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">kcal</p>
            </Panel>
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Protein
              </p>
              <p className="text-2xl font-bold text-white">
                {todayTotals.proteinG.toFixed(0)}
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">grams</p>
            </Panel>
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Meals
              </p>
              <p className="text-2xl font-bold text-white">
                {todayTotals.mealCount}
              </p>
              <p className="text-[10px] text-white/20 mt-0.5">logged</p>
            </Panel>
          </div>

          {/* Progress bars */}
          {(goals.dailyCalories != null || goals.dailyProteinG != null) && (
            <Panel>
              <SectionTitle title="Daily Goals" />
              <div className="space-y-4">
                {goals.dailyCalories != null && goals.dailyCalories > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1.5">
                      <span>Calories</span>
                      <span>
                        {todayTotals.calories} / {goals.dailyCalories} kcal
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                        style={{
                          width: `${Math.min(100, (todayTotals.calories / goals.dailyCalories) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {goals.dailyProteinG != null && goals.dailyProteinG > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-white/40 mb-1.5">
                      <span>Protein</span>
                      <span>
                        {todayTotals.proteinG.toFixed(0)} / {goals.dailyProteinG} g
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                        style={{
                          width: `${Math.min(100, (todayTotals.proteinG / goals.dailyProteinG) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Meal groups */}
          {todayNutritionEntries.length === 0 ? (
            <Panel className="text-center py-14">
              <p className="text-4xl mb-3">💪</p>
              <p className="text-white/50 text-sm">
                Fuel your body like it&apos;s your job. 💪
              </p>
              <p className="text-white/25 text-xs mt-2">
                Nothing logged today yet.
              </p>
              <button
                onClick={() => setActiveTab("log")}
                className={`${btnPrimary} mt-4 text-xs`}
              >
                Log first meal
              </button>
            </Panel>
          ) : (
            <div className="space-y-4">
              {MEAL_ORDER.map((mealType) => {
                const mealEntries = todayNutritionEntries.filter(
                  (e) => e.mealType === mealType
                );
                const meta = MEAL_META[mealType];
                return (
                  <Panel key={mealType}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white/80">
                        {meta.emoji} {meta.label}
                      </h3>
                      <button
                        onClick={() => setPendingMealType(mealType)}
                        className="text-[11px] text-violet-400/60 hover:text-violet-300 transition-colors"
                      >
                        + Add {meta.label.toLowerCase()}
                      </button>
                    </div>

                    {mealEntries.length === 0 ? (
                      <p className="text-xs text-white/20 italic">
                        Nothing logged
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {mealEntries.map((entry) => {
                          const cal =
                            entry.totalCalories ??
                            sumFoodCalories(entry.foods);
                          const prot =
                            entry.totalProteinG ??
                            sumFoodProtein(entry.foods);
                          return (
                            <div
                              key={entry.id}
                              className="group rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 space-y-2"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex gap-3 text-xs text-white/40">
                                  {cal > 0 && (
                                    <span className="text-violet-300/80">
                                      {cal} kcal
                                    </span>
                                  )}
                                  {prot > 0 && (
                                    <span className="text-teal-300/80">
                                      {prot.toFixed(0)}g protein
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteMealEntry(entry.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/50 hover:text-red-400 transition-all"
                                >
                                  ✕
                                </button>
                              </div>
                              <ul className="space-y-1">
                                {entry.foods.map((food) => (
                                  <li
                                    key={food.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-white/70">
                                      {food.name}
                                    </span>
                                    <span className="text-white/25">
                                      {food.calories != null
                                        ? `${food.calories} kcal`
                                        : ""}
                                      {food.proteinG != null
                                        ? ` · ${food.proteinG}g`
                                        : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              {entry.notes && (
                                <p className="text-[11px] text-white/25 italic">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ LOG MEAL TAB ═══════════════════════ */}
      {activeTab === "log" && (
        <div className="space-y-6">
          <Panel>
            <SectionTitle title="Log a Meal" />
            <div className="space-y-5">
              {/* Meal type selector */}
              <div>
                <label className={labelCls}>Meal Type</label>
                <div className="flex flex-wrap gap-2">
                  {MEAL_ORDER.map((mt) => {
                    const meta = MEAL_META[mt];
                    return (
                      <button
                        key={mt}
                        onClick={() => setLogMealType(mt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          logMealType === mt
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "border-white/[0.08] text-white/30 hover:text-white/60"
                        }`}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className={labelCls}>Date</label>
                <input
                  type="date"
                  className={inputCls + " max-w-[200px]"}
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>

              {/* Food items */}
              <div>
                <label className={labelCls}>Food Items</label>
                <div className="space-y-2">
                  {foodRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="flex gap-2 items-start p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]"
                    >
                      <span className="text-[10px] text-white/20 pt-2.5 w-4 shrink-0 text-right">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            className={inputCls}
                            placeholder="Food name"
                            value={row.name}
                            onChange={(e) =>
                              updateFoodRow(row.id, "name", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            className={inputCls}
                            placeholder="Calories"
                            min="0"
                            value={row.calories}
                            onChange={(e) =>
                              updateFoodRow(row.id, "calories", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            className={inputCls}
                            placeholder="Protein (g)"
                            min="0"
                            value={row.proteinG}
                            onChange={(e) =>
                              updateFoodRow(row.id, "proteinG", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeFoodRow(row.id)}
                        className="text-red-400/30 hover:text-red-400 text-lg pt-1 transition-colors"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setFoodRows((prev) => [...prev, blankFoodRow()])
                  }
                  className={`${btnGhost} mt-2`}
                >
                  + Add another food
                </button>
              </div>

              {/* Totals preview */}
              {(logCaloriesPreview > 0 || logProteinPreview > 0) && (
                <div className="flex gap-4 px-3 py-2 bg-violet-500/[0.08] border border-violet-500/20 rounded-lg text-sm">
                  {logCaloriesPreview > 0 && (
                    <span className="text-violet-300">
                      Total:{" "}
                      <strong>{logCaloriesPreview.toFixed(0)} kcal</strong>
                    </span>
                  )}
                  {logProteinPreview > 0 && (
                    <span className="text-teal-300">
                      Protein:{" "}
                      <strong>{logProteinPreview.toFixed(1)}g</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Meal notes */}
              <div>
                <label className={labelCls}>
                  Notes — How did you feel? Any observations?
                </label>
                <textarea
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="e.g. ate before pole class, felt heavy, great energy..."
                  value={mealNotes}
                  onChange={(e) => setMealNotes(e.target.value)}
                />
              </div>

              <button
                onClick={saveMeal}
                disabled={
                  foodRows.every((r) => !r.name.trim()) || !logDate
                }
                className={
                  btnPrimary +
                  " disabled:opacity-40 disabled:cursor-not-allowed"
                }
              >
                Save meal
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* ═══════════════════════ HISTORY TAB ═══════════════════════ */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Date nav */}
          <Panel>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setHistoryDate((d) => offsetDate(d, -1))
                }
                className={btnGhost}
              >
                ← Prev day
              </button>
              <input
                type="date"
                className={inputCls + " flex-1 max-w-[180px]"}
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
              />
              <button
                onClick={() =>
                  setHistoryDate((d) => offsetDate(d, 1))
                }
                disabled={historyDate >= today}
                className={
                  btnGhost + " disabled:opacity-30 disabled:cursor-not-allowed"
                }
              >
                Next day →
              </button>
            </div>
          </Panel>

          {/* Day summary */}
          <div className="grid grid-cols-3 gap-3">
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Calories
              </p>
              <p className="text-2xl font-bold text-white">
                {historyTotals.calories}
              </p>
            </Panel>
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Protein
              </p>
              <p className="text-2xl font-bold text-white">
                {historyTotals.proteinG.toFixed(0)}g
              </p>
            </Panel>
            <Panel className="text-center">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                Meals
              </p>
              <p className="text-2xl font-bold text-white">
                {historyTotals.mealCount}
              </p>
            </Panel>
          </div>

          {/* Day meals */}
          {historyMeals.length === 0 ? (
            <Panel className="text-center py-10">
              <p className="text-white/30 text-sm">
                No meals logged for {historyDate}.
              </p>
            </Panel>
          ) : (
            <div className="space-y-3">
              {historyMeals.map((entry) => {
                const meta = MEAL_META[entry.mealType];
                const cal =
                  entry.totalCalories ?? sumFoodCalories(entry.foods);
                const prot =
                  entry.totalProteinG ?? sumFoodProtein(entry.foods);
                return (
                  <Panel key={entry.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white/80">
                        {meta.emoji} {meta.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-violet-300/70">
                          {cal > 0 ? `${cal} kcal` : ""}
                        </span>
                        <span className="text-xs text-teal-300/70">
                          {prot > 0 ? `${prot.toFixed(0)}g` : ""}
                        </span>
                        <button
                          onClick={() => deleteMealEntry(entry.id)}
                          className="text-red-400/30 hover:text-red-400 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {entry.foods.map((food) => (
                        <li
                          key={food.id}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-white/60">{food.name}</span>
                          <span className="text-white/25">
                            {food.calories != null
                              ? `${food.calories} kcal`
                              : ""}
                            {food.proteinG != null
                              ? ` · ${food.proteinG}g`
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {entry.notes && (
                      <p className="text-[11px] text-white/25 italic mt-2">
                        {entry.notes}
                      </p>
                    )}
                  </Panel>
                );
              })}
            </div>
          )}

          {/* 7-day bar chart */}
          <Panel>
            <SectionTitle title="7-Day Calories" />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop
                        offset="100%"
                        stopColor="#ec4899"
                        stopOpacity={0.6}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <CalorieTooltip
                        active={props.active}
                        payload={
                          props.payload as unknown as ChartPayloadItem[] | undefined
                        }
                        goal={goals.dailyCalories}
                      />
                    )}
                  />
                  {goals.dailyCalories != null && goals.dailyCalories > 0 && (
                    <ReferenceLine
                      y={goals.dailyCalories}
                      stroke="rgba(139,92,246,0.4)"
                      strokeDasharray="4 2"
                      label={{
                        value: `Goal: ${goals.dailyCalories}`,
                        fill: "rgba(139,92,246,0.6)",
                        fontSize: 10,
                        position: "right",
                      }}
                    />
                  )}
                  <Bar
                    dataKey="calories"
                    fill="url(#barGrad)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Goals settings */}
          <Panel>
            <div className="flex items-center justify-between mb-2">
              <SectionTitle title="Daily Goals" />
              <button
                onClick={() => setShowGoalsForm((v) => !v)}
                className={btnGhost}
              >
                {showGoalsForm ? "▲ Hide" : "▼ Edit goals"}
              </button>
            </div>

            <div className="flex gap-6 text-sm text-white/50">
              <span>
                Calories:{" "}
                <strong className="text-white/80">
                  {goals.dailyCalories ?? "—"} kcal
                </strong>
              </span>
              <span>
                Protein:{" "}
                <strong className="text-white/80">
                  {goals.dailyProteinG ?? "—"} g
                </strong>
              </span>
            </div>

            {showGoalsForm && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Daily Calorie Goal</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    placeholder="e.g. 2000"
                    value={goalCalInput}
                    onChange={(e) => setGoalCalInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Daily Protein Goal (g)</label>
                  <input
                    type="number"
                    min="0"
                    className={inputCls}
                    placeholder="e.g. 120"
                    value={goalProtInput}
                    onChange={(e) => setGoalProtInput(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <button onClick={saveGoals} className={btnPrimary}>
                    Save goals
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
