import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ProgressBar } from "@/components/ProgressBar";
import { HabitCard } from "@/components/HabitCard";
import { WeekCard } from "@/components/WeekCard";
import { ReminderModal } from "@/components/ReminderModal";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import {
  getHabits,
  getHabitHistory,
  getWeeks,
  getReminders,
  addReminder,
  updateReminder,
  deleteReminder,
  toggleHabitForToday,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleTaskComplete,
  addTask,
  updateTask,
  deleteTask,
  getLocalDateString,
  getLast30Days,
  calculateProgress,
  type Habit,
  type HabitHistory,
  type Week,
  type Task,
  type Reminder,
} from "@/lib/storage";
import { requestNotificationPermission, scheduleReminderNotification } from "@/lib/notifications";

const TAG_DISMISSED_KEY = "monthly_todo_tag_dismissed";

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitHistory, setHabitHistory] = useState<HabitHistory>({});
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newHabitText, setNewHabitText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [tagDismissed, setTagDismissed] = useState(false);

  const today = getLocalDateString();
  const last30Days = getLast30Days();
  const progress = calculateProgress(weeks);
  const activeReminders = reminders.filter((r) => r.isActive);

  const loadData = useCallback(async () => {
    try {
      const [habitsData, historyData, weeksData, remindersData, dismissed] = await Promise.all([
        getHabits(),
        getHabitHistory(),
        getWeeks(),
        getReminders(),
        AsyncStorage.getItem(TAG_DISMISSED_KEY),
      ]);
      setHabits(habitsData);
      setHabitHistory(historyData);
      setWeeks(weeksData);
      setReminders(remindersData);
      setTagDismissed(dismissed === "true");
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const { getReminderSettings, getDefaultReminders, getReminders, saveReminders } = await import("@/lib/storage");
        const settings = await getReminderSettings();
        const existingReminders = await getReminders();
        
        if (settings.useDefault && existingReminders.length === 0) {
          const defaults = await getDefaultReminders();
          const scheduled = [];
          for (const r of defaults) {
            const id = await scheduleReminderNotification(r);
            scheduled.push({ ...r, notificationId: id || undefined });
          }
          await saveReminders(scheduled);
          setReminders(scheduled);
        } else {
          setReminders(existingReminders);
        }
      }
    };
    setupNotifications();
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDismissTag = async () => {
    await AsyncStorage.setItem(TAG_DISMISSED_KEY, "true");
    setTagDismissed(true);
  };

  const handleToggleHabit = async (habitId: string) => {
    const updated = await toggleHabitForToday(habitId, today);
    setHabitHistory({ ...updated });
  };

  const handleAddHabit = async (label: string) => {
    const updated = await addHabit(label);
    setHabits(updated);
    setNewHabitText("");
  };

  const handleEditHabit = async (habitId: string, label: string) => {
    const updated = await updateHabit(habitId, label);
    setHabits(updated);
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit(habitId);
    // Reload all data to ensure history and habits are in sync
    await loadData();
  };

  const handleToggleTask = async (weekIndex: number, taskId: string) => {
    const updated = await toggleTaskComplete(weekIndex, taskId);
    setWeeks(updated);
  };

  const handleAddTask = async (
    weekIndex: number,
    task: { days: string; desc: string; resource?: string }
  ) => {
    const updated = await addTask(weekIndex, task);
    setWeeks(updated);
  };

  const handleEditTask = async (
    weekIndex: number,
    taskId: string,
    updates: Partial<Task>
  ) => {
    const updated = await updateTask(weekIndex, taskId, updates);
    setWeeks(updated);
  };

  const handleDeleteTask = async (weekIndex: number, taskId: string) => {
    const updated = await deleteTask(weekIndex, taskId);
    setWeeks(updated);
  };

  const handleAddReminder = async (reminder: Omit<Reminder, "id">) => {
    const updated = await addReminder(reminder);
    setReminders(updated);
  };

  const handleUpdateReminder = async (id: string, updates: Partial<Reminder>) => {
    const updated = await updateReminder(id, updates);
    setReminders(updated);
  };

  const handleDeleteReminder = async (id: string) => {
    const updated = await deleteReminder(id);
    setReminders(updated);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  const hasData = weeks.length > 0 || habits.length > 0;

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
      {!tagDismissed && (
        <View style={styles.infoTag}>
          <View style={styles.infoTagContent}>
            <Ionicons name="information-circle" size={16} color="#fff" />
            <ThemedText style={styles.infoTagText}>You can edit the tasks as you want.</ThemedText>
          </View>
          <Pressable onPress={handleDismissTag} style={styles.dismissBtn}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      )}

      <ProgressBar
        percent={progress.percent}
        completed={progress.completed}
        total={progress.total}
      />

      <HabitCard
        habits={habits}
        history={habitHistory}
        today={today}
        last30Days={last30Days}
        onToggleHabit={handleToggleHabit}
        onEditHabit={handleEditHabit}
        onDeleteHabit={handleDeleteHabit}
        onAddHabit={handleAddHabit}
        newHabitText={newHabitText}
        onNewHabitTextChange={setNewHabitText}
        onOpenReminders={() => setShowReminderModal(true)}
        reminderCount={activeReminders.length}
      />

      <ReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        reminders={reminders}
        onAddReminder={handleAddReminder}
        onUpdateReminder={handleUpdateReminder}
        onDeleteReminder={handleDeleteReminder}
      />

      {hasData ? (
        weeks.map((week, index) => (
          <WeekCard
            key={week.week}
            week={week}
            weekIndex={index}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Image
            source={require("../../assets/images/empty-tasks.png")}
            style={styles.emptyImage}
            contentFit="contain"
          />
          <ThemedText style={styles.emptyTitle}>No Tasks Yet</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Your weekly tasks will appear here
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
  infoTag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppColors.secondary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  infoTagContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  dismissBtn: {
    padding: 4,
  },
});
