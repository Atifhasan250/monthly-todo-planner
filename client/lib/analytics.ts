import type { Habit, HabitHistory, Week } from "./storage";
import { getLocalDateString } from "./storage";

/**
 * Comprehensive local analytics module.
 * All computations are pure functions — no side effects.
 */

// ─── Habit Analytics ───────────────────────────────────────────────

/**
 * Returns the current consecutive-day streak where ALL habits were completed.
 */
export function getCurrentStreak(habits: Habit[], history: HabitHistory): number {
  if (habits.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const allCompleted = habits.every((h) => dayHabits[h.id]);
    if (allCompleted) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

/**
 * Returns the best-ever consecutive-day streak.
 */
export function getBestStreak(habits: Habit[], history: HabitHistory): number {
  if (habits.length === 0) return 0;
  
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return 0;
  
  let bestStreak = 0;
  let currentStreak = 0;
  
  // Iterate through all dates from earliest to latest
  const earliest = new Date(dates[0] + "T00:00:00");
  const latest = new Date(dates[dates.length - 1] + "T00:00:00");
  const dayCount = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(earliest);
    date.setDate(earliest.getDate() + i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const allCompleted = habits.every((h) => dayHabits[h.id]);
    
    if (allCompleted) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  return bestStreak;
}

/**
 * Per-habit completion rate as a percentage.
 */
export function getHabitCompletionRate(
  habitId: string,
  history: HabitHistory
): number {
  const totalDays = Object.keys(history).length;
  if (totalDays === 0) return 0;
  
  const completedDays = Object.keys(history).filter(
    (date) => history[date]?.[habitId]
  ).length;
  
  return Math.round((completedDays / totalDays) * 100);
}

/**
 * Best and worst days of week for habit completion.
 * Returns { best: "Tuesday", worst: "Saturday", bestPercent, worstPercent }
 */
export function getBestWorstDays(
  habits: Habit[],
  history: HabitHistory
): { best: string; worst: string; bestPercent: number; worstPercent: number } {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayStats: { total: number; completed: number }[] = Array(7)
    .fill(null)
    .map(() => ({ total: 0, completed: 0 }));
  
  if (habits.length === 0) {
    return { best: "N/A", worst: "N/A", bestPercent: 0, worstPercent: 0 };
  }
  
  Object.keys(history).forEach((dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();
    const dayHabits = history[dateStr] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    
    dayStats[dayOfWeek].total += habits.length;
    dayStats[dayOfWeek].completed += completedCount;
  });
  
  let bestDay = 0;
  let worstDay = 0;
  let bestPercent = 0;
  let worstPercent = 100;
  
  dayStats.forEach((stat, index) => {
    if (stat.total === 0) return;
    const percent = Math.round((stat.completed / stat.total) * 100);
    if (percent >= bestPercent) {
      bestPercent = percent;
      bestDay = index;
    }
    if (percent <= worstPercent) {
      worstPercent = percent;
      worstDay = index;
    }
  });
  
  return {
    best: dayNames[bestDay],
    worst: dayNames[worstDay],
    bestPercent,
    worstPercent,
  };
}

/**
 * Lifetime total of individual habit completions.
 */
export function getTotalHabitsCompleted(history: HabitHistory): number {
  let total = 0;
  Object.values(history).forEach((dayHabits) => {
    total += Object.values(dayHabits).filter(Boolean).length;
  });
  return total;
}

/**
 * 7-day rolling average completion percentage.
 */
export function get7DayAverage(habits: Habit[], history: HabitHistory): number {
  if (habits.length === 0) return 0;
  
  const today = new Date();
  let totalPercent = 0;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    const dayHabits = history[dateStr] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    totalPercent += (completedCount / habits.length) * 100;
  }
  
  return Math.round(totalPercent / 7);
}

// ─── Task Analytics ────────────────────────────────────────────────

/**
 * Tasks completed this week vs last week.
 */
export function getWeekOverWeekComparison(weeks: Week[]): {
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
  direction: "up" | "down" | "same";
} {
  const today = new Date();
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - today.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  
  let thisWeekCount = 0;
  let lastWeekCount = 0;
  
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      if (task.completed && task.completedDate) {
        const completedDate = new Date(task.completedDate + "T00:00:00");
        if (completedDate >= startOfThisWeek) {
          thisWeekCount++;
        } else if (completedDate >= startOfLastWeek && completedDate < startOfThisWeek) {
          lastWeekCount++;
        }
      }
    });
  });
  
  const changePercent = lastWeekCount > 0
    ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
    : thisWeekCount > 0 ? 100 : 0;
  
  return {
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    changePercent: Math.abs(changePercent),
    direction: thisWeekCount > lastWeekCount ? "up" : thisWeekCount < lastWeekCount ? "down" : "same",
  };
}

// ─── Combined Analytics ────────────────────────────────────────────

/**
 * "Power Days" — days where ALL habits were done AND at least one task was completed.
 */
export function getPowerDays(
  habits: Habit[],
  history: HabitHistory,
  weeks: Week[]
): string[] {
  if (habits.length === 0) return [];
  
  const taskCompletionDates = new Set<string>();
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      if (task.completed && task.completedDate) {
        taskCompletionDates.add(task.completedDate);
      }
    });
  });
  
  const powerDays: string[] = [];
  
  Object.keys(history).forEach((dateStr) => {
    const dayHabits = history[dateStr] || {};
    const allHabitsDone = habits.every((h) => dayHabits[h.id]);
    const hasCompletedTask = taskCompletionDates.has(dateStr);
    
    if (allHabitsDone && hasCompletedTask) {
      powerDays.push(dateStr);
    }
  });
  
  return powerDays;
}

/**
 * Consistency score (0-100): measures how regularly the user engages.
 * Based on percentage of days with any activity in the last 30 days.
 */
export function getConsistencyScore(history: HabitHistory, weeks: Week[]): number {
  const today = new Date();
  let activeDays = 0;
  
  const taskCompletionDates = new Set<string>();
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      if (task.completed && task.completedDate) {
        taskCompletionDates.add(task.completedDate);
      }
    });
  });
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(date);
    
    const dayHabits = history[dateStr] || {};
    const hasHabitActivity = Object.values(dayHabits).some(Boolean);
    const hasTaskActivity = taskCompletionDates.has(dateStr);
    
    if (hasHabitActivity || hasTaskActivity) {
      activeDays++;
    }
  }
  
  return Math.round((activeDays / 30) * 100);
}

/**
 * Total active days — how many days the user has logged something.
 */
export function getTotalActiveDays(history: HabitHistory, weeks: Week[]): number {
  const activeDates = new Set<string>();
  
  Object.keys(history).forEach((dateStr) => {
    const dayHabits = history[dateStr] || {};
    if (Object.values(dayHabits).some(Boolean)) {
      activeDates.add(dateStr);
    }
  });
  
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      if (task.completed && task.completedDate) {
        activeDates.add(task.completedDate);
      }
    });
  });
  
  return activeDates.size;
}
