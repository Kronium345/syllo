/** "2.4k" for review counts (prompts/16): 950 → "950", 2400 → "2.4k", 12000 → "12k", 1.5M → "1.5M". */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  const [divisor, suffix] = value < 1_000_000 ? [1000, "k"] : [1_000_000, "M"];
  const scaled = value / divisor;
  return `${scaled >= 10 ? Math.round(scaled) : Math.round(scaled * 10) / 10}${suffix}`;
}

/** "1.4 MB" for resource files (the design's "1.4 MB • Figma File"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 ? Math.round(size) : Math.round(size * 10) / 10} ${units[unit]}`;
}
