import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HorizontalScrollTable } from "@/components/ui/horizontal-scroll-table";
import { Building2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface LaundryData {
  id: string;
  name: string;
  revenue: number;
  transactions: number;
  occupancyRate: number;
  trend: number; // percentage vs previous period
  breakEvenRevenue?: number | null;
  estimatedProfit?: number | null;
}

interface LaundryComparisonTableProps {
  laundries: LaundryData[];
  className?: string;
}

export function LaundryComparisonTable({ laundries, className }: LaundryComparisonTableProps) {
  const sortedLaundries = [...laundries].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = laundries.reduce((sum, l) => sum + l.revenue, 0);
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Benchmark de mes laveries
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Comparaison des laveries de votre entreprise uniquement
        </p>
      </CardHeader>
      <CardContent className="p-0 px-1">
        <HorizontalScrollTable>
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Laverie</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">CA</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">% Total</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Trans.</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Occup.</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Seuil rent.</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Résultat</TableHead>
                <TableHead className="text-right font-medium text-muted-foreground">Évol.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLaundries.map((laundry, index) => {
                const revenueShare = (laundry.revenue / totalRevenue) * 100;
                const isProfitable = laundry.estimatedProfit !== null && laundry.estimatedProfit !== undefined && laundry.estimatedProfit >= 0;
                
                return (
                  <TableRow key={laundry.id} className={cn(
                    index === 0 && "bg-lavcom-green/5"
                  )}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          index === 0 ? "bg-lavcom-green" : "bg-primary"
                        )} />
                        <span className="font-medium">{laundry.name}</span>
                        {index === 0 && (
                          <span className="text-xs bg-lavcom-green/20 text-lavcom-green px-1.5 py-0.5 rounded">
                            #1
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {laundry.revenue.toLocaleString('fr-FR')} €
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress 
                          value={revenueShare} 
                          className="h-1.5 w-12 [&>div]:bg-primary" 
                        />
                        <span className="text-muted-foreground tabular-nums w-10">
                          {revenueShare.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {laundry.transactions}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-medium tabular-nums",
                        laundry.occupancyRate >= 70 ? "text-lavcom-green" :
                        laundry.occupancyRate >= 50 ? "text-amber-500" : "text-destructive"
                      )}>
                        {laundry.occupancyRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {laundry.breakEvenRevenue !== null && laundry.breakEvenRevenue !== undefined ? (
                        <span className="text-muted-foreground">
                          {laundry.breakEvenRevenue.toLocaleString('fr-FR')} €
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {laundry.estimatedProfit !== null && laundry.estimatedProfit !== undefined ? (
                        <span className={cn(
                          "font-semibold",
                          isProfitable ? "text-lavcom-green" : "text-destructive"
                        )}>
                          {isProfitable ? '+' : ''}{laundry.estimatedProfit.toLocaleString('fr-FR')} €
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={cn(
                        "flex items-center gap-1 justify-end",
                        laundry.trend > 0 ? "text-lavcom-green" :
                        laundry.trend < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {laundry.trend > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : laundry.trend < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium tabular-nums">
                          {laundry.trend > 0 ? "+" : ""}{laundry.trend}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </HorizontalScrollTable>
      </CardContent>
    </Card>
  );
}
