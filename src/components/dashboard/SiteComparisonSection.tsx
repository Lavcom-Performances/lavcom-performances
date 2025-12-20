import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  Search,
  RotateCcw,
  CheckSquare,
  ExternalLink,
  FileText,
  Settings,
  Info,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { useMultipleSitesCosts } from '@/hooks/useSiteCosts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { calculateProfitabilityMetrics, LaundryCosts } from '@/types/costs';
import { exportComparisonPDF, exportComparisonExcel } from '@/utils/comparisonExport';
import { toast } from 'sonner';

interface SiteComparisonSectionProps {
  dateRange?: DateRange;
}

type SortField = 'revenue' | 'profit' | 'occupation' | 'trend';

const getStorageKey = (userId?: string) => `lavcom-comparison-sites-${userId || 'anonymous'}`;

const defaultCosts: LaundryCosts = {
  fixed_rent: 850,
  fixed_lease: 450,
  fixed_subscriptions: 120,
  fixed_insurance: 85,
  fixed_cleaning: 200,
  fixed_other: 50,
  var_energy_water_percent: 12,
  var_detergent_percent: 3,
};

export function SiteComparisonSection({ dateRange }: SiteComparisonSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sites } = useSites();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);

  const storageKey = getStorageKey(user?.id);

  // Load persisted selection from localStorage
  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedSiteIds(parsed);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [user?.id, storageKey]);

  // Persist selection
  useEffect(() => {
    if (!user?.id) return;
    if (selectedSiteIds.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(selectedSiteIds));
    }
  }, [selectedSiteIds, user?.id, storageKey]);

  // Default to all sites if no selection
  useEffect(() => {
    if (!user?.id) return;
    if (sites.length > 0 && selectedSiteIds.length === 0) {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setSelectedSiteIds(sites.map(s => s.id));
      }
    }
  }, [sites, selectedSiteIds.length, user?.id, storageKey]);

  // Filter sites by search
  const filteredSites = useMemo(() => {
    if (!searchTerm) return sites;
    const lower = searchTerm.toLowerCase();
    return sites.filter(s => 
      s.name.toLowerCase().includes(lower) ||
      s.city?.toLowerCase().includes(lower) ||
      s.address?.toLowerCase().includes(lower)
    );
  }, [sites, searchTerm]);

  // Get costs for selected sites
  const { data: costsMap = {} } = useMultipleSitesCosts(selectedSiteIds);

  // Calculate period duration in days
  const periodDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 30;
    return Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)));
  }, [dateRange]);

  // Calculate previous period dates
  const previousPeriod = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return null;
    const from = subDays(dateRange.from, periodDays);
    const to = subDays(dateRange.from, 1); // Day before current period starts
    return { from, to };
  }, [dateRange, periodDays]);

  // Fetch aggregated stats for current period
  const { data: currentStats = {} } = useQuery({
    queryKey: ['site-comparison-current', selectedSiteIds, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!user || selectedSiteIds.length === 0 || !dateRange?.from || !dateRange?.to) return {};
      
      const { data, error } = await supabase
        .from('operations')
        .select('site_id, amount, operation_date')
        .in('site_id', selectedSiteIds)
        .gte('operation_date', dateRange.from.toISOString().split('T')[0])
        .lte('operation_date', dateRange.to.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      // Aggregate by site
      const stats: Record<string, { revenue: number; transactions: number }> = {};
      for (const op of (data || [])) {
        if (!stats[op.site_id]) {
          stats[op.site_id] = { revenue: 0, transactions: 0 };
        }
        stats[op.site_id].revenue += Number(op.amount) || 0;
        stats[op.site_id].transactions += 1;
      }
      
      return stats;
    },
    enabled: !!user && selectedSiteIds.length > 0 && !!dateRange?.from && !!dateRange?.to,
  });

  // Fetch aggregated stats for previous period (for trend calculation)
  const { data: previousStats = {} } = useQuery({
    queryKey: ['site-comparison-previous', selectedSiteIds, previousPeriod?.from, previousPeriod?.to],
    queryFn: async () => {
      if (!user || selectedSiteIds.length === 0 || !previousPeriod) return {};
      
      const { data, error } = await supabase
        .from('operations')
        .select('site_id, amount, operation_date')
        .in('site_id', selectedSiteIds)
        .gte('operation_date', previousPeriod.from.toISOString().split('T')[0])
        .lte('operation_date', previousPeriod.to.toISOString().split('T')[0]);
      
      if (error) throw error;
      
      // Aggregate by site
      const stats: Record<string, { revenue: number; transactions: number }> = {};
      for (const op of (data || [])) {
        if (!stats[op.site_id]) {
          stats[op.site_id] = { revenue: 0, transactions: 0 };
        }
        stats[op.site_id].revenue += Number(op.amount) || 0;
        stats[op.site_id].transactions += 1;
      }
      
      return stats;
    },
    enabled: !!user && selectedSiteIds.length > 0 && !!previousPeriod,
  });

  // Calculate trend percentage
  const calculateTrend = (current: number, previous: number): number | null => {
    if (previous === 0 || isNaN(previous)) return null;
    if (isNaN(current)) return null;
    return ((current - previous) / previous) * 100;
  };

  // Calculate comparison data with trends
  const comparisonData = useMemo(() => {
    return sites
      .filter(s => selectedSiteIds.includes(s.id))
      .map(site => {
        const current = currentStats[site.id] || { revenue: 0, transactions: 0 };
        const previous = previousStats[site.id] || { revenue: 0, transactions: 0 };
        const costs = costsMap[site.id];
        
        const profitability = costs 
          ? calculateProfitabilityMetrics(costs, current.revenue, current.transactions)
          : null;
        const profit = profitability?.estimated_profit_month ?? null;
        const currentOccupation = current.transactions / periodDays;
        const previousOccupation = previous.transactions / periodDays;
        
        // Calculate trends
        const revenueTrend = calculateTrend(current.revenue, previous.revenue);
        const transactionsTrend = calculateTrend(current.transactions, previous.transactions);
        const occupationTrend = calculateTrend(currentOccupation, previousOccupation);
        
        // Use revenue trend as the main trend for sorting
        const mainTrend = revenueTrend;
        
        return {
          id: site.id,
          name: site.name,
          city: site.city || '',
          revenue: current.revenue,
          transactions: current.transactions,
          profit,
          occupation: currentOccupation,
          revenueTrend,
          transactionsTrend,
          occupationTrend,
          trend: mainTrend,
          hasCosts: !!costs,
        };
      });
  }, [sites, selectedSiteIds, currentStats, previousStats, costsMap, periodDays]);

  // Sort comparison data
  const sortedData = useMemo(() => {
    return [...comparisonData].sort((a, b) => {
      let aVal: number | null, bVal: number | null;
      
      switch (sortField) {
        case 'revenue':
          aVal = a.revenue;
          bVal = b.revenue;
          break;
        case 'profit':
          aVal = a.profit;
          bVal = b.profit;
          break;
        case 'occupation':
          aVal = a.occupation;
          bVal = b.occupation;
          break;
        case 'trend':
          aVal = a.trend;
          bVal = b.trend;
          break;
        default:
          return 0;
      }
      
      // N/A (null, 0, or NaN) values go to bottom
      const aIsNA = aVal === null || isNaN(aVal) || (sortField !== 'trend' && aVal === 0);
      const bIsNA = bVal === null || isNaN(bVal) || (sortField !== 'trend' && bVal === 0);
      
      if (aIsNA && bIsNA) return 0;
      if (aIsNA) return 1;
      if (bIsNA) return -1;
      
      return (bVal as number) - (aVal as number); // Descending
    });
  }, [comparisonData, sortField]);

  const handleSelectAll = () => {
    setSelectedSiteIds(filteredSites.map(s => s.id));
  };

  const handleReset = () => {
    setSelectedSiteIds([]);
    setSearchTerm('');
    if (user?.id) {
      localStorage.removeItem(storageKey);
    }
  };

  const handleSiteToggle = (siteId: string) => {
    setSelectedSiteIds(prev => 
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleDrillDown = (siteId: string, toOperations = false) => {
    const params = new URLSearchParams();
    if (dateRange?.from) {
      params.set('date_start', dateRange.from.toISOString().split('T')[0]);
    }
    if (dateRange?.to) {
      params.set('date_end', dateRange.to.toISOString().split('T')[0]);
    }
    params.set('site', siteId);
    
    const path = toOperations ? '/operations' : '/dashboard';
    navigate(`${path}?${params.toString()}`);
  };

  const handleConfigureCosts = (siteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/laundromat-settings?site=${siteId}`);
  };

  const handleExportPDF = () => {
    if (!dateRange?.from || !dateRange?.to || sortedData.length === 0) {
      toast.error("Sélectionnez au moins une laverie pour exporter");
      return;
    }
    try {
      exportComparisonPDF({
        sites: sortedData,
        dateStart: dateRange.from,
        dateEnd: dateRange.to,
        periodDays,
      });
      toast.success("Export PDF téléchargé");
    } catch (error) {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  const handleExportExcel = () => {
    if (!dateRange?.from || !dateRange?.to || sortedData.length === 0) {
      toast.error("Sélectionnez au moins une laverie pour exporter");
      return;
    }
    try {
      exportComparisonExcel({
        sites: sortedData,
        dateStart: dateRange.from,
        dateEnd: dateRange.to,
        periodDays,
      });
      toast.success("Export Excel téléchargé");
    } catch (error) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(Math.round(value)) + ' €';
  };

  const formatTrend = (trend: number | null) => {
    if (trend === null || isNaN(trend)) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
                N/A
                <Info className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>Aucune donnée disponible pour la période précédente ({periodDays} jours avant).</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    const isPositive = trend > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className="flex items-center justify-end gap-1">
        <Icon className={`h-4 w-4 ${colorClass}`} />
        <span className={colorClass}>
          {isPositive ? '+' : ''}{trend.toFixed(1)}%
        </span>
      </div>
    );
  };

  // Only show if more than 1 site
  if (sites.length <= 1) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Ajoutez plusieurs laveries pour comparer leurs performances
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Comparer mes laveries
          </CardTitle>
          <CardDescription>
            Sélectionnez les laveries à comparer et triez par performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une laverie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="gap-2">
                <CheckSquare className="h-4 w-4" />
                Tout sélectionner
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Site Selection */}
          <div className="flex flex-wrap gap-2">
            {filteredSites.map(site => (
              <label
                key={site.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedSiteIds.includes(site.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
              >
                <Checkbox
                  checked={selectedSiteIds.includes(site.id)}
                  onCheckedChange={() => handleSiteToggle(site.id)}
                />
                <span className="text-sm font-medium">{site.name}</span>
                {site.city && (
                  <span className="text-xs text-muted-foreground">({site.city})</span>
                )}
              </label>
            ))}
          </div>

          {/* Counter and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {selectedSiteIds.length} laverie{selectedSiteIds.length > 1 ? 's' : ''} sélectionnée{selectedSiteIds.length > 1 ? 's' : ''}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="revenue">CA (décroissant)</SelectItem>
                  <SelectItem value="profit">Résultat (décroissant)</SelectItem>
                  <SelectItem value="occupation">Occupation (décroissant)</SelectItem>
                  <SelectItem value="trend">Évolution (décroissant)</SelectItem>
                </SelectContent>
              </Select>
              {selectedSiteIds.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportPDF}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportExcel}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      {selectedSiteIds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparaison du CA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={sortedData.map(site => ({
                      name: site.name.length > 12 ? site.name.substring(0, 12) + '...' : site.name,
                      fullName: site.name,
                      revenue: site.revenue,
                    }))}
                    margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={45}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [
                        new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value) + ' €',
                        'CA'
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                      {sortedData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? 'hsl(var(--lavcom-green))' : 'hsl(var(--primary))'}
                          opacity={index === 0 ? 1 : 0.7}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Occupation Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparaison des cycles/jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[...sortedData]
                      .sort((a, b) => b.occupation - a.occupation)
                      .map(site => ({
                        name: site.name.length > 12 ? site.name.substring(0, 12) + '...' : site.name,
                        fullName: site.name,
                        occupation: site.occupation,
                      }))}
                    margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tickFormatter={(value) => value.toFixed(0)}
                      className="fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      width={35}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [
                        value.toFixed(1) + ' cycles/jour',
                        'Occupation'
                      ]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="occupation" radius={[4, 4, 0, 0]}>
                      {[...sortedData]
                        .sort((a, b) => b.occupation - a.occupation)
                        .map((entry, index) => (
                          <Cell 
                            key={`cell-occ-${index}`} 
                            fill={index === 0 ? 'hsl(var(--lavcom-yellow))' : 'hsl(var(--secondary))'}
                            opacity={index === 0 ? 1 : 0.7}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Table */}
      {selectedSiteIds.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Laverie</TableHead>
                    <TableHead className="text-right">CA Période</TableHead>
                    <TableHead className="text-right">Résultat</TableHead>
                    <TableHead className="text-right">Cycles/jour</TableHead>
                    <TableHead className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help">
                              Évolution
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>
                              Évolution du CA par rapport aux {periodDays} jours précédents.
                              Calcul : (période actuelle - période précédente) / période précédente × 100
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((site, index) => (
                    <TableRow 
                      key={site.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleDrillDown(site.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {index === 0 && sortedData.length > 1 && (
                            <Badge variant="default" className="bg-lavcom-green text-white">
                              #1
                            </Badge>
                          )}
                          <div>
                            <div className="font-medium">{site.name}</div>
                            {site.city && (
                              <div className="text-xs text-muted-foreground">{site.city}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(site.revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {site.hasCosts && site.profit !== null ? (
                          <span className={site.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(site.profit)}
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-primary gap-1 h-auto py-0"
                            onClick={(e) => handleConfigureCosts(site.id, e)}
                          >
                            <Settings className="h-3 w-3" />
                            <span className="text-xs">Configurer</span>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {site.occupation > 0 ? site.occupation.toFixed(1) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatTrend(site.trend)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDrillDown(site.id);
                            }}
                            title="Voir le tableau de bord"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDrillDown(site.id, true);
                            }}
                            title="Voir les opérations"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Period info */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Évolution calculée par rapport aux {periodDays} jours précédents
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
