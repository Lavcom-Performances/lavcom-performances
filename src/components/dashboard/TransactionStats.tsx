import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, AlertTriangle, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionStatsProps {
  totalTransactions: number;
  avgTransactionsPerDay: number;
  failedTransactions: number;
  failedRate: number;
  peakHour: string;
  peakTransactions: number;
  className?: string;
}

export function TransactionStats({ 
  totalTransactions, 
  avgTransactionsPerDay,
  failedTransactions,
  failedRate,
  peakHour,
  peakTransactions,
  className 
}: TransactionStatsProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Analyse clientèle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Transactions totales</p>
            </div>
            <p className="text-xl font-bold text-foreground">{totalTransactions}</p>
            <p className="text-xs text-muted-foreground">
              ~{avgTransactionsPerDay}/jour
            </p>
          </div>
          
          <div className="space-y-1 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Heure de pointe</p>
            </div>
            <p className="text-xl font-bold text-foreground">{peakHour}</p>
            <p className="text-xs text-muted-foreground">
              {peakTransactions} transactions
            </p>
          </div>
          
          <div className="space-y-1 p-3 bg-red-50 rounded-lg col-span-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-600 font-medium">Transactions échouées</p>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-xl font-bold text-red-600">{failedTransactions}</p>
              <p className="text-sm text-red-500">
                ({failedRate.toFixed(1)}% du total)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
