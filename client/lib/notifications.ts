import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Reminder } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// Define notification categories for actions
async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync("reminder", [
    {
      identifier: "stop",
      buttonTitle: "Dismiss",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

setupNotificationCategories();

// Handle notification responses (actions)
Notifications.addNotificationResponseReceivedListener(async (response) => {
  const { actionIdentifier, notification } = response;
  
  if (actionIdentifier === "stop") {
    await Notifications.dismissNotificationAsync(notification.date.toString());
  }
});

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

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return true;
}

export async function scheduleReminderNotification(
  reminder: Reminder
): Promise<string | null> {
  try {
    const [hours, minutes] = reminder.time.split(":").map(Number);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit Reminder",
        body: reminder.message,
        data: { reminderId: reminder.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: "reminder",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        channelId: Platform.OS === "android" ? "reminders" : undefined,
      } as Notifications.NotificationTriggerInput,
    });

    return notificationId;
  } catch (error) {
    console.warn("Failed to schedule local notification:", error);
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
