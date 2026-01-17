import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  RefreshCw, 
  CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Database,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Site {
  id: string;
  name: string;
  city: string | null;
}

interface RecomputeResult {
  success: boolean;
  site_name: string;
  date_from: string;
  date_to: string;
  range_days: number;
  operations_processed: number;
  daily_records_written: number;
  kpi_records_written: number;
  duration_ms: number;
}

const MAX_RANGE_DAYS = 90;

export function RecomputeAnalyticsWidget({ className }: { className?: string }) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [siteSearchOpen, setSiteSearchOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RecomputeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Danger zone dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, city')
          .eq('is_demo', false)
          .order('name')
          .limit(200);

        if (error) throw error;
        setSites(data || []);
      } catch (err) {
        console.error('Failed to fetch sites:', err);
        toast.error('Erreur chargement des sites');
      } finally {
        setLoadingSites(false);
      }
    };

    fetchSites();
  }, []);

  // Filter sites based on search
  const filteredSites = useMemo(() => {
    if (!siteSearch) return sites;
    const search = siteSearch.toLowerCase();
    return sites.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.city?.toLowerCase().includes(search)
    );
  }, [sites, siteSearch]);

  // Calculate range days
  const rangeDays = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    return differenceInDays(dateRange.to, dateRange.from) + 1;
  }, [dateRange]);

  const isRangeValid = rangeDays > 0 && rangeDays <= MAX_RANGE_DAYS;
  const canSubmit = selectedSite && dateRange?.from && dateRange?.to && isRangeValid;

  const handleOpenConfirm = () => {
    if (!canSubmit) return;
    setConfirmInput('');
    setConfirmOpen(true);
  };

  const handleConfirmRecompute = async () => {
    if (!selectedSite || !dateRange?.from || !dateRange?.to) return;
    
    // Validate confirmation input
    if (confirmInput !== selectedSite.name && confirmInput !== selectedSite.id) {
      toast.error('Confirmation incorrecte');
      return;
    }

    setConfirmOpen(false);
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recompute-analytics', {
        body: {
          site_id: selectedSite.id,
          date_from: format(dateRange.from, 'yyyy-MM-dd'),
          date_to: format(dateRange.to, 'yyyy-MM-dd'),
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data as RecomputeResult);
      toast.success(`Analytics recalculées: ${data.operations_processed} opérations traitées`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Recalculer Analytics
          </CardTitle>
          <CardDescription>
            Recalculer les tables analytics_daily et analytics_kpis pour un site sur une période donnée.
            <br />
            <span className="text-orange-500 font-medium">⚠️ Réservé aux platform admins. Maximum {MAX_RANGE_DAYS} jours.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Site Selector */}
          <div className="space-y-2">
            <Label>Site</Label>
            <Popover open={siteSearchOpen} onOpenChange={setSiteSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={siteSearchOpen}
                  className="w-full justify-between"
                  disabled={loadingSites}
                >
                  {loadingSites ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedSite ? (
                    <span className="truncate">
                      {selectedSite.name} {selectedSite.city && `(${selectedSite.city})`}
                    </span>
                  ) : (
                    "Rechercher un site..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Rechercher par nom ou ville..." 
                    value={siteSearch}
                    onValueChange={setSiteSearch}
                  />
                  <CommandList>
                    <CommandEmpty>Aucun site trouvé</CommandEmpty>
                    <CommandGroup>
                      {filteredSites.slice(0, 50).map((site) => (
                        <CommandItem
                          key={site.id}
                          value={`${site.name} ${site.city || ''}`}
                          onSelect={() => {
                            setSelectedSite(site);
                            setSiteSearchOpen(false);
                            setSiteSearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSite?.id === site.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="truncate">
                            {site.name} {site.city && <span className="text-muted-foreground">({site.city})</span>}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <Label>Période</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM yyyy", { locale: fr })} -{" "}
                          {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy", { locale: fr })
                      )
                    ) : (
                      "Sélectionner une période"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={fr}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              {rangeDays > 0 && (
                <Badge variant={isRangeValid ? "secondary" : "destructive"}>
                  {rangeDays} jour{rangeDays > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            {!isRangeValid && rangeDays > MAX_RANGE_DAYS && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Maximum {MAX_RANGE_DAYS} jours autorisés
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleOpenConfirm} 
              disabled={!canSubmit || running}
              variant="destructive"
              className="bg-orange-500 hover:bg-orange-600"
            >
              {running ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {running ? 'Recalcul en cours...' : 'Recalculer Analytics'}
            </Button>
          </div>

          {/* Result Banner */}
          {result && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-700">Recalcul terminé avec succès</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Site:</span>
                  <br />
                  <span className="font-medium">{result.site_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Opérations:</span>
                  <br />
                  <span className="font-medium">{result.operations_processed.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Jours recalculés:</span>
                  <br />
                  <span className="font-medium">{result.daily_records_written}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Durée:</span>
                  <br />
                  <span className="font-medium">{result.duration_ms}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-700">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertTriangle className="h-5 w-5" />
              Confirmer le recalcul
            </DialogTitle>
            <DialogDescription>
              Cette action va recalculer toutes les analytics pour{" "}
              <strong>{selectedSite?.name}</strong> du{" "}
              {dateRange?.from && format(dateRange.from, "dd/MM/yyyy")} au{" "}
              {dateRange?.to && format(dateRange.to, "dd/MM/yyyy")}.
              <br /><br />
              Les anciennes données analytics pour cette période seront remplacées.
              <br />
              <strong>Les opérations brutes ne seront pas modifiées.</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="confirm-input">
              Tapez le nom du site (<code>{selectedSite?.name}</code>) pour confirmer:
            </Label>
            <Input
              id="confirm-input"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={selectedSite?.name}
              autoComplete="off"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmRecompute}
              disabled={confirmInput !== selectedSite?.name && confirmInput !== selectedSite?.id}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Confirmer le recalcul
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
