import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { VerticalProvider } from "@/contexts/VerticalContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModuleRouteGuard from "@/components/ModuleRouteGuard";
import MasterAdminLayout from "@/components/MasterAdminLayout";
import TenantAdminLayout from "@/components/TenantAdminLayout";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import RoleSelectorPage from "@/pages/RoleSelectorPage";
import DemoSignupPage from "@/pages/DemoSignupPage";
import RegisterPage from "@/pages/RegisterPage";
import AdminTrialConvertPage from "@/pages/admin/AdminTrialConvertPage";
import LandingPage from "@/pages/public/LandingPage";
import PricingPage from "@/pages/public/PricingPage";
import VerticalPage from "@/pages/public/VerticalPage";
import VerticalIndexPage from "@/pages/public/VerticalIndexPage";
import AboutPage from "@/pages/public/AboutPage";
import ContactPage from "@/pages/public/ContactPage";
import AdminCmsPage from "@/pages/admin/AdminCmsPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import TenantsPage from "@/pages/admin/TenantsPage";
import ModulesPage from "@/pages/admin/ModulesPage";
import IntegrationsPage from "@/pages/admin/IntegrationsPage";
import AdminAccessControlPage from "@/pages/admin/AccessControlPage";
import TenantDetailPage from "@/pages/admin/TenantDetailPage";
import PlansPage from "@/pages/admin/PlansPage";
import SubscriptionsPage from "@/pages/admin/SubscriptionsPage";
import TrialsPage from "@/pages/admin/TrialsPage";
import VerticalsPage from "@/pages/admin/VerticalsPage";
import VerticalEditPage from "@/pages/admin/VerticalEditPage";
import VerticalEditorPage from "@/pages/admin/VerticalEditorPage";
import PlatformModulesPage from "@/pages/admin/PlatformModulesPage";
import AdminSupportPage from "@/pages/admin/AdminSupportPage";
import AdminSupportTicketPage from "@/pages/admin/AdminSupportTicketPage";
import AdminSettingsIntegrationsPage from "@/pages/admin/AdminSettingsIntegrationsPage";
import AdminSettingsTeamPage from "@/pages/admin/AdminSettingsTeamPage";
import AdminPlanFormPage from "@/pages/admin/AdminPlanFormPage";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import AdminProjectNewPage from "@/pages/admin/AdminProjectNewPage";
import AdminProjectTaskPage from "@/pages/admin/AdminProjectTaskPage";
import TenantDashboardPage from "@/pages/tenant/TenantDashboardPage";
import TenantModulesPage from "@/pages/tenant/TenantModulesPage";
import TenantIntegrationsPage from "@/pages/tenant/TenantIntegrationsPage";
import TenantUsersPage from "@/pages/tenant/TenantUsersPage";
import PostkontoretPage from "@/pages/tenant/PostkontoretPage";
import RessursplanleggerPage from "@/pages/tenant/RessursplanleggerPage";
import TenantAccessControlPage from "@/pages/tenant/AccessControlPage";
import CrmContactsPage from "@/pages/tenant/CrmContactsPage";
import CrmCompaniesPage from "@/pages/tenant/CrmCompaniesPage";
import CompanyFormPage from "@/pages/tenant/CompanyFormPage";
import CrmDealsPage from "@/pages/tenant/CrmDealsPage";
import SalgFormPage from "@/pages/tenant/SalgFormPage";
import CompanyDetailPage from "@/pages/tenant/CompanyDetailPage";
import AssetDetailPage from "@/pages/tenant/AssetDetailPage";
import JobDetailPage from "@/pages/tenant/JobDetailPage";
import SupportPage from "@/pages/tenant/SupportPage";
import SupportNewPage from "@/pages/tenant/SupportNewPage";
import SupportTicketPage from "@/pages/tenant/SupportTicketPage";
import AgreementDetailPage from "@/pages/tenant/AgreementDetailPage";
import WarrantyDetailPage from "@/pages/tenant/WarrantyDetailPage";
import JobsListPage from "@/pages/tenant/JobsListPage";
import JobFormPage from "@/pages/tenant/JobFormPage";
import AssetsListPage from "@/pages/tenant/AssetsListPage";
import AgreementsListPage from "@/pages/tenant/AgreementsListPage";
import AgreementFormPage from "@/pages/tenant/AgreementFormPage";
import WarrantyListPage from "@/pages/tenant/WarrantyListPage";
import WarrantyFormPage from "@/pages/tenant/WarrantyFormPage";
import AssetFormPage from "@/pages/tenant/AssetFormPage";
import DealDetailPage from "@/pages/tenant/DealDetailPage";
import ContactDetailPage from "@/pages/tenant/ContactDetailPage";
import SiteDetailPage from "@/pages/tenant/SiteDetailPage";
import CustomerImportPage from "@/pages/tenant/CustomerImportPage";
import TemplatesPage from "@/pages/tenant/TemplatesPage";
import TemplateBuilderPage from "@/pages/tenant/TemplateBuilderPage";
import FormSubmissionsPage from "@/pages/tenant/FormSubmissionsPage";
import PublicFormPage from "@/pages/PublicFormPage";
import NotFound from "@/pages/NotFound";
import NoTenantPage from "@/pages/NoTenantPage";
import TechnicianDashboardPage from "@/pages/tenant/TechnicianDashboardPage";
import TechnicianMobileLayout from "@/layouts/TechnicianMobileLayout";
import TodayPage from "@/pages/technician/TodayPage";
import TechJobDetailPage from "@/pages/technician/TechJobDetailPage";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function TechnicianRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole="tenant_member">
      <TechnicianMobileLayout>{children}</TechnicianMobileLayout>
    </ProtectedRoute>
  );
}

