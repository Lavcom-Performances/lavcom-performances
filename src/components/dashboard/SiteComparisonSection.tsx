import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateRange } from 'react-day-picker';
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
  Building2, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  Search,
  RotateCcw,
  CheckSquare,
  ExternalLink,
  FileText
} from 'lucide-react';
import { useSites } from '@/hooks/useSites';
import { useMultipleSitesCosts } from '@/hooks/useSiteCosts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { calculateProfitabilityMetrics, calculateFixedCostsTotal, LaundryCosts } from '@/types/costs';

interface SiteComparisonSectionProps {
  dateRange?: DateRange;
}

type SortField = 'revenue' | 'profit' | 'occupation' | 'trend';

const STORAGE_KEY = 'lavcom-comparison-sites';

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

  // Load persisted selection from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
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
  }, []);

  // Persist selection
  useEffect(() => {
    if (selectedSiteIds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSiteIds));
    }
  }, [selectedSiteIds]);

  // Default to all sites if no selection
  useEffect(() => {
    if (sites.length > 0 && selectedSiteIds.length === 0) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setSelectedSiteIds(sites.map(s => s.id));
      }
    }
  }, [sites, selectedSiteIds.length]);

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

  // Fetch aggregated stats for all selected sites
  const { data: siteStats = {} } = useQuery({
    queryKey: ['site-comparison-stats', selectedSiteIds, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!user || selectedSiteIds.length === 0) return {};
      
      let query = supabase
        .from('operations')
        .select('site_id, amount, operation_date')
        .in('site_id', selectedSiteIds);
      
      if (dateRange?.from) {
        query = query.gte('operation_date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange?.to) {
        query = query.lte('operation_date', dateRange.to.toISOString().split('T')[0]);
      }
      
      const { data, error } = await query;
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
    enabled: !!user && selectedSiteIds.length > 0,
  });

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    const days = dateRange?.from && dateRange?.to
      ? Math.max(1, Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;
    
    return sites
      .filter(s => selectedSiteIds.includes(s.id))
      .map(site => {
        const stats = siteStats[site.id] || { revenue: 0, transactions: 0 };
        const costs = costsMap[site.id] || defaultCosts;
        
        const profitability = calculateProfitabilityMetrics(costs, stats.revenue, stats.transactions);
        const profit = profitability.estimated_profit_month;
        const occupation = stats.transactions / days; // transactions per day
        
        return {
          id: site.id,
          name: site.name,
          city: site.city || '',
          revenue: stats.revenue,
          transactions: stats.transactions,
          profit,
          occupation,
          trend: 0, // Would need previous period data
          hasCosts: !!costsMap[site.id],
        };
      });
  }, [sites, selectedSiteIds, siteStats, costsMap, dateRange]);

  // Sort comparison data
  const sortedData = useMemo(() => {
    return [...comparisonData].sort((a, b) => {
      let aVal: number, bVal: number;
      
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
      
      // N/A (0 or NaN) values go to bottom
      if (isNaN(aVal) || aVal === 0) return 1;
      if (isNaN(bVal) || bVal === 0) return -1;
      
      return bVal - aVal; // Descending
    });
  }, [comparisonData, sortField]);

  const handleSelectAll = () => {
    setSelectedSiteIds(filteredSites.map(s => s.id));
  };

  const handleReset = () => {
    setSelectedSiteIds([]);
    setSearchTerm('');
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSiteToggle = (siteId: string) => {
    setSelectedSiteIds(prev => 
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleDrillDown = (siteId: string, toOperations = false) => {
    // Build date params
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

  const formatCurrency = (value: number) => {
    if (isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(Math.round(value)) + ' €';
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

          {/* Counter */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedSiteIds.length} laverie{selectedSiteIds.length > 1 ? 's' : ''} sélectionnée{selectedSiteIds.length > 1 ? 's' : ''}
            </span>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-48">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">CA (décroissant)</SelectItem>
                <SelectItem value="profit">Résultat (décroissant)</SelectItem>
                <SelectItem value="occupation">Occupation (décroissant)</SelectItem>
                <SelectItem value="trend">Évolution (décroissant)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                    <TableHead className="text-right">Évolution</TableHead>
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
                        {site.hasCosts ? (
                          <span className={site.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(site.profit)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {site.occupation > 0 ? site.occupation.toFixed(1) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {site.trend !== 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            {site.trend > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <span className={site.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                              {Math.abs(site.trend).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
