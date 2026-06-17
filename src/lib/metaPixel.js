export function trackMetaEvent(eventName, data = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.fbq !== "function") return;

  window.fbq("track", eventName, data);
}