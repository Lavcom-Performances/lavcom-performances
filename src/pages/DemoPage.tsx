import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Play, BarChart3, TrendingUp, PieChart, Calendar, Sparkles, ArrowLeft, Eye, Zap, Users, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/seo/SEOHead";
import { LanguageSelector } from "@/components/ui/language-selector";
import lavcomLogo from "@/assets/lavcom-performances-header.png";

// Demo slides/features to showcase
const demoFeatures = [
  {
    id: "dashboard",
    icon: BarChart3,
    titleKey: "app:demo.features.dashboard.title",
    descriptionKey: "app:demo.features.dashboard.description",
    color: "text-lavcom-green",
    bgColor: "bg-lavcom-green/10",
  },
  {
    id: "analytics",
    icon: TrendingUp,
    titleKey: "app:demo.features.analytics.title",
    descriptionKey: "app:demo.features.analytics.description",
    color: "text-lavcom-blue",
    bgColor: "bg-lavcom-blue/10",
  },
  {
    id: "reports",
    icon: PieChart,
    titleKey: "app:demo.features.reports.title",
    descriptionKey: "app:demo.features.reports.description",
    color: "text-lavcom-orange",
    bgColor: "bg-lavcom-orange/10",
  },
  {
    id: "calendar",
    icon: Calendar,
    titleKey: "app:demo.features.calendar.title",
    descriptionKey: "app:demo.features.calendar.description",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

// Animated dashboard preview component
function AnimatedDashboardPreview({ t }: { t: (key: string) => string }) {
  const [activeBar, setActiveBar] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [transactions, setTransactions] = useState(0);
  
  // Animate bars
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBar((prev) => (prev + 1) % 7);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Animate counters
  useEffect(() => {
    const targetRevenue = 12847;
    const targetTransactions = 342;
    const duration = 2000;
    const steps = 60;
    let step = 0;
    
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setRevenue(Math.floor(targetRevenue * eased));
      setTransactions(Math.floor(targetTransactions * eased));
      
      if (step >= steps) clearInterval(interval);
    }, duration / steps);
    
    return () => clearInterval(interval);
  }, []);

  const barHeights = [65, 45, 80, 55, 90, 70, 85];
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <div className="bg-background rounded-xl border border-border shadow-lg p-4 md:p-6 space-y-4">
      {/* Header with KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-lavcom-green/10 rounded-lg p-3 text-center">
          <Euro className="h-4 w-4 text-lavcom-green mx-auto mb-1" />
          <div className="text-lg md:text-xl font-bold text-lavcom-green">{revenue.toLocaleString()} €</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">{t('app:demo.preview.revenue')}</div>
        </div>
        <div className="bg-lavcom-blue/10 rounded-lg p-3 text-center">
          <Users className="h-4 w-4 text-lavcom-blue mx-auto mb-1" />
          <div className="text-lg md:text-xl font-bold text-lavcom-blue">{transactions}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">{t('app:demo.preview.transactions')}</div>
        </div>
        <div className="bg-lavcom-orange/10 rounded-lg p-3 text-center">
          <Zap className="h-4 w-4 text-lavcom-orange mx-auto mb-1" />
          <div className="text-lg md:text-xl font-bold text-lavcom-orange">+18%</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">{t('app:demo.preview.growth')}</div>
        </div>
      </div>

      {/* Animated bar chart */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-3 w-3" />
          {t('app:demo.preview.weeklyRevenue')}
        </div>
        <div className="flex items-end justify-between h-24 gap-2">
          {barHeights.map((height, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className={`w-full rounded-t transition-all duration-500 ${
                  index === activeBar 
                    ? 'bg-lavcom-green shadow-lg shadow-lavcom-green/30' 
                    : 'bg-lavcom-green/40'
                }`}
                style={{ 
                  height: `${height}%`,
                  transform: index === activeBar ? 'scaleY(1.1)' : 'scaleY(1)',
                }}
              />
              <span className="text-[10px] text-muted-foreground">{days[index]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Animated trend line */}
      <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-3">
        <TrendingUp className="h-5 w-5 text-lavcom-green animate-pulse" />
        <div className="flex-1">
          <div className="h-2 bg-gradient-to-r from-lavcom-green via-lavcom-blue to-lavcom-green bg-[length:200%_100%] animate-[shimmer_2s_infinite] rounded-full" />
        </div>
        <span className="text-xs font-medium text-lavcom-green">{t('app:demo.preview.live')}</span>
      </div>
    </div>
  );
}

// Animated pie chart preview
function AnimatedPieChartPreview({ t }: { t: (key: string) => string }) {
  const [rotation, setRotation] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background rounded-xl border border-border shadow-lg p-4 md:p-6">
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <PieChart className="h-3 w-3" />
        {t('app:demo.preview.paymentDistribution')}
      </div>
      
      <div className="flex items-center gap-6">
        {/* Animated pie */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="transform -rotate-90" style={{ transform: `rotate(${rotation * 0.1 - 90}deg)` }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="20" />
            <circle 
              cx="50" cy="50" r="40" fill="none" 
              stroke="hsl(var(--lavcom-green))" 
              strokeWidth="20" 
              strokeDasharray="163 251"
              className="transition-all duration-300"
            />
            <circle 
              cx="50" cy="50" r="40" fill="none" 
              stroke="hsl(var(--lavcom-blue))" 
              strokeWidth="20" 
              strokeDasharray="88 251"
              strokeDashoffset="-163"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold">65%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lavcom-green" />
            <span>{t('app:demo.preview.cardPayment')} (65%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-lavcom-blue" />
            <span>{t('app:demo.preview.cashPayment')} (35%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Animated heatmap preview
function AnimatedHeatmapPreview({ t }: { t: (key: string) => string }) {
  const [highlight, setHighlight] = useState({ row: 0, col: 0 });
  
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlight({
        row: Math.floor(Math.random() * 4),
        col: Math.floor(Math.random() * 7),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = ['8h', '12h', '16h', '20h'];
  const intensity = [
    [20, 30, 40, 60, 80, 90, 70],
    [40, 50, 70, 90, 95, 85, 60],
    [30, 45, 55, 70, 75, 65, 50],
    [15, 25, 35, 45, 50, 40, 30],
  ];

  return (
    <div className="bg-background rounded-xl border border-border shadow-lg p-4 md:p-6">
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <Calendar className="h-3 w-3" />
        {t('app:demo.preview.weeklyTraffic')}
      </div>
      
      <div className="space-y-1">
        {intensity.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground w-6">{hours[rowIndex]}</span>
            {row.map((value, colIndex) => (
              <div
                key={colIndex}
                className={`flex-1 h-6 rounded transition-all duration-300 ${
                  highlight.row === rowIndex && highlight.col === colIndex
                    ? 'ring-2 ring-lavcom-green ring-offset-1 scale-110'
                    : ''
                }`}
                style={{
                  backgroundColor: `hsl(var(--lavcom-green) / ${value / 100})`,
                }}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          <span className="w-6" />
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day) => (
            <span key={day} className="flex-1 text-[10px] text-center text-muted-foreground">
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();

  // Handle close - return to landing page
  const handleClose = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  return (
    <>
      <SEOHead 
        url="/demo"
        title="Démonstration - Lavcom Performances"
        description="Découvrez gratuitement les fonctionnalités de Lavcom Performances : tableaux de bord, analyses de rentabilité, alertes et rapports pour votre laverie."
        keywords="demo laverie, démonstration logiciel laverie, essai gratuit laverie"
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <button onClick={handleClose} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common:backToHome')}</span>
            </button>
            
            <img src={lavcomLogo} alt="Lavcom Performances" className="h-8 w-auto" />
            
            <div className="flex items-center gap-3">
              <LanguageSelector variant="compact" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-9 w-9"
                aria-label={t('common:close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 pt-24 pb-12">
          {/* Hero section */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-lavcom-green/10 text-lavcom-green px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Eye className="h-4 w-4" />
              {t('app:demo.page.badge')}
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t('app:demo.page.title')}
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              {t('app:demo.page.subtitle')}
            </p>
          </div>

          {/* Animated Dashboard Previews */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <Play className="h-5 w-5 text-lavcom-green" />
              {t('app:demo.page.previewTitle')}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main dashboard preview */}
              <div className="lg:col-span-2">
                <AnimatedDashboardPreview t={t} />
              </div>
              
              {/* Pie chart preview */}
              <AnimatedPieChartPreview t={t} />
              
              {/* Heatmap preview */}
              <AnimatedHeatmapPreview t={t} />
            </div>
          </div>

          {/* Features grid */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">
              {t('app:demo.page.featuresTitle')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {demoFeatures.map((feature) => (
                <Card key={feature.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className={`p-3 rounded-xl ${feature.bgColor}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">
                      {t(feature.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {t(feature.descriptionKey)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA section */}
          <div className="text-center max-w-2xl mx-auto">
            <Card className="p-8 bg-gradient-to-r from-lavcom-green/5 via-background to-lavcom-green/5 border-lavcom-green/20">
              <Sparkles className="h-8 w-8 text-lavcom-green mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">
                {t('app:demo.page.ctaTitle')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('app:demo.page.ctaDescription')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  onClick={() => navigate("/signup")}
                  className="bg-lavcom-green hover:bg-lavcom-green-dark text-white"
                >
                  {t('common:freeTrial')}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleClose}
                >
                  {t('common:backToHome')}
                </Button>
              </div>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
          <p>{t('app:demo.page.footer')}</p>
        </footer>
      </div>
    </>
  );
}
