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
  completeAllHabitsForToday,
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
  // SECURITY 5: Add visible error state
  const [storageError, setStorageError] = useState<string | null>(null);

  const today = getLocalDateString();
  const last30Days = getLast30Days();
  const progress = calculateProgress(weeks);
  const upcomingRemindersCount = React.useMemo(() => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return reminders.filter(r => {
      if (!r.isActive) return false;
      
      const [hours, minutes] = r.time.split(':').map(Number);
      const [year, month, day] = r.date.split("-").map(Number);
      
      const reminderDateTime = new Date(year, month - 1, day, hours, minutes);
      const isSpecificFutureDate = reminderDateTime > now;
      const isDefault = r.id.startsWith("default_");

      if (!isDefault && isSpecificFutureDate) {
         // Specific future date reminder
         return true;
      }

      // Daily reminder: falls under "upcoming" if it hasn't fired yet today
      return hours > currentHours || (hours === currentHours && minutes > currentMinutes);
    }).length;
  }, [reminders]);

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
      setStorageError(null); // Clear any previous error
    } catch (error) {
      // SECURITY 5: Show visible error state
      setStorageError("Could not load your data. Please restart the app.");
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // BUG 10: Fix race condition — run setupNotifications then loadData sequentially
  useEffect(() => {
    const init = async () => {
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
          }
        }
      };
      
      await setupNotifications(); // This sets up and saves reminders
      await loadData();           // This reads the final saved state
    };
    init();
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

  // PERF 1: Memoize callbacks to prevent HabitCard re-renders
  const handleToggleHabit = useCallback(async (habitId: string) => {
    const updated = await toggleHabitForToday(habitId, getLocalDateString());
    setHabitHistory({ ...updated });
  }, []);

  const handleCompleteAllHabits = useCallback(async (habitIds: string[]) => {
    const updated = await completeAllHabitsForToday(habitIds, getLocalDateString());
    setHabitHistory({ ...updated });
  }, []);

  const handleAddHabit = useCallback(async (label: string) => {
    const updated = await addHabit(label);
    setHabits(updated);
    setNewHabitText("");
  }, []);

  const handleEditHabit = useCallback(async (habitId: string, label: string) => {
    const updated = await updateHabit(habitId, label);
    setHabits(updated);
  }, []);

  // BUG 7: Optimistic update on habit delete
  const handleDeleteHabit = useCallback(async (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId)); // Optimistic update
    await deleteHabit(habitId);
    await loadData(); // Full reload to sync history
  }, [loadData]);

  const handleToggleTask = useCallback(async (weekIndex: number, taskId: string) => {
    const updated = await toggleTaskComplete(weekIndex, taskId);
    setWeeks(updated);
  }, []);

  const handleAddTask = useCallback(async (
    weekIndex: number,
    task: { days: string; desc: string; resource?: string }
  ) => {
    const updated = await addTask(weekIndex, task);
    setWeeks(updated);
  }, []);

  const handleEditTask = useCallback(async (
    weekIndex: number,
    taskId: string,
    updates: Partial<Task>
  ) => {
    const updated = await updateTask(weekIndex, taskId, updates);
    setWeeks(updated);
  }, []);

  const handleDeleteTask = useCallback(async (weekIndex: number, taskId: string) => {
    const updated = await deleteTask(weekIndex, taskId);
    setWeeks(updated);
  }, []);

  const handleAddReminder = useCallback(async (reminder: Omit<Reminder, "id">) => {
    const updated = await addReminder(reminder);
    setReminders(updated);
  }, []);

  const handleUpdateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    const updated = await updateReminder(id, updates);
    setReminders(updated);
  }, []);

  const handleDeleteReminder = useCallback(async (id: string) => {
    const updated = await deleteReminder(id);
    setReminders(updated);
  }, []);

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
      {/* SECURITY 5: Error banner */}
      {storageError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={16} color="#fff" />
          <ThemedText style={styles.errorBannerText}>{storageError}</ThemedText>
          <Pressable onPress={() => { setStorageError(null); loadData(); }} style={styles.retryBtn}>
            <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
          </Pressable>
        </View>
      )}

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
        onCompleteAllHabits={handleCompleteAllHabits}
        onEditHabit={handleEditHabit}
        onDeleteHabit={handleDeleteHabit}
        onAddHabit={handleAddHabit}
        newHabitText={newHabitText}
        onNewHabitTextChange={setNewHabitText}
        onOpenReminders={() => setShowReminderModal(true)}
        reminderCount={upcomingRemindersCount}
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
  // SECURITY 5: Error banner styles
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.danger,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorBannerText: {
    color: "#fff",
    fontSize: 13,
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
