import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, Play, BarChart3, TrendingUp, PieChart, Calendar, Sparkles, ArrowLeft, Eye } from "lucide-react";
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

          {/* Video placeholder / Demo preview */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="overflow-hidden border-2 border-lavcom-green/20 shadow-xl">
              <div className="aspect-video bg-gradient-to-br from-lavcom-green/5 via-muted to-lavcom-blue/5 flex items-center justify-center relative">
                {/* Demo video embed placeholder - replace with actual video */}
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-lavcom-green/20 flex items-center justify-center">
                    <Play className="h-10 w-10 text-lavcom-green ml-1" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t('app:demo.page.videoTitle')}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    {t('app:demo.page.videoDescription')}
                  </p>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-lavcom-green/20 animate-pulse" />
                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-lavcom-orange/20 animate-pulse delay-150" />
                <div className="absolute top-1/4 right-8 w-4 h-4 rounded-full bg-lavcom-blue/20 animate-pulse delay-300" />
              </div>
            </Card>
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
