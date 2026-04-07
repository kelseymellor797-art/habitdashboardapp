export type MonthConfig = {
  label: string;
  year: number;
  month: number;   // 1-indexed (1 = January)
  daysInMonth: number;
  todayDay: number;
  startDow: number; // Mon=0 … Sun=6
};

function buildMonthConfig(): MonthConfig {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const todayDay = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
  // JS getDay(): Sun=0…Sat=6 → convert to Mon=0…Sun=6
  const jsDay = new Date(year, month - 1, 1).getDay();
  const startDow = (jsDay + 6) % 7;
  const label = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { label, year, month, daysInMonth, todayDay, startDow };
}

export const MONTH_CONFIG: MonthConfig = buildMonthConfig();
