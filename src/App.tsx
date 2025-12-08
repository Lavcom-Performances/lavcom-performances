import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SimulationLayout } from "@/components/layout/SimulationLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import Subscribe from "./pages/Subscribe";
import SimulateurPage from "./pages/SimulateurPage";
import SubscribeSimulator from "./pages/SubscribeSimulator";
import SelectLaundromat from "./pages/SelectLaundromat";
import Dashboard from "./pages/Dashboard";
import Operations from "./pages/Operations";
import ImportExport from "./pages/ImportExport";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import LaundromatSettings from "./pages/LaundromatSettings";
import CompanySettings from "./pages/CompanySettings";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/simulateur" element={<SimulateurPage />} />
          <Route path="/subscribe-simulator" element={<SubscribeSimulator />} />
          <Route path="/select-laundromat" element={<SelectLaundromat />} />
          <Route path="/company-settings" element={<CompanySettings />} />
          
          {/* Simulation routes with dedicated layout (no sidebar) */}
          <Route element={<SimulationLayout />}>
            <Route path="/simulation" element={<SimulationProjectPage />} />
            <Route path="/simulation/local" element={<SimulationLocalPage />} />
            <Route path="/simulation/charges" element={<SimulationChargesPage />} />
            <Route path="/simulation/results" element={<SimulationResultsPage />} />
          </Route>
          
          {/* App routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/laundromat-settings" element={<LaundromatSettings />} />
            <Route path="/operations" element={<Operations />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
