import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SimulationLayout } from "@/components/layout/SimulationLayout";
import { AdminLayout } from "@/components/platformAdmin/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ViewModeProvider } from "@/hooks/useViewMode";
import { DateRangeProvider } from "@/hooks/useDateRange";
import { RouteTracker } from "@/components/analytics/RouteTracker";
import { PathTracker } from "@/components/analytics/PathTracker";
import { CookieBanner } from "@/components/cookies/CookieBanner";
import { LoginLoggerProvider } from "@/components/auth/LoginLoggerProvider";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { PlatformReadinessBanner } from "@/components/admin/PlatformReadinessBanner";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Subscribe from "./pages/Subscribe";
import SubscribeSimple from "./pages/SubscribeSimple";
import SimulateurPage from "./pages/SimulateurPage";
import SubscribeSimulator from "./pages/SubscribeSimulator";
import SimulatorPaymentSuccess from "./pages/SimulatorPaymentSuccess";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";
import SelectLaundromat from "./pages/SelectLaundromat";
import Dashboard from "./pages/Dashboard";
import Operations from "./pages/Operations";
import ImportExport from "./pages/ImportExport";
import AdminUsers from "./pages/AdminUsers";
import AdminExpertRequests from "./pages/AdminExpertRequests";
import AdminCronLogs from "./pages/AdminCronLogs";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSystemStatus from "./pages/AdminSystemStatus";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";
import { PlatformAdminRoute } from "./components/admin/PlatformAdminRoute";
import PlatformAdminHome from "./pages/platform/PlatformAdminHome";
import PlatformAdminUsers from "./pages/platform/PlatformAdminUsers";
import PlatformAdminSites from "./pages/platform/PlatformAdminSites";
import PlatformAdminAnalytics from "./pages/platform/PlatformAdminAnalytics";
import PlatformAdminRoles from "./pages/platform/PlatformAdminRoles";
import PlatformAdminPermissions from "./pages/platform/PlatformAdminPermissions";
import PlatformAdminAuditLogs from "./pages/platform/PlatformAdminAuditLogs";
import PlatformAdminLoginHistory from "./pages/platform/PlatformAdminLoginHistory";
import PlatformSalesOverview from "./pages/platform/PlatformSalesOverview";
import PlatformSalesInvoices from "./pages/platform/PlatformSalesInvoices";
import PlatformSalesProducts from "./pages/platform/PlatformSalesProducts";
import PlatformSalesReports from "./pages/platform/PlatformSalesReports";
import PlatformBetaCompanies from "./pages/platform/PlatformBetaCompanies";
import PlatformBetaHealth from "./pages/platform/PlatformBetaHealth";
import BetaBillingCheck from "./pages/platform/BetaBillingCheck";
import BetaOpsPage from "./pages/platform/BetaOpsPage";
import PlatformOrphanPages from "./pages/platform/PlatformOrphanPages";
import PlatformOrphanFiles from "./pages/platform/PlatformOrphanFiles";
import PlatformAIUsage from "./pages/platform/PlatformAIUsage";
import PlatformAdminArchives from "./pages/platform/PlatformAdminArchives";
import PlatformAdminComplianceReports from "./pages/platform/PlatformAdminComplianceReports";
import RecomputeAuditTrail from "./pages/platform/RecomputeAuditTrail";
import KnowledgeBasePage from "./pages/platform/KnowledgeBasePage";
import KnowledgeSourcesPage from "./pages/platform/KnowledgeSourcesPage";
import FaqBuilderPage from "./pages/platform/FaqBuilderPage";
import RulesEnginePage from "./pages/platform/RulesEnginePage";
import DataTrustScorePage from "./pages/platform/DataTrustScorePage";
import AdminExportsPage from "./pages/admin/AdminExportsPage";
import ExportsPage from "./pages/app/ExportsPage";
import NotFound from "./pages/NotFound";
import MentionsLegales from "./pages/MentionsLegales";
import CGV from "./pages/CGV";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import LaundromatSettings from "./pages/LaundromatSettings";
// CompanySettings removed - deprecated, redirects to /settings
import ProfilePage from "./pages/ProfilePage";
import SecurityPage from "./pages/SecurityPage";
import SubscriptionManagement from "./pages/SubscriptionManagement";
import BillingHistory from "./pages/BillingHistory";
import AcceptInvitation from "./pages/AcceptInvitation";

