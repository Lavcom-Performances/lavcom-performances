import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  ShoppingCart,
  FileText,
  Package,
  BarChart3
} from 'lucide-react';
import { formatCentsToEuros } from '@/lib/salePriceUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { NavLink } from 'react-router-dom';

interface SalesOverview {
  month_total: number;
  year_total: number;
  month_count: number;
  year_count: number;
  avg_basket: number;
}

interface MonthlyRevenue {
  month: number;
  total: number;
  subtotal: number;
  tax: number;
  count: number;
}

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function PlatformSalesOverview() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['platform-sales-overview', currentYear, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_sales_overview', {
        p_year: currentYear,
        p_month: currentMonth,
      });
      if (error) throw error;
      return data as unknown as SalesOverview;
    },
  });

  const { data: monthlyRevenue, isLoading: monthlyLoading } = useQuery({
    queryKey: ['platform-monthly-revenue', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_monthly_revenue', {
        p_year: selectedYear,
      });
      if (error) throw error;
      return (data as unknown as MonthlyRevenue[]) || [];
    },
  });

  // Fill in missing months with zeros
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const monthData = monthlyRevenue?.find((m) => m.month === i + 1);
    return {
      name: MONTH_NAMES[i],
      total: monthData?.total ? monthData.total / 100 : 0,
      count: monthData?.count || 0,
    };
  });

  const quickLinks = [
    { href: '/admin/sales/invoices', icon: FileText, label: 'Factures', desc: 'Liste des factures Stripe' },
    { href: '/admin/sales/products', icon: Package, label: 'Produits', desc: 'CA par produit' },
    { href: '/admin/sales/reports', icon: BarChart3, label: 'Rapports', desc: 'Exports et rapports' },
  ];

  return (
    <>
      <SEOHead 
        title="Ventes | Back-office Plateforme"
        description="Dashboard des ventes"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Ventes & Chiffre d'Affaires</h1>
          <p className="text-muted-foreground">Vue d'ensemble des ventes et factures</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCentsToEuros(overview?.month_total || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">CA ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCentsToEuros(overview?.year_total || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">CA {currentYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Receipt className="h-8 w-8 text-purple-500" />
                <div>
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{overview?.month_count || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Factures mois</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-orange-500" />
                <div>
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{overview?.year_count || 0}</div>
                  )}
                  <p className="text-xs text-muted-foreground">Factures {currentYear}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-teal-500" />
                <div>
                  {overviewLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {formatCentsToEuros(overview?.avg_basket || 0)}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Panier moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickLinks.map((link) => (
            <NavLink key={link.href} to={link.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardContent className="py-4 flex items-center gap-4">
                  <link.icon className="h-10 w-10 text-primary" />
                  <div>
                    <div className="font-semibold">{link.label}</div>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </NavLink>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Chiffre d'affaires mensuel</CardTitle>
            <Tabs value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <TabsList>
                <TabsTrigger value={String(currentYear - 1)}>{currentYear - 1}</TabsTrigger>
                <TabsTrigger value={String(currentYear)}>{currentYear}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis 
                    tickFormatter={(v) => `${v}€`} 
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(2)}€`, 'CA']}
                    labelFormatter={(label) => `${label} ${selectedYear}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
