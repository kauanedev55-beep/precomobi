export function moneyCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}
export function netSaving(saving: number, chosenTrip: number, referenceTrip: number): number {
  return moneyCents(saving) - moneyCents(chosenTrip) + moneyCents(referenceTrip);
}
export function tripCost(oneWayKm: number, costPerKm: number): number {
  return Math.round(oneWayKm * 2 * costPerKm * 100) / 100;
}