/** Wrapper for operative tenant routes – requires tenant membership, not admin role */
function TenantRoute({ children, module, permission }: { children: React.ReactNode; module?: string; permission?: string }) {
  const inner = module ? (
    <ModuleRouteGuard module={module} permission={permission}>{children}</ModuleRouteGuard>
  ) : (
    children
  );
  return (
    <ProtectedRoute requireRole="tenant_member">
      <TenantAdminLayout>{inner}</TenantAdminLayout>
    </ProtectedRoute>
  );
}

/** Wrapper for admin-only tenant routes – requires tenant_admin role */
function TenantAdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireRole="tenant_admin">
      <TenantAdminLayout>{children}</TenantAdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  const { user, loading, isPasswordRecovery, isMasterAdmin, isTenantAdmin, tenantId } = useAuth();
  const [isTechnicianUser, setIsTechnicianUser] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !tenantId || isTenantAdmin || isMasterAdmin) {
      setIsTechnicianUser(false);
      return;
    }
    supabase
      .from("technicians")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .then(({ data }) => setIsTechnicianUser(!!(data?.[0])));
  }, [loading, user, tenantId, isTenantAdmin, isMasterAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/reset-password" replace />} />
      </Routes>
    );
  }

  if (isTechnicianUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getHomeRedirect = () => {
    if (!user) return "/login";
    if (isMasterAdmin && isTenantAdmin) return "/select-role";
    if (isMasterAdmin) return "/admin";
    if (!isTenantAdmin && isTechnicianUser) return "/technician/today";
    if (isTenantAdmin || tenantId) return "/tenant";
    return "/no-tenant";
  };

  return (
    <Routes>
      {/* Public marketing routes — no auth required */}
      <Route path="/priser" element={<PricingPage />} />
      <Route path="/bransjer" element={<VerticalIndexPage />} />
      <Route path="/bransjer/:slug" element={<VerticalPage />} />
      <Route path="/om-oss" element={<AboutPage />} />
      <Route path="/kontakt" element={<ContactPage />} />

      <Route path="/login" element={user ? <Navigate to={getHomeRedirect()} replace /> : <LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/demo" element={<DemoSignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/select-role" element={user ? <RoleSelectorPage /> : <Navigate to="/login" replace />} />
      <Route path="/no-tenant" element={user ? <NoTenantPage /> : <Navigate to="/login" replace />} />

      {/* Master Admin routes – require master_admin role */}
      <Route path="/admin" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><DashboardPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/tenants" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><TenantsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/tenants/:id" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><TenantDetailPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/modules" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><ModulesPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><IntegrationsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/access-control" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminAccessControlPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><PlansPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/plans/new" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminPlanFormPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/plans/:id" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminPlanFormPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/subscriptions" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><SubscriptionsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/trials" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><TrialsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/trials/:id/convert" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminTrialConvertPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/verticals" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><VerticalsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/verticals/new" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><VerticalEditPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/verticals/:id" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><VerticalEditorPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/verticals/:id/edit" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><VerticalEditorPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/platform-modules" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><PlatformModulesPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/support" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminSupportPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/support/:id" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminSupportTicketPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings/integrations" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminSettingsIntegrationsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings/team" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminSettingsTeamPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/projects" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminProjectsPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/projects/new" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminProjectNewPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/projects/:id" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminProjectTaskPage /></MasterAdminLayout></ProtectedRoute>} />
      <Route path="/admin/cms" element={<ProtectedRoute requireRole="master_admin"><MasterAdminLayout><AdminCmsPage /></MasterAdminLayout></ProtectedRoute>} />

      {/* Tenant: Operative routes – open for all tenant members */}
      <Route path="/tenant" element={<TenantRoute><TenantDashboardPage /></TenantRoute>} />
      <Route path="/tenant/postkontoret" element={<TenantRoute module="postkontoret" permission="module.postkontoret"><PostkontoretPage /></TenantRoute>} />
      <Route path="/tenant/ressursplanlegger" element={<TenantRoute module="ressursplanlegger" permission="module.ressursplanlegger"><RessursplanleggerPage /></TenantRoute>} />
      <Route path="/tenant/mine-oppdrag" element={<TenantRoute><TechnicianDashboardPage /></TenantRoute>} />

      {/* CRM routes – open for tenant members with module + permission checks */}
      <Route path="/tenant/crm/contacts" element={<TenantRoute module="crm" permission="module.crm"><CrmContactsPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies" element={<TenantRoute module="crm" permission="module.crm"><CrmCompaniesPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals" element={<TenantRoute module="crm" permission="module.crm"><CrmDealsPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals/new" element={<TenantRoute module="crm" permission="module.crm"><SalgFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><SalgFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs" element={<TenantRoute module="crm" permission="module.crm"><JobsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs/new" element={<TenantRoute module="crm" permission="module.crm"><JobFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><JobFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets" element={<TenantRoute module="crm" permission="module.crm"><AssetsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets/new" element={<TenantRoute module="crm" permission="module.crm"><AssetFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><AssetFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements" element={<TenantRoute module="crm" permission="module.crm"><AgreementsListPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements/new" element={<TenantRoute module="crm" permission="module.crm"><AgreementFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><AgreementFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranties" element={<TenantRoute module="crm" permission="module.crm"><WarrantyListPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranties/new" element={<TenantRoute module="crm" permission="module.crm"><WarrantyFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranties/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><WarrantyFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies/new" element={<TenantRoute module="crm" permission="module.crm"><CompanyFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies/:id/edit" element={<TenantRoute module="crm" permission="module.crm"><CompanyFormPage /></TenantRoute>} />
      <Route path="/tenant/crm/companies/:id" element={<TenantRoute module="crm" permission="module.crm"><CompanyDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/assets/:id" element={<TenantRoute module="crm" permission="module.crm"><AssetDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/jobs/:id" element={<TenantRoute module="crm" permission="module.crm"><JobDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/agreements/:id" element={<TenantRoute module="crm" permission="module.crm"><AgreementDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/warranty/:id" element={<TenantRoute module="crm" permission="module.crm"><WarrantyDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/deals/:id" element={<TenantRoute module="crm" permission="module.crm"><DealDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/contacts/:id" element={<TenantRoute module="crm" permission="module.crm"><ContactDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/sites/:id" element={<TenantRoute module="crm" permission="module.crm"><SiteDetailPage /></TenantRoute>} />
      <Route path="/tenant/crm/customers/import" element={<TenantRoute module="crm" permission="module.crm"><CustomerImportPage /></TenantRoute>} />
      <Route path="/tenant/templates" element={<TenantRoute module="crm" permission="module.crm"><TemplatesPage /></TenantRoute>} />
      <Route path="/tenant/templates/new" element={<TenantRoute module="crm" permission="module.crm"><TemplateBuilderPage /></TenantRoute>} />
      <Route path="/tenant/templates/submissions" element={<TenantRoute module="crm" permission="module.crm"><FormSubmissionsPage /></TenantRoute>} />
      <Route path="/tenant/templates/:id" element={<TenantRoute module="crm" permission="module.crm"><TemplateBuilderPage /></TenantRoute>} />

      {/* Tenant: Admin-only routes – require tenant_admin role */}
      <Route path="/tenant/modules" element={<TenantAdminRoute><TenantModulesPage /></TenantAdminRoute>} />
      <Route path="/tenant/integrations" element={<TenantAdminRoute><TenantIntegrationsPage /></TenantAdminRoute>} />
      <Route path="/tenant/users" element={<TenantAdminRoute><TenantUsersPage /></TenantAdminRoute>} />
      <Route path="/tenant/access-control" element={<TenantAdminRoute><TenantAccessControlPage /></TenantAdminRoute>} />
      <Route path="/tenant/support" element={<TenantRoute><SupportPage /></TenantRoute>} />
      <Route path="/tenant/support/new" element={<TenantRoute><SupportNewPage /></TenantRoute>} />
      <Route path="/tenant/support/:id" element={<TenantRoute><SupportTicketPage /></TenantRoute>} />

      {/* Technician mobile routes – uses TechnicianMobileLayout (no sidebar) */}
      <Route path="/technician/today" element={<TechnicianRoute><TodayPage /></TechnicianRoute>} />
      <Route path="/technician/jobs/:id" element={<TechnicianRoute><TechJobDetailPage /></TechnicianRoute>} />

      {/* Public form route - no auth required */}
      <Route path="/forms/:publishKey" element={<PublicFormPage />} />

      <Route path="/" element={user ? <Navigate to={getHomeRedirect()} replace /> : <LandingPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <VerticalProvider>
            <AppRoutes />
          </VerticalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
