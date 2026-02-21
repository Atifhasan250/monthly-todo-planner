import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { AppColors } from "@/constants/theme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  return {
    headerTitleAlign: "center",
    headerTransparent: transparent,
    headerBlurEffect: "dark",
    headerTintColor: AppColors.textPrimary,
    headerStyle: {
      backgroundColor: Platform.select({
        ios: undefined,
        android: AppColors.background,
        web: AppColors.background,
      }),
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
    contentStyle: {
      backgroundColor: AppColors.background,
    },
  };
}
