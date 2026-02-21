import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { AppColors, Spacing, Fonts } from "@/constants/theme";

export function RealTimeClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.timeText}>{formatTime(time)}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
    alignItems: "flex-start",
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
    color: AppColors.primary,
    fontFamily: Fonts?.sans,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: AppColors.textPrimary,
    fontFamily: Fonts?.mono,
  },
});
