import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Habit {
  id: string;
  label: string;
}

export interface Task {
  id: string;
  days: string;
  desc: string;
  resource?: string;
  completed: boolean;
  completedDate?: string;
}

export interface Week {
  week: number;
  title: string;
  tasks: Task[];
}

export interface HabitHistory {
  [date: string]: {
    [habitId: string]: boolean;
  };
}

export interface Reminder {
  id: string;
  message: string;
  date: string;
  time: string;
  notificationId?: string;
  isActive: boolean;
  isAlarm?: boolean;
}

export interface ReminderSettings {
  useDefault: boolean;
  customReminders: Reminder[];
}

const STORAGE_KEYS = {
  HABITS: "monthly_todo_habits",
  HABIT_HISTORY: "monthly_todo_habit_history",
  WEEKS: "monthly_todo_weeks",
  TASK_PROGRESS: "monthly_todo_task_progress",
  REMINDERS: "monthly_todo_reminders",
  REMINDER_SETTINGS: "monthly_todo_reminder_settings",
};

const defaultHabits: Habit[] = [
  { id: "habit_1", label: "Morning routine" },
  { id: "habit_2", label: "Read 30 minutes" },
  { id: "habit_3", label: "Exercise" },
  { id: "habit_4", label: "Learn something new" },
];

const defaultWeeks: Week[] = [
  {
    week: 1,
    title: "Week 1",
    tasks: [
      { id: "t1", days: "Days 1-3", desc: "Set up your workspace and tools", completed: false },
      { id: "t2", days: "Days 4-7", desc: "Create your daily schedule", completed: false },
    ],
  },
  {
    week: 2,
    title: "Week 2",
    tasks: [
      { id: "t3", days: "Days 8-10", desc: "Focus on core habits", completed: false },
      { id: "t4", days: "Days 11-14", desc: "Track and adjust your progress", completed: false },
    ],
  },
  {
    week: 3,
    title: "Week 3",
    tasks: [
      { id: "t5", days: "Days 15-18", desc: "Increase focus time blocks", completed: false },
      { id: "t6", days: "Days 19-21", desc: "Minimize distractions", completed: false },
    ],
  },
  {
    week: 4,
    title: "Week 4",
    tasks: [
      { id: "t7", days: "Days 22-25", desc: "Maintain your streak", completed: false },
      { id: "t8", days: "Days 26-28", desc: "Review and celebrate wins", completed: false },
      { id: "t9", days: "Days 29-30", desc: "Plan for the next month", completed: false },
    ],
  },
];

export async function getHabits(): Promise<Habit[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
    if (data) {
      return JSON.parse(data);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(defaultHabits));
    return defaultHabits;
  } catch {
    return defaultHabits;
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

export async function addHabit(label: string): Promise<Habit[]> {
  const habits = await getHabits();
  const newHabit: Habit = {
    id: `habit_${Date.now()}`,
    label,
  };
  const updated = [...habits, newHabit];
  await saveHabits(updated);
  return updated;
}

export async function deleteHabit(habitId: string): Promise<Habit[]> {
  const habits = await getHabits();
  const history = await getHabitHistory();
  
  // Update habits list
  const updatedHabits = habits.filter((h) => h.id !== habitId);
  await saveHabits(updatedHabits);
  
  // Clean up history
  const updatedHistory = { ...history };
  Object.keys(updatedHistory).forEach(date => {
    if (updatedHistory[date][habitId] !== undefined) {
      delete updatedHistory[date][habitId];
      // If no habits left for this date, optionally delete the date entry
      if (Object.keys(updatedHistory[date]).length === 0) {
        delete updatedHistory[date];
      }
    }
  });
  await saveHabitHistory(updatedHistory);
  
  return updatedHabits;
}

export async function getHabitHistory(): Promise<HabitHistory> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HABIT_HISTORY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function saveHabitHistory(history: HabitHistory): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.HABIT_HISTORY, JSON.stringify(history));
}

export async function toggleHabitForToday(habitId: string, date: string): Promise<HabitHistory> {
  const history = await getHabitHistory();
  if (!history[date]) {
    history[date] = {};
  }
  history[date][habitId] = !history[date][habitId];
  await saveHabitHistory(history);
  return history;
}

export async function getWeeks(): Promise<Week[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKS);
    if (data) {
      return JSON.parse(data);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(defaultWeeks));
    return defaultWeeks;
  } catch {
    return defaultWeeks;
  }
}

