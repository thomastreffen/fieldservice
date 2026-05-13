import { useMemo } from "react";
import { startOfWeek, addDays } from "date-fns";

const DEFAULT_WEEKLY_MINUTES = 2400; // 40h
const DEFAULT_WORK_DAY_MINUTES = 480; // 8h
const MIRROR_TOLERANCE_MINUTES = 5;

/** Minimal event shape accepted by this hook */
export interface CapacityEvent {
  id: string;
  start: Date;
  end: Date;
  technicians: Array<{ id: string }>;
}

/** External busy slot (e.g. from Google Calendar) */
export interface ExternalBusySlot {
  technicianId: string;
  start: Date;
  end: Date;
}

export interface DayCapacity {
  date: Date;
  bookedMinutes: number;
  externalMinutes: number;
  totalMinutes: number;
  percent: number;
  color: string;
  label: string;
}

export interface TechDayCapacity {
  techId: string;
  days: DayCapacity[];
  weekPercent: number;
  weekPlannedMinutes: number;
  weekCapacityMinutes: number;
  overtimeMinutes: number;
  weekPlannedHours: number;
  weekCapacityHours: number;
  overtimeHours: number;
}

type Interval = { startMs: number; endMs: number };

function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeInterval(start: Date, end: Date): Interval {
  const startMs = start.getTime();
  let endMs = end.getTime();
  if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;
  return { startMs, endMs };
}

function splitIntervalByDay(start: Date, end: Date): Array<{ dayKey: string; minutes: number }> {
  const normalized = normalizeInterval(start, end);
  const chunks: Array<{ dayKey: string; minutes: number }> = [];
  let cursor = normalized.startMs;
  while (cursor < normalized.endMs) {
    const cur = new Date(cursor);
    const dayStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const segmentEnd = Math.min(normalized.endMs, dayEnd.getTime());
    const minutes = Math.max(0, Math.round((segmentEnd - cursor) / 60000));
    if (minutes > 0) chunks.push({ dayKey: toDayKey(dayStart), minutes });
    cursor = segmentEnd;
  }
  return chunks;
}

function roundToMinute(ms: number): number {
  return Math.round(ms / 60000);
}

function overlapMinutes(a: Interval, b: Interval): number {
  return Math.max(0, roundToMinute(Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs)));
}

function isLikelyMirrored(slot: Interval, internal: Interval): boolean {
  const slotMin = roundToMinute(slot.endMs - slot.startMs);
  const intMin = roundToMinute(internal.endMs - internal.startMs);
  if (slotMin <= 0 || intMin <= 0) return false;
  const overlap = overlapMinutes(slot, internal);
  const minDuration = Math.min(slotMin, intMin);
  const ratio = minDuration > 0 ? overlap / minDuration : 0;
  const closeStart = Math.abs(roundToMinute(slot.startMs - internal.startMs)) <= MIRROR_TOLERANCE_MINUTES;
  const closeEnd = Math.abs(roundToMinute(slot.endMs - internal.endMs)) <= MIRROR_TOLERANCE_MINUTES;
  return ratio >= 0.95 || (closeStart && closeEnd);
}

function capacityColor(percent: number): string {
  if (percent > 100) return "#7F1D1D";
  if (percent >= 90) return "#DC2626";
  if (percent >= 50) return "#F59E0B";
  return "#22C55E";
}

function capacityLabel(percent: number): string {
  if (percent > 100) return "Overbooket";
  if (percent >= 90) return "Full dag";
  if (percent > 0) return `${Math.round(percent)}%`;
  return "Ledig";
}

