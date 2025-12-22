import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator, 
  Video, 
  Check, 
  Sparkles, 
  ArrowLeft,
  FileText,
  Target,
  Layers,
  Clock,
  FolderOpen,
  Infinity
} from "lucide-react";
import { SIMULATOR_PACKS, SimulatorPack } from "@/config/pricingConfig";
import lavcomLogo from "@/assets/lavcom-performances-header.png";
import { Footer } from "@/components/layout/Footer";

export default function SubscribeSimulator() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();

  const handleSubscribe = (packId: string) => {
    console.log("Subscribe to pack:", packId);
    navigate("/simulation");
  };

  const getPackIcon = (packId: string) => {
    switch (packId) {
      case 'essential':
        return <Calculator className="h-6 w-6 text-amber-600" />;
      case 'project':
        return <FolderOpen className="h-6 w-6 text-primary" />;
      case 'comparator':
        return <Layers className="h-6 w-6 text-amber-600" />;
      case 'premium':
        return <Video className="h-6 w-6 text-primary" />;
      default:
        return <Calculator className="h-6 w-6 text-amber-600" />;
    }
  };

  const getPackFeatures = (pack: SimulatorPack): string[] => {
    const features: string[] = [];
    
    // Access days
    features.push(t('app:subscribeSimulator.accessDays', { days: pack.accessDays }));
    
    // Projects included
    features.push(
      pack.projectsIncluded > 1 
        ? t('app:subscribeSimulator.projectsIncluded_plural', { count: pack.projectsIncluded })
        : t('app:subscribeSimulator.projectsIncluded', { count: pack.projectsIncluded })
    );
    
    // Expert calls for premium
    if (pack.hasExpertCalls && pack.expertCallsCount) {
      features.push(
        pack.expertCallsCount > 1
          ? t('app:subscribeSimulator.expertCalls_plural', { count: pack.expertCallsCount })
          : t('app:subscribeSimulator.expertCalls', { count: pack.expertCallsCount })
      );
    }
    
    // Unlimited scenarios & exports
    features.push(t('app:subscribeSimulator.unlimitedScenarios'));
    features.push(t('app:subscribeSimulator.unlimitedExports'));
    
    return features;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-amber-500/5">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={lavcomLogo} alt="Lavcom Analytics" className="h-10 w-auto" />
          </Link>
          <Link to="/simulateur">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('app:subscribeSimulator.backToSimulator')}
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30">
            {t('app:subscribeSimulator.badge')}
          </Badge>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t('app:subscribeSimulator.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('app:subscribeSimulator.subtitle')}
          </p>
        </div>

        {/* Packs Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 max-w-7xl mx-auto">
          {SIMULATOR_PACKS.map((pack) => (
            <Card 
              key={pack.id}
              className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
                pack.isRecommended 
                  ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                  : pack.hasExpertCalls
                    ? 'border-amber-500/50 hover:border-amber-500'
                    : 'border-border hover:border-amber-600/50'
              }`}
            >
              {/* Badge */}
              {(pack.isRecommended || pack.hasExpertCalls) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`shadow-md gap-1 ${
                    pack.isRecommended 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    <Sparkles className="h-3 w-3" />
                    {t(`app:subscribeSimulator.packs.${pack.id}.badge`)}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2 pt-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                  pack.isRecommended ? 'bg-primary/20' : 'bg-amber-500/20'
                }`}>
                  {getPackIcon(pack.id)}
                </div>
                <CardTitle className="font-display text-xl">
                  {t(`app:subscribeSimulator.packs.${pack.id}.title`)}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Price */}
                <div className="text-center mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{pack.price} €</span>
                    <span className="text-sm text-muted-foreground">{t('app:subscribeSimulator.ttc')}</span>
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-2 flex-1 text-sm">
                  {getPackFeatures(pack).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${
                        pack.isRecommended ? 'text-primary' : 'text-amber-600'
                      }`} />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  className={`w-full mt-4 ${
                    pack.isRecommended 
                      ? '' 
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                  variant={pack.isRecommended ? 'default' : undefined}
                  onClick={() => handleSubscribe(pack.id)}
                >
                  {pack.hasExpertCalls && <Sparkles className="mr-2 h-4 w-4" />}
                  {t(`app:subscribeSimulator.packs.${pack.id}.cta`)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* One-time payment notice */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground italic">
            {t('app:subscribeSimulator.oneTimePayment')}
          </p>
        </div>

        {/* Features comparison */}
        <div className="max-w-3xl mx-auto mt-16">
          <Card className="bg-muted/30">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{t('app:subscribeSimulator.whatYouGet')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Target className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{t('app:subscribeSimulator.features.profitability')}</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Layers className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{t('app:subscribeSimulator.features.scenarios')}</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{t('app:subscribeSimulator.features.reports')}</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium">{t('app:subscribeSimulator.features.unlimitedAccess')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Already subscribed */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            {t('app:subscribeSimulator.alreadySubscribed')}{" "}
            <Link to="/login?mode=simulateur" className="text-primary hover:underline">
              {t('app:subscribeSimulator.connectHere')}
            </Link>
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
