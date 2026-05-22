import { AlertTriangle, ShieldCheck } from "lucide-react"
import { ReactNode, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useTenantModules } from "@/hooks/useTenantModules"
import type { EmployeeProfileLookup } from "../types"

// ─────────────────────────────────────────────────────────────────────────────
// Context shape — identical to MCS Ressurs HmsContextGate, with companyId
// renamed to tenantId.
// ─────────────────────────────────────────────────────────────────────────────

export type HmsContextState = {
  tenantId: string | null
  ready: boolean
  loading: boolean
  error: Error | null
  noAccess: boolean
  canManageHms: boolean
  employeeProfiles: EmployeeProfileLookup[]
  refetch: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee profiles
// MCS used user_accounts + people. vpkontroll uses the profiles table
// (profiles.user_id = auth.users.id, profiles.id is a separate PK).
// ─────────────────────────────────────────────────────────────────────────────

export function useHmsEmployeeProfiles(tenantId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["employee-profiles", "hms-context", tenantId],
    enabled: !!tenantId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: eps, error: epsError } = await supabase
        .from("employee_work_profiles")
        .select("user_id, external_employee_id")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
      if (epsError) throw epsError

      const userIds = [...new Set((eps ?? []).map((p) => p.user_id).filter(Boolean))]

      let profileInfo: Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", userIds)
        if (profileError) throw profileError
        profileInfo = Object.fromEntries(
          (profiles ?? []).map((p) => [
            p.user_id,
            { full_name: p.full_name ?? null, email: p.email ?? null, avatar_url: p.avatar_url ?? null },
          ])
        )
      }

      return (eps ?? []).map((p) => ({
        user_id: p.user_id,
        external_employee_id: p.external_employee_id ?? null,
        full_name: profileInfo[p.user_id]?.full_name ?? null,
        email: profileInfo[p.user_id]?.email ?? null,
        avatar_url: profileInfo[p.user_id]?.avatar_url ?? null,
      })) satisfies EmployeeProfileLookup[]
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Context hook
// ─────────────────────────────────────────────────────────────────────────────

export function useHmsContextReady(): HmsContextState {
  const { user, tenantId, isMasterAdmin, isTenantAdmin } = useAuth()
  const permissions = usePermissions()
  const modules = useTenantModules()

  const isAdmin = isMasterAdmin || isTenantAdmin

  const employeeProfilesQuery = useHmsEmployeeProfiles(tenantId, !!user?.id)

  // Admins bypass module-visibility checks.
  // Regular users need the hms_hr module enabled in tenant_modules.
  // Note: until hms_hr is added to the module_name enum, hasModule("hms_hr")
  // will always return false for non-admins. Extend the enum or provision a
  // tenant_modules row to enable for regular users.
  const moduleVisible = isAdmin || modules.hasModule("hms_hr")
  const canViewHms = isAdmin || permissions.hasPermission("hms.view")
  const canManageHms = isAdmin || permissions.hasPermission("hms.manage")

  const loading = permissions.loading || modules.loading || employeeProfilesQuery.isLoading
  const error = (employeeProfilesQuery.error as Error | null) ?? null
  const ready = !!tenantId && !!user?.id && !loading && !error && moduleVisible && canViewHms

  return useMemo(
    () => ({
      tenantId,
      ready,
      loading,
      error,
      noAccess: !!tenantId && !loading && !error && (!moduleVisible || !canViewHms),
      canManageHms,
      employeeProfiles: employeeProfilesQuery.data ?? [],
      refetch: () => {
        permissions.refetch()
        employeeProfilesQuery.refetch()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManageHms, canViewHms, tenantId, employeeProfilesQuery.data, employeeProfilesQuery.error, employeeProfilesQuery.isLoading, error, loading, moduleVisible, ready]
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Gate component
// ─────────────────────────────────────────────────────────────────────────────

export function HmsContextGate({
  children,
  label = "Laster HMS & HR…",
}: {
  children: ReactNode
  label?: string
}) {
  const context = useHmsContextReady()

  if (context.loading) return <HmsLoading label={label} />

  if (!context.tenantId) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Velg selskap for HMS &amp; HR</AlertTitle>
          <AlertDescription>
            HMS-data krever en aktiv leietaker-kontekst.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (context.error) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Kunne ikke laste HMS &amp; HR</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{context.error.message || "En grunnleggende HMS-spørring feilet."}</p>
            <Button variant="outline" size="sm" onClick={context.refetch}>
              Prøv igjen
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (context.noAccess) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Ingen tilgang til HMS &amp; HR</AlertTitle>
          <AlertDescription>
            HMS &amp; HR er ikke aktivert for denne brukeren eller dette selskapet.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

export function HmsLoading({ label = "Laster HMS & HR…" }: { label?: string }) {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <ShieldCheck className="h-5 w-5 animate-pulse" />
        </div>
        <span>{label}</span>
      </div>
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  )
}
