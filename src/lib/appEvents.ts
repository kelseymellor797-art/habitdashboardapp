export const APP_DATA_UPDATED_EVENT = "habitflow:updated";

export function notifyAppDataUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(APP_DATA_UPDATED_EVENT));
  }
}
