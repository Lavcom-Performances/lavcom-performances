import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          Benchmark laveries
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Laverie</th>
                <th className="text-right p-3 font-medium text-muted-foreground">CA</th>
                <th className="text-right p-3 font-medium text-muted-foreground">% Total</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Trans.</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Occup.</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Évol.</th>
              </tr>
            </thead>
            <tbody>
              {sortedLaundries.map((laundry, index) => {
                const revenueShare = (laundry.revenue / totalRevenue) * 100;
                return (
                  <tr key={laundry.id} className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors",
                    index === 0 && "bg-lime-50/50"
                  )}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          index === 0 ? "bg-lime-500" : "bg-primary"
                        )} />
                        <span className="font-medium">{laundry.name}</span>
                        {index === 0 && (
                          <span className="text-xs bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded">
                            #1
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {laundry.revenue.toLocaleString('fr-FR')} €
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress 
                          value={revenueShare} 
                          className="h-1.5 w-12 [&>div]:bg-primary" 
                        />
                        <span className="text-muted-foreground w-10">
                          {revenueShare.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {laundry.transactions}
                    </td>
                    <td className="p-3 text-right">
                      <span className={cn(
                        "font-medium",
                        laundry.occupancyRate >= 70 ? "text-lime-600" :
                        laundry.occupancyRate >= 50 ? "text-amber-500" : "text-red-500"
                      )}>
                        {laundry.occupancyRate}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className={cn(
                        "flex items-center gap-1 justify-end",
                        laundry.trend > 0 ? "text-lime-600" :
                        laundry.trend < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {laundry.trend > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : laundry.trend < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {laundry.trend > 0 ? "+" : ""}{laundry.trend}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
