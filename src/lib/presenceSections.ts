export const PRESENCE_SECTIONS = [
  "HOME",
  "SHOP",
  "PRODUCT",
  "CART",
  "CHECKOUT",
  "OTHER",
] as const;

export type PresenceSection = (typeof PRESENCE_SECTIONS)[number];

function normalizePathname(pathname: string): string {
  const [withoutQuery = "/"] = String(pathname || "/").split("?");
  const [withoutHash = "/"] = withoutQuery.split("#");
  const clean = withoutHash.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return clean || "/";
}

export function classifyPresenceSection(
  pathname: string,
  cartOpen = false,
): PresenceSection {
  if (cartOpen) return "CART";

  const path = normalizePathname(pathname);
  if (path === "/") return "HOME";
  if (path === "/shop") return "SHOP";
  if (/^\/product\/[^/]+$/.test(path)) return "PRODUCT";
  if (path === "/checkout" || path.startsWith("/checkout/")) return "CHECKOUT";
  return "OTHER";
}
