/**
 * Every setting the app keeps in the on-device kv-store, in one place so backups can't miss one:
 * whatever is listed here travels with cloud backups and backup files.
 */
export const SETTING_KEYS = {
  theme: "theme.v1",
  gooseEnabled: "goose.enabled",
  statsRange: "stats.range",
  statsChart: "stats.chart",
  statsChartStyle: "stats.chartStyle",
  searchSort: "add.searchSort",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** All of them are user choices worth restoring on a new phone. */
export const BACKUP_SETTING_KEYS: readonly SettingKey[] = Object.values(SETTING_KEYS);
