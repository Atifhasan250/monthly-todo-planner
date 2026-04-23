const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withExactAlarm(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest["uses-permission"] || [];
    
    // Add USE_EXACT_ALARM permission
    const hasUseExactAlarm = permissions.some(
      (p) => p.$["android:name"] === "android.permission.USE_EXACT_ALARM"
    );

    if (!hasUseExactAlarm) {
      permissions.push({
        $: { "android:name": "android.permission.USE_EXACT_ALARM" },
      });
    }

    // Also add SCHEDULE_EXACT_ALARM as a fallback
    const hasScheduleExactAlarm = permissions.some(
      (p) => p.$["android:name"] === "android.permission.SCHEDULE_EXACT_ALARM"
    );

    if (!hasScheduleExactAlarm) {
      permissions.push({
        $: { "android:name": "android.permission.SCHEDULE_EXACT_ALARM" },
      });
    }

    manifest.manifest["uses-permission"] = permissions;
    return config;
  });
};
