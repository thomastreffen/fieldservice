import { useMemo } from "react";
import { startOfWeek, addDays, format } from "date-fns";
import type { CapacityEvent, TechDayCapacity } from "@/hooks/useCapacity";

export interface CapacityGap {
  techId: string;
  techName: string;
  date: Date;
  dayKey: string;
  startHour: number;
  endHour: number;
  durationMinutes: number;
}

export interface CapacityGapsSummary {
  totalUnusedMinutes: number;
  underutilizedTechCount: number;
  topGaps: CapacityGap[];
  gapsByTech: Map<string, CapacityGap[]>;
}

const WORK_START = 7;
const WORK_END = 16;
const MIN_GAP_MINUTES = 60;

export function useCapacityGaps(
  events: CapacityEvent[],
  techCapacities: TechDayCapacity[],
  technicianMap: Map<string, { name: string; color: string | null }>,
  referenceDate: Date
): CapacityGapsSummary {
  return useMemo(() => {
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const now = new Date();
    const gaps: CapacityGap[] = [];
    let totalUnusedMinutes = 0;
    const gapsByTech = new Map<string, CapacityGap[]>();
    const underutilizedTechs = new Set<string>();

    // Build event intervals per tech per weekday index (0=Mon … 4=Fri)
    const techDayIntervals = new Map<string, Array<{ start: number; end: number }>>();

    for (const ev of events) {
      for (const tech of ev.technicians) {
        for (let d = 0; d < 5; d++) {
          const day = addDays(weekStart, d);
          const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          if (ev.end <= dayStart || ev.start >= dayEnd) continue;

          const startHour = (Math.max(ev.start.getTime(), dayStart.getTime()) - dayStart.getTime()) / 3_600_000;
          const endHour = (Math.min(ev.end.getTime(), dayEnd.getTime()) - dayStart.getTime()) / 3_600_000;
          const s = Math.max(startHour, WORK_START);
          const e = Math.min(endHour, WORK_END);
          if (s >= e) continue;

          const key = `${tech.id}|${d}`;
          if (!techDayIntervals.has(key)) techDayIntervals.set(key, []);
          techDayIntervals.get(key)!.push({ start: s, end: e });
        }
      }
    }

    for (const tc of techCapacities) {
      const techInfo = technicianMap.get(tc.techId);
      if (!techInfo) continue;
      let techWeekUnused = 0;

      for (let d = 0; d < 5; d++) {
        const day = addDays(weekStart, d);
        if (day < new Date(now.getFullYear(), now.getMonth(), now.getDate())) continue;

        const key = `${tc.techId}|${d}`;
        const intervals = (techDayIntervals.get(key) || []).slice().sort((a, b) => a.start - b.start);

        // Merge overlapping intervals
        const merged: Array<{ start: number; end: number }> = [];
        for (const iv of intervals) {
          if (merged.length > 0 && iv.start <= merged[merged.length - 1].end) {
            merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, iv.end);
          } else {
            merged.push({ ...iv });
          }
        }

        let cursor = WORK_START;
        const dayKey = format(day, "yyyy-MM-dd");

        const addGap = (startHour: number, endHour: number) => {
          const durationMin = Math.round((endHour - startHour) * 60);
          if (durationMin < MIN_GAP_MINUTES) return;
          const gap: CapacityGap = { techId: tc.techId, techName: techInfo.name, date: day, dayKey, startHour, endHour, durationMinutes: durationMin };
          gaps.push(gap);
          totalUnusedMinutes += durationMin;
          techWeekUnused += durationMin;
          if (!gapsByTech.has(tc.techId)) gapsByTech.set(tc.techId, []);
          gapsByTech.get(tc.techId)!.push(gap);
        };

        for (const iv of merged) {
          if (iv.start > cursor) addGap(cursor, iv.start);
          cursor = Math.max(cursor, iv.end);
        }
        if (cursor < WORK_END) addGap(cursor, WORK_END);
      }

      if (techWeekUnused >= 120) underutilizedTechs.add(tc.techId);
    }

    gaps.sort((a, b) => b.durationMinutes - a.durationMinutes);

    return {
      totalUnusedMinutes,
      underutilizedTechCount: underutilizedTechs.size,
      topGaps: gaps.slice(0, 10),
      gapsByTech,
    };
  }, [events, techCapacities, technicianMap, referenceDate]);
}
