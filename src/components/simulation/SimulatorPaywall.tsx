import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Video, Calculator, Lock, FolderOpen, Layers } from "lucide-react";
import { SIMULATOR_PACKS, SimulatorPack } from "@/config/pricingConfig";

interface SimulatorPaywallProps {
  onSubscribe?: (packId: string) => void;
}

export function SimulatorPaywall({ onSubscribe }: SimulatorPaywallProps) {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();

  const handleSubscribe = (packId: string) => {
    if (onSubscribe) {
      onSubscribe(packId);
    } else {
      navigate("/subscribe-simulator");
    }
  };

  const getPackIcon = (packId: string) => {
    switch (packId) {
      case 'essential':
        return <Calculator className="h-5 w-5 text-amber-600" />;
      case 'project':
        return <FolderOpen className="h-5 w-5 text-primary" />;
      case 'comparator':
        return <Layers className="h-5 w-5 text-amber-600" />;
      case 'premium':
        return <Video className="h-5 w-5 text-primary" />;
      default:
        return <Calculator className="h-5 w-5 text-amber-600" />;
    }
  };

  const getPackFeatures = (pack: SimulatorPack): string[] => {
    const features: string[] = [];
    
    features.push(t('app:subscribeSimulator.accessDays', { days: pack.accessDays }));
    
    features.push(
      pack.projectsIncluded > 1 
        ? t('app:subscribeSimulator.projectsIncluded_plural', { count: pack.projectsIncluded })
        : t('app:subscribeSimulator.projectsIncluded', { count: pack.projectsIncluded })
    );
    
    if (pack.hasExpertCalls && pack.expertCallsCount) {
      features.push(
        pack.expertCallsCount > 1
          ? t('app:subscribeSimulator.expertCalls_plural', { count: pack.expertCallsCount })
          : t('app:subscribeSimulator.expertCalls', { count: pack.expertCallsCount })
      );
    }
    
    features.push(t('app:subscribeSimulator.unlimitedScenarios'));
    features.push(t('app:subscribeSimulator.unlimitedExports'));
    
    return features;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">{t('app:subscribeSimulator.badge')}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {t('app:subscribeSimulator.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('app:subscribeSimulator.subtitle')}
          </p>
        </div>

        {/* Packs Grid */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {SIMULATOR_PACKS.map((pack) => (
            <Card 
              key={pack.id}
              className={`relative flex flex-col ${
                pack.isRecommended 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : pack.hasExpertCalls
                    ? 'border-amber-500/50'
                    : 'border-border'
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
              
              <CardHeader className="text-center pb-2 pt-5">
                <div className="flex items-center justify-center gap-2">
                  {getPackIcon(pack.id)}
                  <CardTitle className="text-lg">
                    {t(`app:subscribeSimulator.packs.${pack.id}.title`)}
                  </CardTitle>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                {/* Price */}
                <div className="text-center mb-3">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold">{pack.price} €</span>
                    <span className="text-xs text-muted-foreground">{t('app:subscribeSimulator.ttc')}</span>
                  </div>
                </div>
                
                {/* Features */}
                <ul className="space-y-1.5 flex-1 text-sm">
                  {getPackFeatures(pack).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${
                        pack.isRecommended ? 'text-primary' : 'text-green-500'
                      }`} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button 
                  className="w-full mt-4"
                  size="sm"
                  variant={pack.isRecommended ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(pack.id)}
                >
                  {pack.hasExpertCalls && <Sparkles className="h-3 w-3 mr-1" />}
                  {t(`app:subscribeSimulator.packs.${pack.id}.cta`)}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* One-time payment notice */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground italic">
            {t('app:subscribeSimulator.oneTimePayment')}
          </p>
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {t('app:subscribeSimulator.alreadySubscribed')}{" "}
            <a href="/login?mode=simulateur" className="text-primary hover:underline">
              {t('app:subscribeSimulator.connectHere')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
