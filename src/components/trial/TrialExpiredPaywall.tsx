import { Link } from "react-router-dom";
import { Lock, Sparkles, CheckCircle2, ArrowRight, Clock, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { useTranslation } from "react-i18next";
import { useLogout } from "@/hooks/useLogout";

interface TrialExpiredPaywallProps {
  onContactSupport?: () => void;
}

export function TrialExpiredPaywall({ onContactSupport }: TrialExpiredPaywallProps) {
  const { t } = useTranslation(['app', 'common']);
  const { logout } = useLogout();

  const features = [
    t('app:trialExpired.features.dashboard'),
    t('app:trialExpired.features.export'),
    t('app:trialExpired.features.recommendations'),
    t('app:trialExpired.features.maintenance'),
    t('app:trialExpired.features.support'),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      {/* Blurred background effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-lg border-2 border-destructive/20 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-display">
            {t('app:trialExpired.title')}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {t('app:trialExpired.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="h-10 mx-auto mb-4 opacity-50"
            />
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              {t('app:trialExpired.featuresTitle')}
            </h4>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <Link to="/subscribe" className="block">
              <Button variant="lavcom" size="xl" className="w-full">
                <Sparkles className="h-5 w-5 mr-2" />
                {t('app:trialExpired.cta')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              {t('app:trialExpired.priceInfo')}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Home className="h-4 w-4" />
                  {t('app:trialExpired.backToHome')}
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="flex-1 gap-2 text-muted-foreground hover:text-destructive"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                {t('app:trialExpired.signOut')}
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                {t('app:trialExpired.question')}{" "}
                <button 
                  onClick={onContactSupport}
                  className="text-primary hover:underline font-medium"
                >
                  {t('app:trialExpired.contact')}
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
