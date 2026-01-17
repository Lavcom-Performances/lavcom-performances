import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { sanitizeForCsv, buildCsvLine, logExport } from '@/lib/exports';

interface MonthlyRevenue {
  month: number;
  total: number;
  subtotal: number;
  tax: number;
  count: number;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function PlatformSalesReports() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: monthlyRevenue, isLoading } = useQuery({
    queryKey: ['platform-monthly-revenue', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_monthly_revenue', {
        p_year: selectedYear,
      });
      if (error) throw error;
      return (data as unknown as MonthlyRevenue[]) || [];
    },
  });

  const exportMonthlyCSV = async () => {
    const headers = ['Mois', 'HT', 'TVA', 'TTC', 'Nb Factures'];
    
    const rows = Array.from({ length: 12 }, (_, i) => {
      const monthData = monthlyRevenue?.find((m) => m.month === i + 1);
      return [
        sanitizeForCsv(MONTH_NAMES[i]),
        monthData?.subtotal ? (monthData.subtotal / 100).toFixed(2) : '0.00',
        monthData?.tax ? (monthData.tax / 100).toFixed(2) : '0.00',
        monthData?.total ? (monthData.total / 100).toFixed(2) : '0.00',
        monthData?.count || 0,
      ];
    });

    const totalSubtotal = monthlyRevenue?.reduce((sum, m) => sum + (m.subtotal || 0), 0) || 0;
    const totalTax = monthlyRevenue?.reduce((sum, m) => sum + (m.tax || 0), 0) || 0;
    const totalAmount = monthlyRevenue?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;
    const totalCount = monthlyRevenue?.reduce((sum, m) => sum + (m.count || 0), 0) || 0;
    
    rows.push([
      'TOTAL',
      (totalSubtotal / 100).toFixed(2),
      (totalTax / 100).toFixed(2),
      (totalAmount / 100).toFixed(2),
      totalCount,
    ]);
    
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...rows.map(r => buildCsvLine(r, ';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_mensuel_${selectedYear}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();

    logExport({ exportType: 'monthly_revenue_csv', recordCount: 12, extra: { year: selectedYear } });
  };

  const exportAnnualCSV = async () => {
    const headers = ['Année', 'HT', 'TVA', 'TTC', 'Nb Factures'];
    
    const totalSubtotal = monthlyRevenue?.reduce((sum, m) => sum + (m.subtotal || 0), 0) || 0;
    const totalTax = monthlyRevenue?.reduce((sum, m) => sum + (m.tax || 0), 0) || 0;
    const totalAmount = monthlyRevenue?.reduce((sum, m) => sum + (m.total || 0), 0) || 0;
    const totalCount = monthlyRevenue?.reduce((sum, m) => sum + (m.count || 0), 0) || 0;

    const rows = [[
      selectedYear,
      (totalSubtotal / 100).toFixed(2),
      (totalTax / 100).toFixed(2),
      (totalAmount / 100).toFixed(2),
      totalCount,
    ]];
    
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...rows.map(r => buildCsvLine(r, ';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport_annuel_${selectedYear}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();

    logExport({ exportType: 'annual_revenue_csv', recordCount: 1, extra: { year: selectedYear } });
  };

  // Calculate totals for display
  const totals = {
    subtotal: monthlyRevenue?.reduce((sum, m) => sum + (m.subtotal || 0), 0) || 0,
    tax: monthlyRevenue?.reduce((sum, m) => sum + (m.tax || 0), 0) || 0,
    total: monthlyRevenue?.reduce((sum, m) => sum + (m.total || 0), 0) || 0,
    count: monthlyRevenue?.reduce((sum, m) => sum + (m.count || 0), 0) || 0,
  };

  const formatEuros = (cents: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  return (
    <>
      <SEOHead 
        title="Rapports | Back-office Plateforme"
        description="Rapports et exports comptables"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Rapports & Exports</h1>
            <p className="text-muted-foreground">Téléchargez les rapports comptables</p>
          </div>
          <Tabs value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <TabsList>
              <TabsTrigger value={String(currentYear - 1)}>{currentYear - 1}</TabsTrigger>
              <TabsTrigger value={String(currentYear)}>{currentYear}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Synthèse {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{formatEuros(totals.subtotal)}</div>
                  <p className="text-sm text-muted-foreground">CA HT</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{formatEuros(totals.tax)}</div>
                  <p className="text-sm text-muted-foreground">TVA collectée</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{formatEuros(totals.total)}</div>
                  <p className="text-sm text-muted-foreground">CA TTC</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{totals.count}</div>
                  <p className="text-sm text-muted-foreground">Factures</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-blue-500" />
                <div>
                  <CardTitle>Rapport mensuel</CardTitle>
                  <CardDescription>CA mois par mois pour {selectedYear}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={exportMonthlyCSV} className="w-full" disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger CSV mensuel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <CardTitle>Rapport annuel</CardTitle>
                  <CardDescription>Synthèse annuelle {selectedYear}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={exportAnnualCSV} className="w-full" disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger CSV annuel
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Monthly breakdown table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Détail mensuel {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Mois</th>
                      <th className="text-right py-2">HT</th>
                      <th className="text-right py-2">TVA</th>
                      <th className="text-right py-2">TTC</th>
                      <th className="text-right py-2">Factures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthData = monthlyRevenue?.find((m) => m.month === i + 1);
                      const hasData = monthData && monthData.total > 0;

                      return (
                        <tr key={i} className={`border-b ${!hasData ? 'text-muted-foreground' : ''}`}>
                          <td className="py-2">{MONTH_NAMES[i]}</td>
                          <td className="text-right py-2 font-mono">
                            {formatEuros(monthData?.subtotal || 0)}
                          </td>
                          <td className="text-right py-2 font-mono">
                            {formatEuros(monthData?.tax || 0)}
                          </td>
                          <td className="text-right py-2 font-mono font-semibold">
                            {formatEuros(monthData?.total || 0)}
                          </td>
                          <td className="text-right py-2">{monthData?.count || 0}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-muted/50">
                      <td className="py-2">TOTAL</td>
                      <td className="text-right py-2 font-mono">{formatEuros(totals.subtotal)}</td>
                      <td className="text-right py-2 font-mono">{formatEuros(totals.tax)}</td>
                      <td className="text-right py-2 font-mono text-green-600">{formatEuros(totals.total)}</td>
                      <td className="text-right py-2">{totals.count}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
