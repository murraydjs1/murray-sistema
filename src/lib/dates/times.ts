export function suggestSetupTime(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const total = (hours * 60 + minutes - 150 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
