import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ReminderModal } from "@/components/ReminderModal";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { resetAllData, getReminderSettings, saveReminderSettings, ReminderSettings, Reminder, saveReminders, getReminders } from "@/lib/storage";
import { scheduleReminderNotification, cancelReminderNotification } from "@/lib/notifications";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [showResetModal, setShowResetModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({ useDefault: true, customReminders: [] });

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getReminderSettings();
    setReminderSettings(settings);
  };

  const toggleReminderMode = async () => {
    const newUseDefault = !reminderSettings.useDefault;
    const newSettings = { ...reminderSettings, useDefault: newUseDefault };
    
    // Update local state immediately for UI responsiveness
    setReminderSettings(newSettings);
    
    await saveReminderSettings(newSettings);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (Platform.OS === "web") {
      alert("Please reload the app for changes to take effect.");
    } else {
      Alert.alert("Notice", "Please reload the app for changes to take effect.");
    }

    // Cancel all existing and reschedule based on mode
    const existing = await getReminders();
    for (const r of existing) {
      if (r.notificationId) await cancelReminderNotification(r.notificationId);
    }

    if (newUseDefault) {
      const { getDefaultReminders, saveReminders } = await import("@/lib/storage");
      const defaults = await getDefaultReminders();
      const updatedDefaults = [];
      for (const r of defaults) {
        const notificationId = await scheduleReminderNotification(r);
        updatedDefaults.push({ ...r, notificationId: notificationId || undefined });
      }
      await saveReminders(updatedDefaults);
    } else {
      // Use custom reminders
      const { saveReminders } = await import("@/lib/storage");
      const updatedCustom = [];
      for (const r of newSettings.customReminders) {
        if (r.isActive) {
          const notificationId = await scheduleReminderNotification(r);
          updatedCustom.push({ ...r, notificationId: notificationId || undefined });
        } else {
          updatedCustom.push(r);
        }
      }
      await saveReminders(updatedCustom);
    }
  };

  const handleOpenCustomReminders = () => {
    // Navigate to reminders modal but with settings context
    // For now, since we only have one modal, we can just use that
    // or we can add a new UI section. User asked for "add reminders for themselves"
    // I'll update the ReminderModal to be accessible from here too
    setShowResetModal(false); // Close any open modals
  };

  const handleReset = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    try {
      await resetAllData();
      
      // Re-initialize default reminders after reset if that was the mode
      const { getReminderSettings, getDefaultReminders, saveReminders } = await import("@/lib/storage");
      const settings = await getReminderSettings();
      if (settings.useDefault) {
        const defaults = await getDefaultReminders();
        const updatedDefaults = [];
        for (const r of defaults) {
          const notificationId = await scheduleReminderNotification(r);
          updatedDefaults.push({ ...r, notificationId: notificationId || undefined });
        }
        await saveReminders(updatedDefaults);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowResetModal(false);
      if (Platform.OS === "web") {
        window.location.reload();
      } else {
        Alert.alert("Success", "All data has been reset. Please reload the app.");
        loadSettings(); // Reload local state
      }
    } catch (error) {
      Alert.alert("Error", "Failed to reset data. Please try again.");
    }
  };

  const openLink = async (url: string) => {
    await WebBrowser.openBrowserAsync(url);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    danger = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <Pressable
      style={({ pressed }) => [styles.settingItem, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.settingIcon,
          danger && { backgroundColor: "rgba(239,68,68,0.2)" },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? AppColors.danger : AppColors.primary}
        />
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={[styles.settingTitle, danger && styles.dangerText]}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText style={styles.settingSubtitle}>{subtitle}</ThemedText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={AppColors.textSecondary} />
    </Pressable>
  );

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Ionicons name="checkmark" size={40} color={AppColors.primary} />
        </View>
        <ThemedText style={styles.appName}>Monthly Todo Planner</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Reminders</ThemedText>
        <View style={styles.sectionCard}>
          <Pressable style={styles.settingItem} onPress={toggleReminderMode}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications-outline" size={20} color={AppColors.primary} />
            </View>
            <View style={styles.settingContent}>
              <ThemedText style={styles.settingTitle}>Reminder Mode</ThemedText>
              <ThemedText style={styles.settingSubtitle}>
                {reminderSettings.useDefault ? "Default (6 AM & 10 PM)" : (reminderSettings.customReminders.length > 0 ? "Custom Reminders" : "Default (6 AM & 10 PM)")}
              </ThemedText>
            </View>
            <View style={[styles.toggle, reminderSettings.useDefault && styles.toggleActive]}>
              <View style={[styles.toggleThumb, reminderSettings.useDefault && styles.toggleThumbActive]} />
            </View>
          </Pressable>
          {!reminderSettings.useDefault && (
            <Pressable
              style={({ pressed }) => [styles.settingItem, pressed && styles.pressed]}
              onPress={() => setShowReminderModal(true)}
            >
              <View style={styles.settingIcon}>
                <Ionicons name="list-outline" size={20} color={AppColors.primary} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingTitle}>Custom Reminder for Everyday</ThemedText>
                <ThemedText style={styles.settingSubtitle}>Manage your daily notifications</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={AppColors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <ReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        reminders={reminderSettings.customReminders}
        onAddReminder={async (reminder) => {
          const { addReminder } = await import("@/lib/storage");
          const updated = await addReminder(reminder);
          setReminderSettings(prev => ({ ...prev, customReminders: updated }));
          await saveReminderSettings({ ...reminderSettings, customReminders: updated });
        }}
        onUpdateReminder={async (id, updates) => {
          const { updateReminder } = await import("@/lib/storage");
          const updated = await updateReminder(id, updates);
          setReminderSettings(prev => ({ ...prev, customReminders: updated }));
          await saveReminderSettings({ ...reminderSettings, customReminders: updated });
        }}
        onDeleteReminder={async (id) => {
          const { deleteReminder } = await import("@/lib/storage");
          const updated = await deleteReminder(id);
          setReminderSettings(prev => ({ ...prev, customReminders: updated }));
          await saveReminderSettings({ ...reminderSettings, customReminders: updated });
        }}
      />

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>About</ThemedText>
        <View style={styles.sectionCard}>
          <SettingItem
            icon="information-circle-outline"
            title="Version"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="person-outline"
            title="Developer"
            subtitle="Atif Hasan"
            onPress={() => openLink("https://atifs-info.vercel.app/")}
          />
          <SettingItem
            icon="globe-outline"
            title="Website"
            subtitle="monthly-todo-planner.netlify.app"
            onPress={() => openLink("https://monthly-todo-planner.netlify.app/")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Social</ThemedText>
        <View style={styles.sectionCard}>
          <SettingItem
            icon="logo-instagram"
            title="Instagram"
            subtitle="@_atif_hasan_"
            onPress={() => openLink("https://www.instagram.com/_atif_hasan_/")}
          />
          <SettingItem
            icon="logo-facebook"
            title="Facebook"
            subtitle="atifhasan250"
            onPress={() => openLink("https://www.facebook.com/atifhasan250")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Data</ThemedText>
        <View style={styles.sectionCard}>
          <SettingItem
            icon="trash-outline"
            title="Reset All Data"
            subtitle="Clear all progress and habits"
            onPress={handleReset}
            danger
          />
        </View>
      </View>

      <View style={{ height: Spacing.xl }} />

      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={32} color={AppColors.danger} />
            </View>
            <ThemedText style={styles.modalTitle}>Reset All Progress?</ThemedText>
            <ThemedText style={styles.modalText}>
              This will clear all your tasks, habits, and history. This action cannot
              be undone.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowResetModal(false)}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.dangerBtn]}
                onPress={confirmReset}
              >
                <ThemedText style={styles.dangerBtnText}>Yes, Reset</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollViewCompat>
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
  profileSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.textPrimary,
    marginBottom: Spacing.xs,
  },
  appTagline: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(16,185,129,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: AppColors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: AppColors.danger,
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
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: AppColors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: AppColors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  cancelBtn: {
    backgroundColor: AppColors.border,
  },
  cancelBtnText: {
    color: AppColors.textPrimary,
    fontWeight: "600",
  },
  dangerBtn: {
    backgroundColor: AppColors.danger,
  },
  dangerBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