export async function saveWeeks(weeks: Week[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(weeks));
}

export async function toggleTaskComplete(weekIndex: number, taskId: string): Promise<Week[]> {
  const weeks = await getWeeks();
  const task = weeks[weekIndex]?.tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    task.completedDate = task.completed ? getLocalDateString() : undefined;
    await saveWeeks(weeks);
  }
  return weeks;
}

export async function addTask(
  weekIndex: number,
  task: Omit<Task, "id" | "completed">
): Promise<Week[]> {
  const weeks = await getWeeks();
  if (!weeks[weekIndex]) return weeks;
  const newTask: Task = {
    ...task,
    id: `t${Date.now()}`,
    completed: false,
  };
  weeks[weekIndex].tasks = [...weeks[weekIndex].tasks, newTask];
  await saveWeeks(weeks);
  return weeks;
}

export async function updateTask(
  weekIndex: number,
  taskId: string,
  updates: Partial<Omit<Task, "id">>
): Promise<Week[]> {
  const weeks = await getWeeks();
  if (!weeks[weekIndex]) return weeks;
  const taskIndex = weeks[weekIndex].tasks.findIndex((t) => t.id === taskId);
  if (taskIndex !== -1) {
    weeks[weekIndex].tasks[taskIndex] = { ...weeks[weekIndex].tasks[taskIndex], ...updates };
    await saveWeeks(weeks);
  }
  return weeks;
}

export async function deleteTask(weekIndex: number, taskId: string): Promise<Week[]> {
  const weeks = await getWeeks();
  weeks[weekIndex].tasks = weeks[weekIndex].tasks.filter((t) => t.id !== taskId);
  await saveWeeks(weeks);
  return weeks;
}

export async function renameWeek(weekIndex: number, title: string): Promise<Week[]> {
  const weeks = await getWeeks();
  if (weeks[weekIndex]) {
    weeks[weekIndex].title = title;
    await saveWeeks(weeks);
  }
  return weeks;
}

export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.HABITS,
    STORAGE_KEYS.HABIT_HISTORY,
    STORAGE_KEYS.WEEKS,
    STORAGE_KEYS.TASK_PROGRESS,
    STORAGE_KEYS.REMINDERS,
    STORAGE_KEYS.REMINDER_SETTINGS,
  ]);
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLast30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(getLocalDateString(date));
  }
  return dates;
}

export function calculateProgress(weeks: Week[]): { completed: number; total: number; percent: number } {
  let completed = 0;
  let total = 0;
  weeks.forEach((week) => {
    week.tasks.forEach((task) => {
      total++;
      if (task.completed) completed++;
    });
  });
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}

export async function getReminders(): Promise<Reminder[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
}

export async function addReminder(reminder: Omit<Reminder, "id">): Promise<Reminder[]> {
  const reminders = await getReminders();
  const newReminder: Reminder = {
    ...reminder,
    id: `reminder_${Date.now()}`,
  };
  const updated = [...reminders, newReminder];
  await saveReminders(updated);
  return updated;
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<Reminder[]> {
  const reminders = await getReminders();
  const index = reminders.findIndex((r) => r.id === reminderId);
  if (index !== -1) {
    reminders[index] = { ...reminders[index], ...updates };
    await saveReminders(reminders);
  }
  return reminders;
}

export async function deleteReminder(reminderId: string): Promise<Reminder[]> {
  const reminders = await getReminders();
  const updated = reminders.filter((r) => r.id !== reminderId);
  await saveReminders(updated);
  return updated;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REMINDER_SETTINGS);
    return data ? JSON.parse(data) : { useDefault: true, customReminders: [] };
  } catch {
    return { useDefault: true, customReminders: [] };
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.REMINDER_SETTINGS, JSON.stringify(settings));
}

export async function updateHabit(habitId: string, label: string): Promise<Habit[]> {
  const habits = await getHabits();
  const index = habits.findIndex((h) => h.id === habitId);
  if (index !== -1) {
    habits[index].label = label;
    await saveHabits(habits);
  }
  return habits;
}

export const getDefaultReminders = (): Reminder[] => {
  const today = getLocalDateString();
  return [
    {
      id: "default_6am",
      message: "You haven't done your tasks today. Wake up and start your day.",
      date: today,
      time: "06:00",
      isActive: true,
    },
    {
      id: "default_10pm",
      message: "Have you done all of your tasks today?",
      date: today,
      time: "22:00",
      isActive: true,
    },
  ];
};

