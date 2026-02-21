import React, { useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import {
  getHabits,
  getHabitHistory,
  getWeeks,
  calculateProgress,
  type Habit,
  type HabitHistory,
  type Week,
} from "@/lib/storage";

type FilterType = "all" | "tasks" | "habits";

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitHistory, setHabitHistory] = useState<HabitHistory>({});
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const [habitsData, historyData, weeksData] = await Promise.all([
        getHabits(),
        getHabitHistory(),
        getWeeks(),
      ]);
      setHabits(habitsData);
      setHabitHistory(historyData);
      setWeeks(weeksData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonthDate);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonthDate(newMonth);
  };

  const currentMonthLabel = currentMonthDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const getDaysInMonth = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: getDateString(prevDate),
        day: prevDate.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({
        date: getDateString(date),
        day: d,
        isCurrentMonth: true,
      });
    }

    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({
        date: getDateString(nextDate),
        day: nextDate.getDate(),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDayIndicators = (date: string) => {
    const dayHabits = habitHistory[date] || {};
    const hasHabits = Object.values(dayHabits).some(Boolean);

    const hasCompletedTasks = weeks.some((week) =>
      week.tasks.some((task) => task.completed && task.completedDate === date)
    );

    return {
      hasHabits,
      hasTasks: hasCompletedTasks,
    };
  };

  const getSelectedDayDetails = () => {
    if (!selectedDate) return null;

    const dayHabits = habitHistory[selectedDate] || {};
    const completedHabits = habits.filter((h) => dayHabits[h.id]);
    const completedTasks = weeks.flatMap((week) =>
      week.tasks.filter((task) => task.completed && task.completedDate === selectedDate)
    );

    return {
      date: selectedDate,
      completedHabits,
      completedTasks,
    };
  };

  const days = getDaysInMonth();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedDetails = getSelectedDayDetails();
  const hasAnyData = Object.keys(habitHistory).length > 0 || weeks.some((w) => w.tasks.some((t) => t.completed));
  const overallProgress = calculateProgress(weeks);

  const getWeekProgress = (weekIndex: number) => {
    const week = weeks[weekIndex];
    if (!week) return { completed: 0, total: 0, percent: 0 };
    const total = week.tasks.length;
    const completed = week.tasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  };

  const getHabitProgress = () => {
    const totalDays = Object.keys(habitHistory).length;
    if (totalDays === 0 || habits.length === 0) return 0;
    
    let totalCompleted = 0;
    Object.values(habitHistory).forEach((dayHabits) => {
      totalCompleted += Object.values(dayHabits).filter(Boolean).length;
    });
    
    return Math.round((totalCompleted / (totalDays * habits.length)) * 100);
  };

  const getLast7Days = () => {
    const days: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(getDateString(date));
    }
    return days;
  };

  const getDailyHabitProgress = (date: string) => {
    if (habits.length === 0) return 0;
    const dayHabits = habitHistory[date] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    return Math.round((completedCount / habits.length) * 100);
  };

  const getHabitStreak = () => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = getDateString(date);
      const dayHabits = habitHistory[dateStr] || {};
      const allCompleted = habits.length > 0 && habits.every((h) => dayHabits[h.id]);
      if (allCompleted) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const getTotalHabitsCompleted = () => {
    let total = 0;
    Object.values(habitHistory).forEach((dayHabits) => {
      total += Object.values(dayHabits).filter(Boolean).length;
    });
    return total;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  const getDayName = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
  };

  const getFormattedDate = (date: string) => {
    const d = new Date(date + "T00:00:00");
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
    return `${dayName}, ${day} ${month}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={AppColors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={AppColors.primary} />
          </Pressable>
          <ThemedText style={styles.monthTitle}>{currentMonthLabel}</ThemedText>
          <Pressable onPress={() => changeMonth(1)} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={24} color={AppColors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["all", "tasks", "habits"] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                filter === f && styles.filterChipTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: AppColors.primary }]} />
          <ThemedText style={styles.legendText}>Tasks</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: AppColors.secondary }]} />
          <ThemedText style={styles.legendText}>Habits</ThemedText>
        </View>
      </View>

      {hasAnyData ? (
        <>
          {filter === "habits" ? (
            <View style={[styles.graphCard, { borderColor: AppColors.secondary }]}>
              <ThemedText style={[styles.graphTitle, { color: AppColors.secondary }]}>
                Daily Habit Progress (Last 7 Days)
              </ThemedText>
              <View style={styles.graphContainer}>
                {getLast7Days().map((date) => {
                  const progress = getDailyHabitProgress(date);
                  const dayName = new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
                  return (
                    <View key={date} style={styles.graphBarWrapper}>
                      <View style={styles.graphBar}>
                        <View
                          style={[
                            styles.graphBarFill,
                            { height: `${progress}%`, backgroundColor: AppColors.secondary },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.graphBarLabel}>{new Date(date + "T00:00:00").getDate()}</ThemedText>
                      <ThemedText style={styles.graphBarPercent}>{progress}%</ThemedText>
                    </View>
                  );
                })}
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText style={[styles.summaryValue, { color: AppColors.secondary }]}>
                    {getHabitStreak()}
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>Day Streak</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={[styles.summaryValue, { color: AppColors.secondary }]}>
                    {getHabitProgress()}%
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>Average</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={[styles.summaryValue, { color: AppColors.secondary }]}>
                    {getTotalHabitsCompleted()}
                  </ThemedText>
                  <ThemedText style={styles.summaryLabel}>Total Done</ThemedText>
                </View>
              </View>

              {habits.length > 0 ? (
                <View style={styles.habitListSection}>
                  <ThemedText style={styles.habitListTitle}>Your Habits</ThemedText>
                  {habits.map((habit) => {
                    const completedDays = Object.keys(habitHistory).filter(
                      (date) => habitHistory[date]?.[habit.id]
                    ).length;
                    const totalDays = Object.keys(habitHistory).length || 1;
                    const habitPercent = Math.round((completedDays / totalDays) * 100);
                    return (
                      <View key={habit.id} style={styles.habitListItem}>
                        <View style={styles.habitListInfo}>
                          <Ionicons name="flash" size={16} color={AppColors.secondary} />
                          <ThemedText style={styles.habitListLabel}>{habit.label}</ThemedText>
                        </View>
                        <View style={styles.habitProgressBar}>
                          <View
                            style={[
                              styles.habitProgressFill,
                              { width: `${habitPercent}%` },
                            ]}
                          />
                        </View>
                        <ThemedText style={styles.habitListPercent}>{habitPercent}%</ThemedText>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : filter === "tasks" ? (
            <View style={styles.graphCard}>
              <ThemedText style={styles.graphTitle}>Monthly Task Completion</ThemedText>
              <View style={styles.graphContainer}>
                {weeks.map((week, index) => {
                  const progress = getWeekProgress(index);
                  return (
                    <View key={week.week} style={styles.graphBarWrapper}>
                      <View style={styles.graphBar}>
                        <View
                          style={[
                            styles.graphBarFill,
                            { height: `${progress.percent}%` },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.graphBarLabel}>W{week.week}</ThemedText>
                      <ThemedText style={styles.graphBarPercent}>{progress.percent}%</ThemedText>
                    </View>
                  );
                })}
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{overallProgress.completed}/{overallProgress.total}</ThemedText>
                  <ThemedText style={styles.summaryLabel}>Tasks Done</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{overallProgress.percent}%</ThemedText>
                  <ThemedText style={styles.summaryLabel}>Overall</ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.graphCard}>
              <ThemedText style={styles.graphTitle}>Monthly Task Completion</ThemedText>
              <View style={styles.graphContainer}>
                {weeks.map((week, index) => {
                  const progress = getWeekProgress(index);
                  return (
                    <View key={week.week} style={styles.graphBarWrapper}>
                      <View style={styles.graphBar}>
                        <View
                          style={[
                            styles.graphBarFill,
                            { height: `${progress.percent}%` },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.graphBarLabel}>W{week.week}</ThemedText>
                      <ThemedText style={styles.graphBarPercent}>{progress.percent}%</ThemedText>
                    </View>
                  );
                })}
              </View>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{overallProgress.completed}/{overallProgress.total}</ThemedText>
                  <ThemedText style={styles.summaryLabel}>Tasks Done</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{overallProgress.percent}%</ThemedText>
                  <ThemedText style={styles.summaryLabel}>Overall</ThemedText>
                </View>
                <View style={styles.summaryItem}>
                  <ThemedText style={styles.summaryValue}>{getHabitProgress()}%</ThemedText>
                  <ThemedText style={styles.summaryLabel}>Habits Avg</ThemedText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.calendarCard}>
            <View style={styles.weekHeader}>
              {weekDays.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <ThemedText style={styles.weekDayText}>{day}</ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {days.map((day, index) => {
                const indicators = getDayIndicators(day.date);
                const showTask = filter === "all" || filter === "tasks";
                const showHabit = filter === "all" || filter === "habits";
                const isToday =
                  day.date === getDateString(new Date()) && day.isCurrentMonth;
                const isSelected = selectedDate === day.date;

                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.calendarDay,
                      !day.isCurrentMonth && styles.calendarDayFaded,
                      isToday && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected,
                    ]}
                    onPress={() => setSelectedDate(day.date)}
                  >
                    <ThemedText
                      style={[
                        styles.dayNumber,
                        !day.isCurrentMonth && styles.dayNumberFaded,
                        isToday && styles.dayNumberToday,
                      ]}
                    >
                      {day.day}
                    </ThemedText>
                    <View style={styles.indicatorRow}>
                      {showTask && indicators.hasTasks ? (
                        <View
                          style={[
                            styles.indicator,
                            { backgroundColor: AppColors.primary },
                          ]}
                        />
                      ) : null}
                      {showHabit && indicators.hasHabits ? (
                        <View
                          style={[
                            styles.indicator,
                            { backgroundColor: AppColors.secondary },
                          ]}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {selectedDetails ? (
            <View style={styles.detailsCard}>
              <ThemedText style={styles.detailsTitle}>
                {new Date(selectedDetails.date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </ThemedText>

              {selectedDetails.completedHabits.length > 0 ? (
                <View style={styles.detailsSection}>
                  <ThemedText style={styles.detailsSectionTitle}>
                    <Ionicons name="flash" size={14} color={AppColors.secondary} /> Habits
                    Completed
                  </ThemedText>
                  {selectedDetails.completedHabits.map((habit) => (
                    <View key={habit.id} style={styles.detailItem}>
                      <Ionicons name="checkmark" size={14} color={AppColors.secondary} />
                      <ThemedText style={styles.detailItemText}>
                        {habit.label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedDetails.completedTasks.length > 0 ? (
                <View style={styles.detailsSection}>
                  <ThemedText style={styles.detailsSectionTitle}>
                    <Ionicons name="checkbox" size={14} color={AppColors.primary} />{" "}
                    Tasks Completed
                  </ThemedText>
                  {selectedDetails.completedTasks.map((task) => (
                    <View key={task.id} style={styles.detailItem}>
                      <Ionicons name="checkmark" size={14} color={AppColors.primary} />
                      <ThemedText style={styles.detailItemText}>
                        {task.desc}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedDetails.completedHabits.length === 0 &&
              selectedDetails.completedTasks.length === 0 ? (
                <ThemedText style={styles.noDataText}>
                  No completed items on this day
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Image
            source={require("../../assets/images/empty-history.png")}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>No History Yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Start tracking to see your progress
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: AppColors.textSecondary,
  },
  monthTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AppColors.textPrimary,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  navBtn: {
    padding: Spacing.xs,
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: AppColors.textSecondary,
  },
  calendarCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 11,
    color: AppColors.textSecondary,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },
  calendarDayFaded: {
    opacity: 0.3,
  },
  calendarDayToday: {
    backgroundColor: "rgba(16,185,129,0.2)",
    borderRadius: BorderRadius.xs,
  },
  calendarDaySelected: {
    backgroundColor: "rgba(139,92,246,0.3)",
    borderRadius: BorderRadius.xs,
  },
  dayNumber: {
    fontSize: 14,
    color: AppColors.textPrimary,
    fontWeight: "500",
  },
  dayNumberFaded: {
    color: AppColors.textSecondary,
  },
  dayNumberToday: {
    color: AppColors.primary,
    fontWeight: "700",
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  detailsCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: Spacing.md,
  },
  detailsSection: {
    marginBottom: Spacing.md,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  detailItemText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  noDataText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: Spacing.lg,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  graphCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: AppColors.primary,
    marginBottom: Spacing.lg,
  },
  graphContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    marginBottom: Spacing.lg,
  },
  graphBarWrapper: {
    alignItems: "center",
    flex: 1,
  },
  graphBar: {
    width: 20,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  graphBarFill: {
    width: "100%",
    backgroundColor: AppColors.primary,
    borderRadius: 4,
  },
  graphBarLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginTop: 6,
    textAlign: "center",
    width: "100%",
  },
  graphBarPercent: {
    fontSize: 10,
    color: AppColors.textSecondary,
    marginTop: 2,
    textAlign: "center",
    width: "100%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  habitListSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  habitListTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
  },
  habitListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  habitListInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  habitListLabel: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  habitProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  habitProgressFill: {
    height: "100%",
    backgroundColor: AppColors.secondary,
    borderRadius: 4,
  },
  habitListPercent: {
    fontSize: 12,
    fontWeight: "600",
    color: AppColors.secondary,
    width: 40,
    textAlign: "right",
  },
});
