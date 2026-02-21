import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, Modal, Linking } from "react-native";
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
        days: taskForm.days || `Day ${week.tasks.length + 1}`,
        desc: taskForm.desc,
        resource: taskForm.resource || undefined,
      });
      setTaskForm({ days: "", desc: "", resource: "" });
      setShowAddModal(false);
    }
  };

  const handleEditTask = async () => {
    if (editingTask && taskForm.desc.trim()) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onEditTask(weekIndex, editingTask.id, {
        days: taskForm.days,
        desc: taskForm.desc,
        resource: taskForm.resource || undefined,
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

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Silent fail
    }
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
          <Pressable
            key={task.id}
            style={({ pressed }) => [
              styles.taskItem,
              pressed && styles.pressed
            ]}
            onPress={() => handleToggle(task.id)}
          >
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
            <View style={styles.taskContent}>
              <View style={styles.daysBadge}>
                <ThemedText style={styles.daysText}>{task.days}</ThemedText>
              </View>
              <ThemedText
                style={[styles.taskDesc, task.completed && styles.taskDescCompleted]}
              >
                {task.desc}
              </ThemedText>
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
                  onDeleteTask(weekIndex, task.id);
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
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, desc: text }))}
              multiline
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Days (e.g., Days 1-3)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.days}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, days: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Resource link (optional)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.resource}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, resource: text }))}
              keyboardType="url"
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
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, desc: text }))}
              multiline
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Days"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.days}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, days: text }))}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Resource link (optional)"
              placeholderTextColor={AppColors.textSecondary}
              value={taskForm.resource}
              onChangeText={(text) => setTaskForm((prev) => ({ ...prev, resource: text }))}
              keyboardType="url"
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
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.textSecondary,
    marginRight: Spacing.md,
    marginTop: 2,
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
  },
  cancelBtn: {
    backgroundColor: AppColors.border,
  },
  cancelBtnText: {
    color: AppColors.textPrimary,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: AppColors.primary,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
