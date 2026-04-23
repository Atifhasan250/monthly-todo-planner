import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Week, Task } from "@/lib/storage";

interface WeekCardProps {
  week: Week;
  weekIndex: number;
  onToggleTask: (weekIndex: number, taskId: string) => void;
  onAddTask: (weekIndex: number, task: { days: string; desc: string; resource?: string }) => void;
  onEditTask: (weekIndex: number, taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (weekIndex: number, taskId: string) => void;
}

export function WeekCard({
  week,
  weekIndex,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: WeekCardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ days: "", desc: "", resource: "" });

  const handleToggle = async (taskId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleTask(weekIndex, taskId);
  };

  const handleAddTask = async () => {
    if (taskForm.desc.trim()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAddTask(weekIndex, {
        days: taskForm.days.slice(0, 50) || `Day ${week.tasks.length + 1}`, // SECURITY 1: limit
        desc: taskForm.desc.slice(0, 500), // SECURITY 1: limit
        resource: taskForm.resource ? taskForm.resource.slice(0, 500) : undefined, // SECURITY 1: limit
      });
      setTaskForm({ days: "", desc: "", resource: "" });
      setShowAddModal(false);
    }
  };

  const handleEditTask = async () => {
    if (editingTask && taskForm.desc.trim()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onEditTask(weekIndex, editingTask.id, {
        days: taskForm.days.slice(0, 50), // SECURITY 1: limit
        desc: taskForm.desc.slice(0, 500), // SECURITY 1: limit
        resource: taskForm.resource ? taskForm.resource.slice(0, 500) : undefined, // SECURITY 1: limit
      });
      setShowEditModal(false);
      setEditingTask(null);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({ days: task.days, desc: task.desc, resource: task.resource || "" });
    setShowEditModal(true);
  };

  // SECURITY 2: Validate and normalize resource URLs before opening
  const openLink = async (url: string) => {
    try {
      let normalizedUrl = url.trim();
      // Auto-prepend https:// for bare domains like 'facebook.com'
      if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://')) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      const supported = await Linking.canOpenURL(normalizedUrl);
      if (supported) await Linking.openURL(normalizedUrl);
    } catch {
      // Silent fail
    }
  };

  // UX 7: Format completed date for display
  const formatCompletedDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title}>{`Week ${week.week}`}</ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addTaskBtn, pressed && styles.pressed]}
          onPress={() => {
            setTaskForm({ days: "", desc: "", resource: "" });
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add" size={14} color={AppColors.primary} />
          <ThemedText style={styles.addTaskText}>Add Task</ThemedText>
        </Pressable>
      </View>

      <View style={styles.tasksList}>
        {week.tasks.map((task) => (
          // Whole row is tappable to toggle — consistent with HabitCard
          <Pressable
            key={task.id}
            style={({ pressed }) => [styles.taskItem, pressed && styles.pressed]}
            onPress={() => handleToggle(task.id)}
          >
            {/* Checkbox is now a plain View; the outer Pressable handles toggle */}
            <View style={styles.checkboxArea}>
              <View
                style={[
                  styles.checkbox,
                  task.completed && styles.checkboxChecked,
                ]}
              >
                {task.completed ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
            </View>
            <View style={styles.taskContent}>
              <View style={styles.daysBadge}>
                <ThemedText style={styles.daysText}>{task.days}</ThemedText>
              </View>
              <ThemedText
                style={[styles.taskDesc, task.completed && styles.taskDescCompleted]}
              >
                {task.desc}
              </ThemedText>
              {/* UX 7: Show completed date */}
              {task.completed && task.completedDate ? (
                <ThemedText style={styles.completedDateText}>
                  Completed {formatCompletedDate(task.completedDate)}
                </ThemedText>
              ) : null}
              {task.resource ? (
                <Pressable
                  style={({ pressed }) => [pressed && styles.pressed]}
                  onPress={(e) => {
                    e.stopPropagation();
                    openLink(task.resource!);
                  }}
                >
                  <ThemedText style={styles.resourceLink}>
                    <Ionicons name="link" size={12} /> Resource
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.taskActions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                onPress={(e) => {
                  e.stopPropagation();
                  openEditModal(task);
                }}
                hitSlop={8}
              >
                <Ionicons name="pencil" size={16} color={AppColors.textSecondary} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                onPress={(e) => {
                  e.stopPropagation();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(
                    "Delete Task",
                    "Are you sure you want to delete this task?",
                    [
                      { text: "No", style: "cancel" },
                      {
                        text: "Yes",
                        style: "destructive",
                        onPress: () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onDeleteTask(weekIndex, task.id);
                        },
                      },
                    ]
                  );
                }}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={16} color={AppColors.danger} />
              </Pressable>
            </View>
          </Pressable>
        ))}
        {week.tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No tasks yet</ThemedText>
            <Pressable
              style={({ pressed }) => [styles.emptyAddBtn, pressed && styles.pressed]}
              onPress={() => {
                setTaskForm({ days: "", desc: "", resource: "" });
                setShowAddModal(true);
              }}
            >
              <Ionicons name="add" size={16} color={AppColors.primary} />
              <ThemedText style={styles.emptyAddText}>Add Task</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Add Task</ThemedText>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="What do you need to do?"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.desc}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, desc: text.slice(0, 500) }))}
              multiline
              maxLength={500}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Days (e.g., Days 1-3)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.days}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, days: text.slice(0, 50) }))}
              maxLength={50}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Resource link (optional, e.g. facebook.com)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.resource}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, resource: text.slice(0, 500) }))}
              keyboardType="url"
              maxLength={500}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowAddModal(false)}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddTask}
              >
                <ThemedText style={styles.saveBtnText}>Add Task</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Edit Task</ThemedText>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Description"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.desc}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, desc: text.slice(0, 500) }))}
              multiline
              maxLength={500}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Days"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.days}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, days: text.slice(0, 50) }))}
              maxLength={50}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Resource link (optional, e.g. facebook.com)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.resource}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, resource: text.slice(0, 500) }))}
              keyboardType="url"
              maxLength={500}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowEditModal(false)}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleEditTask}
              >
                <ThemedText style={styles.saveBtnText}>Save</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
    borderColor: AppColors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.primary,
  },
  addTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: 4,
  },
  addTaskText: {
    fontSize: 12,
    color: AppColors.primary,
  },
  tasksList: {
    gap: Spacing.md,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  // BUG 9: Separate touch area for checkbox
  checkboxArea: {
    padding: 2,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.textSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  taskContent: {
    flex: 1,
  },
  daysBadge: {
    backgroundColor: AppColors.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  daysText: {
    fontSize: 11,
    fontWeight: "700",
    color: AppColors.background,
  },
  taskDesc: {
    fontSize: 14,
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  taskDescCompleted: {
    textDecorationLine: "line-through",
    color: AppColors.textSecondary,
  },
  // UX 7: Completed date style
  completedDateText: {
    fontSize: 11,
    color: AppColors.primary,
    marginBottom: 4,
    fontStyle: "italic",
  },
  resourceLink: {
    fontSize: 12,
    color: AppColors.primary,
  },
  taskActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  actionBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderStyle: "dashed",
    borderRadius: BorderRadius.xs,
  },
  emptyText: {
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emptyAddText: {
    color: AppColors.primary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: AppColors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: Spacing.md,
  },
  modalTextarea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: AppColors.border,
  },
  cancelBtnText: {
    color: AppColors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
