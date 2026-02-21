import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Reminder } from "@/lib/storage";
import {
  scheduleReminderNotification,
  cancelReminderNotification,
} from "@/lib/notifications";

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, "id">) => Promise<void>;
  onUpdateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Due now");
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeString = "";
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;
      
      setTimeLeft(timeString);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [targetDate]);

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="timer-outline" size={12} color={AppColors.primary} />
      <ThemedText style={styles.countdownText}>{timeLeft}</ThemedText>
    </View>
  );
}

export function ReminderModal({
  visible,
  onClose,
  reminders,
  onAddReminder,
  onUpdateReminder,
  onDeleteReminder,
}: ReminderModalProps) {
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    if (!visible) {
      setMessage("");
      setSelectedDate(new Date());
      setEditingReminder(null);
    }
  }, [visible]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getTimeString = (date: Date): string => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const handleSave = async () => {
    if (!message.trim()) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const reminderData = {
      message: message.trim(),
      date: getDateString(selectedDate),
      time: getTimeString(selectedDate),
      isActive: true,
    };

    if (editingReminder) {
      if (editingReminder.notificationId) {
        await cancelReminderNotification(editingReminder.notificationId);
      }
      const notificationId = await scheduleReminderNotification({
        ...editingReminder,
        ...reminderData,
      });
      
      await onUpdateReminder(editingReminder.id, {
        ...reminderData,
        notificationId: notificationId || undefined,
      });
    } else {
      const tempId = `reminder_${Date.now()}`;
      const notificationId = await scheduleReminderNotification({
        ...reminderData,
        id: tempId,
      });

      await onAddReminder({
        ...reminderData,
        notificationId: notificationId || undefined,
      });
    }

    setMessage("");
    setSelectedDate(new Date());
    setEditingReminder(null);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setMessage(reminder.message);
    const [year, month, day] = reminder.date.split("-").map(Number);
    const [hours, minutes] = reminder.time.split(":").map(Number);
    setSelectedDate(new Date(year, month - 1, day, hours, minutes));
  };

  const handleDelete = async (reminder: Reminder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId);
    }
    await onDeleteReminder(reminder.id);
  };

  const handleToggleActive = async (reminder: Reminder) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (reminder.isActive && reminder.notificationId) {
      await cancelReminderNotification(reminder.notificationId);
      await onUpdateReminder(reminder.id, { isActive: false, notificationId: undefined });
    } else {
      const notificationId = await scheduleReminderNotification(reminder);
      await onUpdateReminder(reminder.id, {
        isActive: true,
        notificationId: notificationId || undefined,
      });
    }
  };

  const onDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const newDate = new Date(selectedDate);
      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setSelectedDate(newDate);
    }
  };

  const onTimeChange = (_: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes());
      setSelectedDate(newDate);
    }
  };

  const parseReminderDate = (reminder: Reminder): Date => {
    const [year, month, day] = reminder.date.split("-").map(Number);
    const [hours, minutes] = reminder.time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Reminders</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={AppColors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {Platform.OS === 'android' && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={AppColors.primary} />
              <ThemedText style={styles.infoText}>
                Note: Scheduled notifications work best in a standalone app. In Expo Go, they might occasionally be delayed.
              </ThemedText>
            </View>
          )}
          <View style={styles.formSection}>
            <ThemedText style={styles.sectionTitle}>
              {editingReminder ? "Edit Reminder" : "New Reminder"}
            </ThemedText>

            <TextInput
              style={styles.messageInput}
              placeholder="Reminder message..."
              placeholderTextColor={AppColors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <View style={styles.dateTimeRow}>
              <Pressable
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={AppColors.secondary} />
                <ThemedText style={styles.dateTimeText}>
                  {formatDate(selectedDate)}
                </ThemedText>
              </Pressable>

              <Pressable
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={18} color={AppColors.secondary} />
                <ThemedText style={styles.dateTimeText}>
                  {formatTime(selectedDate)}
                </ThemedText>
              </Pressable>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
                minimumDate={new Date()}
                themeVariant="dark"
              />
            ) : null}

            {showTimePicker ? (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
                themeVariant="dark"
              />
            ) : null}

            <Pressable
              style={[
                styles.saveButton,
                !message.trim() && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!message.trim()}
            >
              <ThemedText style={styles.saveButtonText}>
                {editingReminder ? "Update Reminder" : "Set Reminder"}
              </ThemedText>
            </Pressable>

            {editingReminder ? (
              <Pressable
                style={styles.cancelEditButton}
                onPress={() => {
                  setEditingReminder(null);
                  setMessage("");
                  setSelectedDate(new Date());
                }}
              >
                <ThemedText style={styles.cancelEditText}>Cancel Edit</ThemedText>
              </Pressable>
            ) : null}
          </View>

          {reminders.length > 0 ? (
            <View style={styles.remindersSection}>
              <ThemedText style={styles.sectionTitle}>Your Reminders</ThemedText>
              {reminders.map((reminder) => {
                const reminderDate = parseReminderDate(reminder);
                const isPast = reminderDate.getTime() < Date.now();
                return (
                  <View
                    key={reminder.id}
                    style={[
                      styles.reminderItem,
                      !reminder.isActive && styles.reminderItemInactive,
                      isPast && styles.reminderItemPast,
                    ]}
                  >
                    <Pressable
                      style={styles.reminderToggle}
                      onPress={() => handleToggleActive(reminder)}
                    >
                      <Ionicons
                        name={reminder.isActive ? "notifications" : "notifications-off"}
                        size={20}
                        color={reminder.isActive ? AppColors.secondary : AppColors.textSecondary}
                      />
                    </Pressable>
                    <View style={styles.reminderContent}>
                      <View style={styles.reminderTitleRow}>
                        <ThemedText
                          style={[
                            styles.reminderMessage,
                            !reminder.isActive && styles.reminderMessageInactive,
                          ]}
                          numberOfLines={2}
                        >
                          {reminder.message}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.reminderDateTime}>
                        {formatDate(reminderDate)} at {formatTime(reminderDate)}
                        {isPast ? " (Past)" : ""}
                      </ThemedText>
                      {!isPast && reminder.isActive && (
                        <CountdownTimer targetDate={reminderDate} />
                      )}
                    </View>
                    <View style={styles.reminderActions}>
                      <Pressable
                        style={styles.reminderActionBtn}
                        onPress={() => handleEdit(reminder)}
                      >
                        <Ionicons name="pencil" size={16} color={AppColors.textSecondary} />
                      </Pressable>
                      <Pressable
                        style={styles.reminderActionBtn}
                        onPress={() => handleDelete(reminder)}
                      >
                        <Ionicons name="trash" size={16} color={AppColors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing["2xl"],
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,92,246,0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  infoText: {
    fontSize: 12,
    color: AppColors.textSecondary,
    flex: 1,
  },
  formSection: {
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: Spacing.md,
  },
  messageInput: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    color: AppColors.textPrimary,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: AppColors.border,
    marginBottom: Spacing.sm,
  },
  alarmToggleRow: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  alarmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(139,92,246,0.1)',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  alarmButtonActive: {
    backgroundColor: AppColors.secondary,
    borderColor: AppColors.secondary,
  },
  alarmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.secondary,
    flex: 1,
  },
  alarmButtonTextActive: {
    color: '#fff',
  },
  alarmInfo: {
    fontSize: 11,
    color: AppColors.textSecondary,
    marginLeft: Spacing.xs,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: AppColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  dateTimeText: {
    fontSize: 14,
    color: AppColors.textPrimary,
  },
  saveButton: {
    backgroundColor: AppColors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelEditButton: {
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  cancelEditText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  remindersSection: {
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  reminderItemInactive: {
    opacity: 0.6,
  },
  reminderItemPast: {
    borderColor: AppColors.textSecondary,
  },
  reminderToggle: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  reminderMessage: {
    fontSize: 14,
    color: AppColors.textPrimary,
    flexShrink: 1,
  },
  reminderMessageInactive: {
    color: AppColors.textSecondary,
  },
  reminderDateTime: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 2,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.primary,
  },
  reminderActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  reminderActionBtn: {
    padding: Spacing.xs,
  },
});
