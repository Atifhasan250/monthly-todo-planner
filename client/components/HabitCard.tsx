import React from "react";
import { View, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { RealTimeClock } from "@/components/RealTimeClock";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Habit, HabitHistory } from "@/lib/storage";

interface HabitCardProps {
  habits: Habit[];
  history: HabitHistory;
  today: string;
  last30Days: string[];
  onToggleHabit: (habitId: string) => void;
  onEditHabit: (habitId: string, label: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onAddHabit: (label: string) => void;
  newHabitText: string;
  onNewHabitTextChange: (text: string) => void;
  onOpenReminders: () => void;
  reminderCount: number;
}

export function HabitCard({
  habits,
  history,
  today,
  last30Days,
  onToggleHabit,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
  newHabitText,
  onNewHabitTextChange,
  onOpenReminders,
  reminderCount,
}: HabitCardProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const todayHabits = history[today] || {};

  const handleToggle = async (habitId: string) => {
    if (editingId) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleHabit(habitId);
  };

  const handleAdd = async () => {
    if (newHabitText.trim()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAddHabit(newHabitText.trim());
    }
  };

  const handleStartEdit = (habit: Habit) => {
    setEditingId(habit.id);
    setEditText(habit.label);
  };

  const handleSaveEdit = async () => {
    if (editingId && editText.trim()) {
      onEditHabit(editingId, editText.trim());
      setEditingId(null);
      setEditText("");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getDayProgress = (date: string): number => {
    if (habits.length === 0) return 0;
    const dayHabits = history[date] || {};
    const completedCount = Object.values(dayHabits).filter(Boolean).length;
    return Math.round((completedCount / habits.length) * 100);
  };

  const getDateLabel = (dateString: string): string => {
    // Add time component to avoid timezone shifts
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate().toString();
  };

  const getFullDateLabel = (dateString: string): string => {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    return `${dayName}, ${day} ${monthName}`;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Add padding for start of month
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: d, dateStr });
    }

    // Add padding for end of month to make it a full grid if needed
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  const monthDays = getMonthDays(currentMonth);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="flash" size={18} color={AppColors.secondary} />
          <ThemedText style={styles.title}>Daily Habits</ThemedText>
        </View>
        <ThemedText style={styles.date}>{getFullDateLabel(today)}</ThemedText>
      </View>

      <RealTimeClock />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a new habit..."
          placeholderTextColor={AppColors.textSecondary}
          value={newHabitText}
          onChangeText={onNewHabitTextChange}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={handleAdd}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.reminderButton, pressed && styles.pressed]}
        onPress={onOpenReminders}
      >
        <Ionicons name="notifications-outline" size={18} color={AppColors.secondary} />
        <ThemedText style={styles.reminderButtonText}>Set Reminders</ThemedText>
        {reminderCount > 0 ? (
          <View style={styles.reminderBadge}>
            <ThemedText style={styles.reminderBadgeText}>{reminderCount}</ThemedText>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.habitsList}>
        {habits.map((habit) => {
          const isChecked = todayHabits[habit.id] || false;
          const isEditing = editingId === habit.id;

          return (
            <Pressable
              key={habit.id}
              style={({ pressed }) => [
                styles.habitItem,
                pressed && !isEditing && styles.pressed
              ]}
              onPress={() => handleToggle(habit.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  isChecked && styles.checkboxChecked,
                ]}
              >
                {isChecked ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  onBlur={handleSaveEdit}
                  onSubmitEditing={handleSaveEdit}
                  autoFocus
                />
              ) : (
                <ThemedText
                  style={[styles.habitLabel, isChecked && styles.habitLabelChecked]}
                  numberOfLines={1}
                >
                  {habit.label}
                </ThemedText>
              )}
              <View style={styles.habitActions}>
                {!isEditing && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleStartEdit(habit);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="pencil" size={16} color={AppColors.textSecondary} />
                  </Pressable>
                )}
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDeleteHabit(habit.id);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={AppColors.textSecondary} />
                </Pressable>
              </View>
            </Pressable>
          );
        })}
        {habits.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No habits yet. Add one above!
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.streakSection}>
        <ThemedText style={styles.streakTitle}>
          Habit History
        </ThemedText>
        <View style={styles.streakGrid}>
          {monthDays.map((dayObj, index) => {
            if (!dayObj) return <View key={`empty-${index}`} style={styles.streakDayPlaceholder} />;
            
            const { dateStr, date: d } = dayObj;
            const percent = getDayProgress(dateStr);
            const isToday = dateStr === today;
            const isCurrentMonth = d.getMonth() === currentMonth.getMonth();

            return (
              <View key={dateStr} style={styles.streakDayWrapper}>
                <View
                  style={[
                    styles.streakDay,
                    isToday && styles.streakDayToday,
                    !isCurrentMonth && styles.streakDayOtherMonth,
                  ]}
                >
                  <View
                    style={[
                      styles.streakFill,
                      { height: `${percent}%` },
                    ]}
                  />
                  <ThemedText style={styles.streakDayText}>
                    {d.getDate()}
                  </ThemedText>
                  {percent > 0 && (
                    <View style={styles.dot} />
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.legendBar}>
              <View style={[styles.legendFill, { height: "25%" }]} />
            </View>
            <ThemedText style={styles.legendText}>25%</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendBar}>
              <View style={[styles.legendFill, { height: "50%" }]} />
            </View>
            <ThemedText style={styles.legendText}>50%</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendBar}>
              <View style={[styles.legendFill, { height: "75%" }]} />
            </View>
            <ThemedText style={styles.legendText}>75%</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendBar}>
              <View style={[styles.legendFill, { height: "100%" }]} />
            </View>
            <ThemedText style={styles.legendText}>100%</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.secondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  date: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: "700",
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  monthLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.textPrimary,
    minWidth: 80,
    textAlign: 'center',
  },
  navBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139,92,246,0.2)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: AppColors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  addButton: {
    backgroundColor: AppColors.secondary,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  habitsList: {
    gap: Spacing.sm,
  },
  habitItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139,92,246,0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.textSecondary,
    marginRight: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: AppColors.secondary,
    borderColor: AppColors.secondary,
  },
  habitLabel: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  habitLabelChecked: {
    textDecorationLine: "line-through",
    color: AppColors.textSecondary,
  },
  habitActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  actionBtn: {
    padding: Spacing.xs,
  },
  editInput: {
    flex: 1,
    fontSize: 14,
    color: AppColors.textPrimary,
    padding: 0,
    margin: 0,
  },
  emptyText: {
    textAlign: "center",
    color: AppColors.textSecondary,
    fontSize: 14,
    paddingVertical: Spacing.lg,
  },
  streakSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  streakTitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
  },
  streakGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: 'space-between',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  calendarDayHeader: {
    fontSize: 10,
    color: AppColors.textSecondary,
    width: 32,
    textAlign: 'center',
  },
  streakDayPlaceholder: {
    width: '12%',
    height: 36,
  },
  streakDayWrapper: {
    width: '12%',
    alignItems: "center",
  },
  streakDay: {
    width: '100%',
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: 'transparent',
  },
  streakFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  streakDayToday: {
    borderColor: AppColors.primary,
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  streakDayOtherMonth: {
    opacity: 0.3,
  },
  streakDayText: {
    fontSize: 11,
    fontWeight: "600",
    color: AppColors.textPrimary,
    zIndex: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppColors.secondary,
    position: 'absolute',
    bottom: 4,
    zIndex: 2,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendBar: {
    width: 12,
    height: 20,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  legendFill: {
    width: "100%",
    backgroundColor: AppColors.secondary,
  },
  legendText: {
    fontSize: 10,
    color: AppColors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  reminderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(139,92,246,0.15)",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
  },
  reminderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.secondary,
  },
  reminderBadge: {
    backgroundColor: AppColors.secondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  reminderBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
});
