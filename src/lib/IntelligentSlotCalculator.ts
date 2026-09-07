export interface BeautyServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMinutes: number;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface BookingSlot {
  id: string;
  startTime: string; // e.g. "10:00"
  endTime: string;   // e.g. "11:00"
  date?: string;     // e.g. "2026-08-20"
  capacity: number;  // max customers e.g. 1 or 2
  bookedCount: number;
  breakDurationMinutes?: number;
  status: "SZABAD" | "FOGLALT_MANUALIS" | "FOGLALT_ONLINE" | "FUGGBEN";
  allowedServiceIds?: string[];
}

export interface SlotCheckResult {
  fits: boolean;
  requiredDuration: number;
  availableDuration: number;
  totalPrice: number;
  recommendationMessage?: string;
  suggestedEndTime?: string;
}

/**
 * Converts "HH:MM" string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight to "HH:MM" format
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Checks if a list of selected services fits within a time slot (Section 3.2 logic)
 */
export function calculateSlotCompatibility(
  selectedServices: BeautyServiceItem[],
  slot: BookingSlot
): SlotCheckResult {
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  const startMins = timeToMinutes(slot.startTime);
  const endMins = timeToMinutes(slot.endTime);
  const rawSlotDuration = endMins - startMins;
  const availableDuration = rawSlotDuration - (slot.breakDurationMinutes || 0);

  if (totalDuration <= availableDuration) {
    return {
      fits: true,
      requiredDuration: totalDuration,
      availableDuration,
      totalPrice,
    };
  }

  // Calculate suggested longer slot
  const suggestedEndMins = startMins + totalDuration;
  const suggestedEndTime = minutesToTime(suggestedEndMins);
  const recommendationMessage = `A kiválasztott szolgáltatások (${totalDuration} perc) nem férnek bele a ${slot.startTime}–${slot.endTime} sávba (${availableDuration} perc szabad). Erre a szolgáltatásra a ${slot.startTime}–${suggestedEndTime}-es sáv lenne alkalmas. Szeretné azt választani?`;

  return {
    fits: false,
    requiredDuration: totalDuration,
    availableDuration,
    totalPrice,
    recommendationMessage,
    suggestedEndTime,
  };
}

/**
 * Prevents overlapping appointments and holiday/dayoff conflicts
 */
export function isSlotOverlap(
  newStart: string,
  newEnd: string,
  existingSlots: { startTime: string; endTime: string }[]
): boolean {
  const nStart = timeToMinutes(newStart);
  const nEnd = timeToMinutes(newEnd);

  return existingSlots.some((s) => {
    const eStart = timeToMinutes(s.startTime);
    const eEnd = timeToMinutes(s.endTime);
    return Math.max(nStart, eStart) < Math.min(nEnd, eEnd);
  });
}