export function useCapacity(
  events: CapacityEvent[],
  busySlots: ExternalBusySlot[],
  referenceDate: Date,
  technicianIds: string[],
  workDayMinutes = DEFAULT_WORK_DAY_MINUTES,
  weeklyCapacityMinutes = DEFAULT_WEEKLY_MINUTES
) {
  return useMemo(() => {
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekDayKeys = new Set(weekDays.map(toDayKey));

    const internalByTechByDay = new Map<string, Map<string, number>>();
    const internalIntervalsByTech = new Map<string, Interval[]>();
    const seenInternal = new Set<string>();

    for (const ev of events) {
      const normalized = normalizeInterval(ev.start, ev.end);
      for (const tech of ev.technicians) {
        const key = `${ev.id}|${tech.id}|${roundToMinute(normalized.startMs)}|${roundToMinute(normalized.endMs)}`;
        if (seenInternal.has(key)) continue;
        seenInternal.add(key);
        if (!internalByTechByDay.has(tech.id)) internalByTechByDay.set(tech.id, new Map());
        if (!internalIntervalsByTech.has(tech.id)) internalIntervalsByTech.set(tech.id, []);
        internalIntervalsByTech.get(tech.id)!.push(normalized);
        for (const chunk of splitIntervalByDay(ev.start, ev.end)) {
          if (!weekDayKeys.has(chunk.dayKey)) continue;
          const dayMap = internalByTechByDay.get(tech.id)!;
          dayMap.set(chunk.dayKey, (dayMap.get(chunk.dayKey) || 0) + chunk.minutes);
        }
      }
    }

    const externalByTechByDay = new Map<string, Map<string, number>>();
    const seenExternal = new Set<string>();

    for (const slot of busySlots) {
      const normalized = normalizeInterval(slot.start, slot.end);
      const key = `${slot.technicianId}|${roundToMinute(normalized.startMs)}|${roundToMinute(normalized.endMs)}`;
      if (seenExternal.has(key)) continue;
      seenExternal.add(key);
      const internalIntervals = internalIntervalsByTech.get(slot.technicianId) || [];
      if (internalIntervals.some((iv) => isLikelyMirrored(normalized, iv))) continue;
      if (!externalByTechByDay.has(slot.technicianId)) externalByTechByDay.set(slot.technicianId, new Map());
      for (const chunk of splitIntervalByDay(slot.start, slot.end)) {
        if (!weekDayKeys.has(chunk.dayKey)) continue;
        const dayMap = externalByTechByDay.get(slot.technicianId)!;
        dayMap.set(chunk.dayKey, (dayMap.get(chunk.dayKey) || 0) + chunk.minutes);
      }
    }

    const techCapacities: TechDayCapacity[] = technicianIds.map((techId) => {
      const internalDayMap = internalByTechByDay.get(techId) || new Map<string, number>();
      const externalDayMap = externalByTechByDay.get(techId) || new Map<string, number>();
      let weekPlannedMinutes = 0;

      const days: DayCapacity[] = weekDays.map((day) => {
        const dayKey = toDayKey(day);
        const bookedMinutes = internalDayMap.get(dayKey) || 0;
        const externalMinutes = externalDayMap.get(dayKey) || 0;
        const totalMinutes = bookedMinutes + externalMinutes;
        const percent = (totalMinutes / workDayMinutes) * 100;
        weekPlannedMinutes += totalMinutes;
        return { date: day, bookedMinutes, externalMinutes, totalMinutes, percent, color: capacityColor(percent), label: capacityLabel(percent) };
      });

      const weekPercent = (weekPlannedMinutes / weeklyCapacityMinutes) * 100;
      const overtimeMinutes = Math.max(0, weekPlannedMinutes - weeklyCapacityMinutes);

      return {
        techId,
        days,
        weekPercent,
        weekPlannedMinutes,
        weekCapacityMinutes: weeklyCapacityMinutes,
        overtimeMinutes,
        weekPlannedHours: Math.round((weekPlannedMinutes / 60) * 10) / 10,
        weekCapacityHours: weeklyCapacityMinutes / 60,
        overtimeHours: Math.round((overtimeMinutes / 60) * 10) / 10,
      };
    });

    const aggregatedDays: DayCapacity[] = weekDays.map((day, i) => {
      let totalBooked = 0;
      let totalExternal = 0;
      for (const tc of techCapacities) {
        totalBooked += tc.days[i].bookedMinutes;
        totalExternal += tc.days[i].externalMinutes;
      }
      const totalMinutes = totalBooked + totalExternal;
      const totalCapacity = technicianIds.length * workDayMinutes;
      const percent = totalCapacity > 0 ? (totalMinutes / totalCapacity) * 100 : 0;
      return { date: day, bookedMinutes: totalBooked, externalMinutes: totalExternal, totalMinutes, percent, color: capacityColor(percent), label: capacityLabel(percent) };
    });

    return { techCapacities, aggregatedDays };
  }, [events, busySlots, referenceDate, technicianIds, workDayMinutes, weeklyCapacityMinutes]);
}
