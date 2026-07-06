export function calcRunway(chartData: number[], minReserve: number): number | null {
  if (!chartData.length) return null;
  const idx = chartData.findIndex((v) => v < minReserve);
  return idx >= 0 ? idx : 90;
}
