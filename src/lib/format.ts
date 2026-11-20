export function formatQuantity(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const rounded = Math.round(value * 8) / 8;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  const fracMap: Array<[number, string]> = [
    [0.125, "⅛"],
    [0.25, "¼"],
    [0.375, "⅜"],
    [0.5, "½"],
    [0.625, "⅝"],
    [0.75, "¾"],
    [0.875, "⅞"],
  ];

  let fracStr = "";
  for (const [val, symbol] of fracMap) {
    if (Math.abs(frac - val) < 0.05) {
      fracStr = symbol;
      break;
    }
  }

  if (!fracStr && frac > 0.05) {
    return (Math.round(value * 10) / 10).toString();
  }

  if (whole > 0 && fracStr) return `${whole} ${fracStr}`;
  if (fracStr) return fracStr;
  return whole.toString();
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

export function formatSafetyLabel(status: string): {
  label: string;
  tone: "safe" | "caution" | "unsafe";
} {
  switch (status) {
    case "reviewed_safe":
      return { label: "Pregnancy Food-Safety Reviewed", tone: "safe" };
    case "caution_modification":
      return { label: "Cook / Modify for Pregnancy Safety", tone: "caution" };
    case "flagged_unsafe":
      return { label: "Flagged: Review Ingredients", tone: "unsafe" };
    default:
      return { label: "Needs Pregnancy Review", tone: "caution" };
  }
}

