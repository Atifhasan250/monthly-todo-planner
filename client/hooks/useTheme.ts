import { Colors } from "@/constants/theme";

export function useTheme() {
  const isDark = true;
  const theme = Colors.dark;

  return {
    theme,
    isDark,
  };
}
