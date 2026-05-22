import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import ModuleRouteGuard from "@/components/ModuleRouteGuard";
import TenantAdminLayout from "@/components/TenantAdminLayout";

const HmsOverviewPage = lazy(() => import("./pages/HmsOverviewPage"));
const HmsIncidentsListPage = lazy(() => import("./pages/HmsIncidentsListPage"));
const HmsIncidentReportPage = lazy(() => import("./pages/HmsIncidentReportPage"));
const HmsIncidentDetailPage = lazy(() => import("./pages/HmsIncidentDetailPage"));
const HmsTemplatesPage = lazy(() => import("./pages/HmsTemplatesPage"));
const HmsTemplateEditorPage = lazy(() => import("./pages/HmsTemplateEditorPage"));
const HmsSubmissionsPage = lazy(() => import("./pages/HmsSubmissionsPage"));
const HmsSubmissionDetailPage = lazy(() => import("./pages/HmsSubmissionDetailPage"));
const HmsMobilePage = lazy(() => import("./pages/HmsMobilePage"));
const HmsAmlPage = lazy(() => import("./pages/HmsAmlPage"));
const HmsEmployeeAmlPage = lazy(() => import("./pages/HmsEmployeeAmlPage"));
const HmsOvertimePage = lazy(() => import("./pages/HmsOvertimePage"));
const HmsRulesetsPage = lazy(() => import("./pages/HmsRulesetsPage"));
const HmsWorktimeImportPage = lazy(() => import("./pages/HmsWorktimeImportPage"));
const HmsImportBatchesPage = lazy(() => import("./pages/HmsImportBatchesPage"));
const HmsHandbooksPage = lazy(() => import("./pages/HmsHandbooksPage"));
const HmsHandbookDetailPage = lazy(() => import("./pages/HmsHandbookDetailPage"));
const HmsReportsPage = lazy(() => import("./pages/HmsReportsPage"));
const HmsAreasPage = lazy(() => import("./pages/HmsAreasPage"));

function HmsRoute({ children, permission }: { children: React.ReactNode; permission: string }) {
  return (
    <ProtectedRoute requireRole="tenant_member">
      <TenantAdminLayout>
        <ModuleRouteGuard module="hms_hr" permission={permission}>
          <Suspense fallback={<div className="p-6"><div className="h-40 rounded-lg bg-muted animate-pulse" /></div>}>
            {children}
          </Suspense>
        </ModuleRouteGuard>
      </TenantAdminLayout>
    </ProtectedRoute>
  );
}

export const hmsRoutes = [
  <Route key="hms" path="/hms" element={<HmsRoute permission="hms.view"><HmsOverviewPage /></HmsRoute>} />,
  <Route key="hms-incidents" path="/hms/incidents" element={<HmsRoute permission="hms.view"><HmsIncidentsListPage /></HmsRoute>} />,
  <Route key="hms-incidents-new" path="/hms/incidents/new" element={<HmsRoute permission="hms.view"><HmsIncidentReportPage /></HmsRoute>} />,
  <Route key="hms-incidents-id" path="/hms/incidents/:id" element={<HmsRoute permission="hms.view"><HmsIncidentDetailPage /></HmsRoute>} />,
  <Route key="hms-templates" path="/hms/templates" element={<HmsRoute permission="hms.manage"><HmsTemplatesPage /></HmsRoute>} />,
  <Route key="hms-templates-id" path="/hms/templates/:id" element={<HmsRoute permission="hms.manage"><HmsTemplateEditorPage /></HmsRoute>} />,
  <Route key="hms-submissions" path="/hms/submissions" element={<HmsRoute permission="hms.view"><HmsSubmissionsPage /></HmsRoute>} />,
  <Route key="hms-submissions-id" path="/hms/submissions/:id" element={<HmsRoute permission="hms.view"><HmsSubmissionDetailPage /></HmsRoute>} />,
  <Route key="hms-mobile" path="/hms/mobile" element={<HmsRoute permission="hms.view"><HmsMobilePage /></HmsRoute>} />,
  <Route key="hms-aml" path="/hms/aml" element={<HmsRoute permission="hms.manage"><HmsAmlPage /></HmsRoute>} />,
  <Route key="hms-aml-id" path="/hms/aml/:id" element={<HmsRoute permission="hms.manage"><HmsEmployeeAmlPage /></HmsRoute>} />,
  <Route key="hms-overtime" path="/hms/overtime" element={<HmsRoute permission="hms.manage"><HmsOvertimePage /></HmsRoute>} />,
  <Route key="hms-rulesets" path="/hms/rulesets" element={<HmsRoute permission="hms.manage"><HmsRulesetsPage /></HmsRoute>} />,
  <Route key="hms-import" path="/hms/import" element={<HmsRoute permission="hms.manage"><HmsWorktimeImportPage /></HmsRoute>} />,
  <Route key="hms-import-batches" path="/hms/import/batches" element={<HmsRoute permission="hms.manage"><HmsImportBatchesPage /></HmsRoute>} />,
  <Route key="hms-handbooks" path="/hms/handbooks" element={<HmsRoute permission="hms.view"><HmsHandbooksPage /></HmsRoute>} />,
  <Route key="hms-handbooks-id" path="/hms/handbooks/:id" element={<HmsRoute permission="hms.view"><HmsHandbookDetailPage /></HmsRoute>} />,
  <Route key="hms-reports" path="/hms/reports" element={<HmsRoute permission="hms.manage"><HmsReportsPage /></HmsRoute>} />,
  <Route key="hms-areas" path="/hms/areas" element={<HmsRoute permission="hms.view"><HmsAreasPage /></HmsRoute>} />,
];
