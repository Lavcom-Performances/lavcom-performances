import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SelectLaundromat from "./pages/SelectLaundromat";
import Dashboard from "./pages/Dashboard";
import Operations from "./pages/Operations";
import ImportExport from "./pages/ImportExport";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

// Chart pages
import MonthlyRevenuePage from "./pages/charts/MonthlyRevenuePage";
import DailyRevenuePage from "./pages/charts/DailyRevenuePage";
import PaymentDistributionPage from "./pages/charts/PaymentDistributionPage";
import MachineTypePage from "./pages/charts/MachineTypePage";
import SalesHeatmapPage from "./pages/charts/SalesHeatmapPage";
import ProductsRevenuePage from "./pages/charts/ProductsRevenuePage";

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
          <Route path="/select-laundromat" element={<SelectLaundromat />} />
          
          {/* App routes with sidebar layout */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
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
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
