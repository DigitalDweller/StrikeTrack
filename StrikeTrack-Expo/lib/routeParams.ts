export function normalizeRouteParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) {
    const first = value.find((v) => typeof v === 'string' && v.trim().length > 0);
    return first?.trim() ?? null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}