// Simulation pages (new layout)
import SimulationProjectPage from "./pages/simulation/SimulationProjectPage";
import SimulationLocalPage from "./pages/simulation/SimulationLocalPage";
import SimulationChargesPage from "./pages/simulation/SimulationChargesPage";
import SimulationResultsPage from "./pages/simulation/SimulationResultsPage";

import MonthlyRevenuePage from "./pages/charts/MonthlyRevenuePage";
import DailyRevenuePage from "./pages/charts/DailyRevenuePage";
import PaymentDistributionPage from "./pages/charts/PaymentDistributionPage";
import MachineTypePage from "./pages/charts/MachineTypePage";
import SalesHeatmapPage from "./pages/charts/SalesHeatmapPage";
import ProductsRevenuePage from "./pages/charts/ProductsRevenuePage";
import AnnualComparisonPage from "./pages/charts/AnnualComparisonPage";
import HourlyFrequencyPage from "./pages/charts/HourlyFrequencyPage";
import DailyFrequencyPage from "./pages/charts/DailyFrequencyPage";
import HalfHourlyFrequencyPage from "./pages/charts/HalfHourlyFrequencyPage";
import OccupancyRatePage from "./pages/charts/OccupancyRatePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import PredictiveMaintenance from "./pages/PredictiveMaintenance";
import ProfitabilityPage from "./pages/ProfitabilityPage";
import SettingsPage from "./pages/SettingsPage";
import RolesManagement from "./pages/RolesManagement";
import CompanyRolesPage from "./pages/CompanyRolesPage";
import TeamPage from "./pages/TeamPage";
import GettingStarted from "./pages/GettingStarted";
import HelpPage from "./pages/HelpPage";
import CostsSettingsPage from "./pages/settings/CostsSettingsPage";
import GoalsSettingsPage from "./pages/settings/GoalsSettingsPage";
import DemoPage from "./pages/DemoPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import BetaRulesPage from "./pages/BetaRulesPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent auto-refetch on window focus which can reset form inputs
      refetchOnWindowFocus: false,
      // Keep data fresh for 5 minutes before considering stale
      staleTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ViewModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
      <BrowserRouter>
        <LoginLoggerProvider>
        <ImpersonationProvider>
        <PlatformReadinessBanner />
        <ImpersonationBanner />
        <RouteTracker />
        <PathTracker />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscribe" element={<SubscribeSimple />} />
          <Route path="/subscribe-full" element={<Subscribe />} />
          <Route path="/simulateur" element={<SimulateurPage />} />
          <Route path="/subscribe-simulator" element={<SubscribeSimulator />} />
          <Route path="/simulator-payment-success" element={<SimulatorPaymentSuccess />} />
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />
          <Route path="/invitation" element={<AcceptInvitation />} />
          <Route path="/select-laundromat" element={<SelectLaundromat />} />
          {/* DEPRECATED: redirect to /settings */}
          <Route path="/company-settings" element={<Navigate to="/settings" replace />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/cgv" element={<CGV />} />
          <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
          
          {/* Simulation routes with dedicated layout (no sidebar) */}
          <Route element={<SimulationLayout />}>
            <Route path="/simulation" element={<SimulationProjectPage />} />
            <Route path="/simulation/local" element={<SimulationLocalPage />} />
            <Route path="/simulation/charges" element={<SimulationChargesPage />} />
            <Route path="/simulation/results" element={<SimulationResultsPage />} />
          </Route>
          
          {/* Platform Admin routes with dedicated admin layout */}
          <Route element={
            <ProtectedRoute>
              <PlatformAdminRoute>
                <AdminLayout />
              </PlatformAdminRoute>
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<PlatformAdminHome />} />
            <Route path="/admin/users" element={<PlatformAdminUsers />} />
            <Route path="/admin/sites" element={<PlatformAdminSites />} />
            <Route path="/admin/analytics" element={<PlatformAdminAnalytics />} />
            <Route path="/admin/roles" element={<PlatformAdminRoles />} />
            <Route path="/admin/permissions" element={<PlatformAdminPermissions />} />
            <Route path="/admin/audit-logs" element={<PlatformAdminAuditLogs />} />
            <Route path="/admin/login-history" element={<PlatformAdminLoginHistory />} />
            <Route path="/admin/system-status" element={<AdminSystemStatus />} />
            <Route path="/admin/expert-requests" element={<AdminExpertRequests />} />
            <Route path="/admin/cron-logs" element={<AdminCronLogs />} />
            <Route path="/admin/orphan-pages" element={<PlatformOrphanPages />} />
            <Route path="/admin/orphan-files" element={<PlatformOrphanFiles />} />
            <Route path="/admin/ai-usage" element={<PlatformAIUsage />} />
            <Route path="/admin/archives" element={<PlatformAdminArchives />} />
            <Route path="/admin/compliance-reports" element={<PlatformAdminComplianceReports />} />
            <Route path="/admin/recompute-audit" element={<RecomputeAuditTrail />} />
            <Route path="/admin/exports" element={<AdminExportsPage />} />
            <Route path="/admin/beta/health" element={<PlatformBetaHealth />} />
            <Route path="/admin/beta/billing-check" element={<BetaBillingCheck />} />
            <Route path="/admin/beta/ops" element={<BetaOpsPage />} />
            {/* Knowledge System routes */}
            <Route path="/admin/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/admin/knowledge/sources" element={<KnowledgeSourcesPage />} />
            <Route path="/admin/knowledge/faq" element={<FaqBuilderPage />} />
            <Route path="/admin/knowledge/rules" element={<RulesEnginePage />} />
            <Route path="/admin/knowledge/dts" element={<DataTrustScorePage />} />
          </Route>
          
          {/* Platform Admin billing routes (require billing access) */}
          <Route element={
            <ProtectedRoute>
              <PlatformAdminRoute requireBilling>
                <AdminLayout />
              </PlatformAdminRoute>
            </ProtectedRoute>
          }>
            <Route path="/admin/sales" element={<PlatformSalesOverview />} />
            <Route path="/admin/sales/invoices" element={<PlatformSalesInvoices />} />
            <Route path="/admin/sales/products" element={<PlatformSalesProducts />} />
            <Route path="/admin/sales/reports" element={<PlatformSalesReports />} />
            <Route path="/admin/sales/beta" element={<PlatformBetaCompanies />} />
          </Route>
          
          {/* Protected app routes with sidebar layout */}
          <Route element={
            <ProtectedRoute>
              <DateRangeProvider>
                <AppLayout />
              </DateRangeProvider>
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/getting-started" element={<GettingStarted />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/subscription" element={<SubscriptionManagement />} />
            <Route path="/billing-history" element={<BillingHistory />} />
            <Route path="/laundromat-settings" element={<LaundromatSettings />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/charges" element={<CostsSettingsPage />} />
            <Route path="/settings/objectives" element={<GoalsSettingsPage />} />
            <Route path="/roles-management" element={<RolesManagement />} />
            <Route path="/company-roles" element={<CompanyRolesPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/aide" element={<HelpPage />} />
            <Route path="/beta" element={<BetaRulesPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/exports" element={<ExportsPage />} />
            {/* Chart pages */}
            <Route path="/charts/monthly" element={<MonthlyRevenuePage />} />
            <Route path="/charts/daily" element={<DailyRevenuePage />} />
            <Route path="/charts/payments" element={<PaymentDistributionPage />} />
            <Route path="/charts/machines" element={<MachineTypePage />} />
            <Route path="/charts/heatmap" element={<SalesHeatmapPage />} />
            <Route path="/charts/products" element={<ProductsRevenuePage />} />
            <Route path="/charts/annual" element={<AnnualComparisonPage />} />
            <Route path="/charts/hourly" element={<HourlyFrequencyPage />} />
            <Route path="/charts/daily-freq" element={<DailyFrequencyPage />} />
            <Route path="/charts/half-hourly" element={<HalfHourlyFrequencyPage />} />
            <Route path="/charts/occupancy" element={<OccupancyRatePage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/maintenance" element={<PredictiveMaintenance />} />
            <Route path="/profitability" element={<ProfitabilityPage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieBanner />
        </ImpersonationProvider>
        </LoginLoggerProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ViewModeProvider>
  </QueryClientProvider>
);

export default App;
