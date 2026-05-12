import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { differenceInDays, parseISO } from "date-fns";

export type NotificationCategory = "critical" | "warning" | "info";

export type AppNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
};

const STORAGE_KEY = "vpk_notif_read";

function loadReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

const CATEGORY_ORDER: Record<NotificationCategory, number> = { critical: 0, warning: 1, info: 2 };

export function useNotifications() {
  const { tenantId } = useAuth();
  const [rawNotifications, setRawNotifications] = useState<Omit<AppNotification, "isRead">[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);

  const fetchNotifications = useCallback(async () => {
    if (!tenantId) return;

    const notifs: Omit<AppNotification, "isRead">[] = [];
    const now = new Date();

    // 1. Overdue service agreements (critical)
    const { data: overdueAgreements } = await supabase
      .from("service_agreements")
      .select("id, agreement_number, next_visit_due")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .eq("status", "active")
      .lt("next_visit_due", now.toISOString().slice(0, 10));

    overdueAgreements?.forEach((a) => {
      notifs.push({
        id: `agreement_overdue_${a.id}`,
        category: "critical",
        title: "Forfalt serviceavtale",
        message: `Avtale ${a.agreement_number} har passert forfallsdato`,
        link: `/tenant/crm/agreements/${a.id}`,
      });
    });

    // 2. Warranty cases open more than 14 days (critical)
    const { data: oldWarranties } = await supabase
      .from("warranty_cases")
      .select("id, warranty_number, created_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .in("status", ["open", "investigating"]);

    oldWarranties?.forEach((w) => {
      const days = differenceInDays(now, parseISO(w.created_at));
      if (days >= 14) {
        notifs.push({
          id: `warranty_old_${w.id}`,
          category: "critical",
          title: "Garantisak ubehandlet",
          message: `${w.warranty_number} har vært åpen i ${days} dager`,
          link: `/tenant/crm/warranties/${w.id}`,
        });
      }
    });

    // 3. Active jobs without scheduled_start (warning) — max 5
    const { data: unscheduledJobs } = await supabase
      .from("jobs")
      .select("id, job_number, title")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .is("scheduled_start", null)
      .in("status", ["planned", "on_hold"])
      .order("created_at", { ascending: false })
      .limit(5);

    unscheduledJobs?.forEach((j) => {
      notifs.push({
        id: `job_unscheduled_${j.id}`,
        category: "warning",
        title: "Jobb ikke planlagt",
        message: `${j.job_number} ${j.title} mangler tidspunkt`,
        link: `/tenant/crm/jobs/${j.id}`,
      });
    });

    // 4. Technicians without user_id (warning)
    const { data: techsNoUser } = await supabase
      .from("technicians")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .is("user_id", null);

    techsNoUser?.forEach((t) => {
      notifs.push({
        id: `tech_no_userid_${t.id}`,
        category: "warning",
        title: "Tekniker ikke koblet",
        message: `${t.name} mangler brukerkobling for innlogging`,
        link: `/tenant/users`,
      });
    });

    // 5. Won deals (last 5) without follow-up (info)
    const { data: wonDeals } = await supabase
      .from("crm_deals")
      .select("id, title")
      .eq("tenant_id", tenantId)
      .eq("stage", "won")
      .order("created_at", { ascending: false })
      .limit(5);

    wonDeals?.forEach((d) => {
      notifs.push({
        id: `deal_won_${d.id}`,
        category: "info",
        title: "Vunnet salg",
        message: `${d.title} – opprett jobb eller serviceavtale`,
        link: `/tenant/crm/deals/${d.id}`,
      });
    });

    notifs.sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
    setRawNotifications(notifs);
  }, [tenantId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const notifications: AppNotification[] = rawNotifications.map((n) => ({
    ...n,
    isRead: readIds.has(n.id),
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      rawNotifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  }, [rawNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
