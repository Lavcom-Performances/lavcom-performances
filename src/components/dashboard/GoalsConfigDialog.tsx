import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserGoals } from '@/hooks/useUserGoals';
import { toast } from 'sonner';

interface GoalsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId?: string | null;
}

export function GoalsConfigDialog({ open, onOpenChange, siteId }: GoalsConfigDialogProps) {
  const { goals, upsertGoals } = useUserGoals(siteId);
  
  const [monthlyRevenue, setMonthlyRevenue] = useState('5000');
  const [annualRevenue, setAnnualRevenue] = useState('60000');
  const [monthlyTransactions, setMonthlyTransactions] = useState('500');

  useEffect(() => {
    if (goals) {
      setMonthlyRevenue(String(goals.monthly_revenue_goal));
      setAnnualRevenue(String(goals.annual_revenue_goal));
      setMonthlyTransactions(String(goals.monthly_transactions_goal));
    }
  }, [goals]);

  const handleSave = async () => {
    try {
      await upsertGoals.mutateAsync({
        monthly_revenue_goal: parseFloat(monthlyRevenue) || 5000,
        annual_revenue_goal: parseFloat(annualRevenue) || 60000,
        monthly_transactions_goal: parseInt(monthlyTransactions) || 500,
        site_id: siteId,
      });
      toast.success('Objectifs enregistrés');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurer mes objectifs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-revenue">Objectif CA mensuel (€)</Label>
            <Input
              id="monthly-revenue"
              type="number"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(e.target.value)}
              placeholder="5000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="annual-revenue">Objectif CA annuel (€)</Label>
            <Input
              id="annual-revenue"
              type="number"
              value={annualRevenue}
              onChange={(e) => setAnnualRevenue(e.target.value)}
              placeholder="60000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="monthly-transactions">Objectif transactions mensuelles</Label>
            <Input
              id="monthly-transactions"
              type="number"
              value={monthlyTransactions}
              onChange={(e) => setMonthlyTransactions(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={upsertGoals.isPending}>
            {upsertGoals.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
