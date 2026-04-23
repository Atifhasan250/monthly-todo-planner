import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Reminder } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Define notification categories for actions
async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("reminder", [
    {
      identifier: "snooze",
      buttonTitle: "🕐 Snooze 5 min",
      options: { opensAppToForeground: false, isDestructive: false },
    },
    {
      identifier: "stop",
      buttonTitle: "Dismiss",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

setupNotificationCategories();

// Schedule a snooze notification — fires 5 minutes from now
async function scheduleSnoozeNotification(
  title: string,
  body: string,
  reminderId: string
): Promise<void> {
  try {
    await ensureAndroidChannel();
    const snoozeDate = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { reminderId, snoozed: true },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
        channelId: Platform.OS === "android" ? "reminders" : undefined,
      } as Notifications.NotificationTriggerInput,
    });

    console.log("Snooze scheduled for", snoozeDate.toISOString());
  } catch (error) {
    console.error("Failed to schedule snooze:", error);
  }
}

// Handle notification responses (actions)
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const { actionIdentifier, notification } = response;
  const { title, body } = notification.request.content;
  const { reminderId } = (notification.request.content.data ?? {}) as {
    reminderId?: string;
    snoozed?: boolean;
  };

  if (actionIdentifier === "snooze") {
    // Dismiss the current notification then re-schedule in 5 min
    await Notifications.dismissNotificationAsync(notification.request.identifier);
    await scheduleSnoozeNotification(
      title ?? "Habit Reminder 🔔",
      body ?? "",
      reminderId ?? ""
    );
  } else if (actionIdentifier === "stop") {
    // Use the correct notification identifier, not the date
    await Notifications.dismissNotificationAsync(notification.request.identifier);
  }
});

// Ensures the Android notification channel exists — called before every schedule
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  await ensureAndroidChannel();
  return true;
}

export async function scheduleReminderNotification(
  reminder: Reminder
): Promise<string | null> {
  try {
    // Guarantee channel exists on Android before scheduling
    await ensureAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      console.warn("Notification permission not granted");
      return null;
    }

    const [hours, minutes] = reminder.time.split(":").map(Number);
    const [year, month, day] = reminder.date.split("-").map(Number);
    
    const reminderDateTime = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    const isSpecificFutureDate = reminderDateTime > now;
    const isDefaultReminder = reminder.id.startsWith("default_");
    
    let trigger: Notifications.NotificationTriggerInput;
    
    if (isDefaultReminder || !isSpecificFutureDate) {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        channelId: Platform.OS === "android" ? "reminders" : undefined,
      } as Notifications.NotificationTriggerInput;
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDateTime,
        channelId: Platform.OS === "android" ? "reminders" : undefined,
      } as Notifications.NotificationTriggerInput;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit Reminder 🔔",
        body: reminder.message,
        data: { reminderId: reminder.id },
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "reminder",
      },
      trigger,
    });

    console.log("Notification scheduled:", notificationId, "for", reminderDateTime.toISOString());
    return notificationId;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

export async function cancelReminderNotification(
  notificationId: string
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Failed to cancel notification:", error);
  }
}

export async function getScheduledNotifications() {
  return await Notifications.getAllScheduledNotificationsAsync();
}
