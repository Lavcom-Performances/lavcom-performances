import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SEOHead } from '@/components/seo/SEOHead';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Package } from 'lucide-react';
import { format } from 'date-fns';
import { formatCentsToEuros, labelForPrice, classifySaleType } from '@/lib/salePriceUtils';
import { Badge } from '@/components/ui/badge';
import { sanitizeForCsv, buildCsvLine, logExport } from '@/lib/exports';

interface ProductSale {
  price_id: string;
  description: string | null;
  sales_count: number;
  total_amount: number;
}

export default function PlatformSalesProducts() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: products, isLoading } = useQuery({
    queryKey: ['platform-sales-products', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_platform_admin_products_sales', {
        p_year: selectedYear,
      });
      if (error) throw error;
      return (data as unknown as ProductSale[]) || [];
    },
  });

  const exportCSV = async () => {
    if (!products?.length) return;
    
    const headers = ['Produit', 'Type', 'Nb ventes', 'CA Total'];
    
    // Sanitize product labels as they may contain user input
    const rows = products.map(p => [
      sanitizeForCsv(labelForPrice(p.price_id)),
      sanitizeForCsv(classifySaleType(p.price_id)),
      p.sales_count,
      (p.total_amount / 100).toFixed(2),
    ]);
    
    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...rows.map(r => buildCsvLine(r, ';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produits_ca_${selectedYear}_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();

    // Audit log the export
    logExport({
      exportType: 'products_sales_csv',
      recordCount: products.length,
      extra: { year: selectedYear },
    });
  };

  const getSaleTypeBadge = (type: string) => {
    switch (type) {
      case 'subscription':
        return <Badge variant="default">Abonnement</Badge>;
      case 'simulator':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Simulateur</Badge>;
      case 'addon':
        return <Badge variant="secondary">Add-on</Badge>;
      default:
        return <Badge variant="outline">Autre</Badge>;
    }
  };

  // Calculate totals
  const totalRevenue = products?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
  const totalSales = products?.reduce((sum, p) => sum + (p.sales_count || 0), 0) || 0;

  return (
    <>
      <SEOHead 
        title="Produits | Back-office Plateforme"
        description="CA par produit"
        noindex
      />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Ventes par Produit</h1>
            <p className="text-muted-foreground">
              Agrégation du CA par price_id
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <TabsList>
                <TabsTrigger value={String(currentYear - 1)}>{currentYear - 1}</TabsTrigger>
                <TabsTrigger value={String(currentYear)}>{currentYear}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" onClick={exportCSV} title="Exporter CSV">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 flex items-center gap-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Produits vendus</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold">{totalSales}</div>
              <p className="text-xs text-muted-foreground">Total ventes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-green-600">{formatCentsToEuros(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">CA total {selectedYear}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détail par produit</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Nb ventes</TableHead>
                  <TableHead className="text-right">CA Total</TableHead>
                  <TableHead className="text-right">% du CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : products?.length ? (
                  products.map((product) => {
                    const percentage = totalRevenue > 0 
                      ? ((product.total_amount / totalRevenue) * 100).toFixed(1)
                      : '0';

                    return (
                      <TableRow key={product.price_id}>
                        <TableCell>
                          <div className="font-medium">{labelForPrice(product.price_id)}</div>
                          <code className="text-xs text-muted-foreground">{product.price_id}</code>
                        </TableCell>
                        <TableCell>{getSaleTypeBadge(classifySaleType(product.price_id))}</TableCell>
                        <TableCell className="text-right font-mono">{product.sales_count}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCentsToEuros(product.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {percentage}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune vente trouvée pour {selectedYear}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
