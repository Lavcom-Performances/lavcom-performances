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
  force_bypass?: boolean;
}

const MAX_RANGE_DAYS = 90;
const FORCE_BYPASS_PHRASE = "FORCE FULL RECOMPUTE";

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
  
  // Force bypass for super admins
  const [forceBypassOpen, setForceBypassOpen] = useState(false);
  const [forceBypassInput, setForceBypassInput] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Fetch sites and check super admin status
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check super admin status
        if (user) {
          const { data: isSuperAdminResult } = await supabase.rpc('is_platform_super_admin', { uid: user.id });
          setIsSuperAdmin(isSuperAdminResult === true);
        }
        
        // Fetch sites
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

    fetchData();
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
  const canForceBypass = isSuperAdmin && selectedSite && dateRange?.from && dateRange?.to && rangeDays > MAX_RANGE_DAYS;

  const handleOpenConfirm = () => {
    if (!canSubmit) return;
    setConfirmInput('');
    setConfirmOpen(true);
  };
  
  const handleOpenForceBypass = () => {
    if (!canForceBypass) return;
    setForceBypassInput('');
    setForceBypassOpen(true);
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
          force_bypass: false,
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

  const handleForceBypassRecompute = async () => {
    if (!selectedSite || !dateRange?.from || !dateRange?.to) return;
    
    // Validate force bypass confirmation
    if (forceBypassInput !== FORCE_BYPASS_PHRASE) {
      toast.error('Confirmation incorrecte');
      return;
    }

    setForceBypassOpen(false);
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recompute-analytics', {
        body: {
          site_id: selectedSite.id,
          date_from: format(dateRange.from, 'yyyy-MM-dd'),
          date_to: format(dateRange.to, 'yyyy-MM-dd'),
          force_bypass: true,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult({ ...data, force_bypass: true } as RecomputeResult);
      toast.success(`⚠️ FORCE BYPASS: ${data.operations_processed} opérations recalculées sur ${data.range_days} jours`);
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
              <div className="space-y-1">
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Maximum {MAX_RANGE_DAYS} jours autorisés
                </p>
                {isSuperAdmin && (
                  <p className="text-xs text-muted-foreground">
                    En tant que super admin, vous pouvez forcer un recalcul au-delà de cette limite.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap">
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
            
            {/* Force Bypass Button - Super Admin Only */}
            {isSuperAdmin && canForceBypass && (
              <Button 
                onClick={handleOpenForceBypass} 
                disabled={running}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Force Recalcul ({rangeDays} jours)
              </Button>
            )}
          </div>

          {/* Result Banner */}
          {result && (
            <div className={cn(
              "p-4 rounded-lg border",
              result.force_bypass 
                ? "bg-amber-500/10 border-amber-500/20" 
                : "bg-green-500/10 border-green-500/20"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className={cn("h-5 w-5", result.force_bypass ? "text-amber-500" : "text-green-500")} />
                <span className={cn("font-medium", result.force_bypass ? "text-amber-700" : "text-green-700")}>
                  Recalcul terminé avec succès
                  {result.force_bypass && <Badge variant="outline" className="ml-2 text-amber-600 border-amber-600">FORCE BYPASS</Badge>}
                </span>
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

      {/* Force Bypass Confirmation Dialog - Super Admin Only */}
      <Dialog open={forceBypassOpen} onOpenChange={setForceBypassOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              ⚠️ FORCE BYPASS - Super Admin
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                <strong className="text-red-600">ATTENTION: Cette action dépasse la limite de sécurité de {MAX_RANGE_DAYS} jours.</strong>
              </p>
              <p>
                Vous allez recalculer <strong>{rangeDays} jours</strong> d'analytics pour{" "}
                <strong>{selectedSite?.name}</strong> du{" "}
                {dateRange?.from && format(dateRange.from, "dd/MM/yyyy")} au{" "}
                {dateRange?.to && format(dateRange.to, "dd/MM/yyyy")}.
              </p>
              <p className="text-amber-600">
                Cette opération peut prendre plusieurs minutes et impacter temporairement les performances.
              </p>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="force-bypass-input">
              Tapez <code className="bg-muted px-1 rounded text-red-600">{FORCE_BYPASS_PHRASE}</code> pour confirmer:
            </Label>
            <Input
              id="force-bypass-input"
              value={forceBypassInput}
              onChange={(e) => setForceBypassInput(e.target.value)}
              placeholder={FORCE_BYPASS_PHRASE}
              autoComplete="off"
              className="border-red-200 focus:border-red-500"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceBypassOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleForceBypassRecompute}
              disabled={forceBypassInput !== FORCE_BYPASS_PHRASE}
              className="bg-red-600 hover:bg-red-700"
            >
              FORCER LE RECALCUL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
