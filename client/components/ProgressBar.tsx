import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface ProgressBarProps {
  percent: number;
  completed: number;
  total: number;
}

export function ProgressBar({ percent, completed, total }: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percent, {
      duration: 800,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [percent, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.percentText}>{percent}%</ThemedText>
        <ThemedText style={styles.statsText}>
          {completed}/{total} Completed
        </ThemedText>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.progressWrapper, animatedStyle]}>
          <LinearGradient
            colors={[AppColors.primary, "#34d399"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progress}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  percentText: {
    fontSize: 32,
    fontWeight: "700",
    color: AppColors.primary,
  },
  statsText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  track: {
    height: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  progressWrapper: {
    height: "100%",
    minWidth: 0,
  },
  progress: {
    flex: 1,
    borderRadius: BorderRadius.full,
  },
  subtitle: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
