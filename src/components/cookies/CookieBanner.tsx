import { useState, useEffect } from "react";
import { Cookie, X, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COOKIE_CONSENT_KEY = "lavcom_cookie_consent";

interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true, // Always required
    analytics: true,
    marketing: false,
  } as CookieConsent);

  useEffect(() => {
    const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!savedConsent) {
      // Show banner after a small delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullConsent));
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    const selectedConsent: CookieConsent = {
      ...consent,
      necessary: true, // Always required
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(selectedConsent));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const minimalConsent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(minimalConsent));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-card border-2 border-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          <div className="relative p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cookie className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-base sm:text-lg">
                  Nous respectons votre vie privée
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. 
                  Vous pouvez choisir quels cookies accepter.
                </p>
              </div>
            </div>

            {/* Details section */}
            {showDetails && (
              <div className="mb-4 p-4 bg-muted/50 rounded-xl space-y-3 animate-in fade-in-0 duration-200">
                <label className="flex items-center gap-3 cursor-not-allowed">
                  <div className="w-5 h-5 rounded border border-primary bg-primary/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">Cookies essentiels</span>
                    <span className="text-xs text-muted-foreground ml-2">(toujours actifs)</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    onClick={() => setConsent(prev => ({ ...prev, analytics: !prev.analytics }))}
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      consent.analytics 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border bg-background group-hover:border-primary/50"
                    )}
                  >
                    {consent.analytics && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">Cookies analytiques</span>
                    <p className="text-xs text-muted-foreground">Pour comprendre comment vous utilisez notre site</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    onClick={() => setConsent(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      consent.marketing 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-border bg-background group-hover:border-primary/50"
                    )}
                  >
                    {consent.marketing && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">Cookies marketing</span>
                    <p className="text-xs text-muted-foreground">Pour personnaliser les publicités</p>
                  </div>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button 
                onClick={handleAcceptAll} 
                className="order-1 sm:order-2"
              >
                <Check className="h-4 w-4 mr-2" />
                Tout accepter
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRejectAll}
                className="order-2 sm:order-1"
              >
                <X className="h-4 w-4 mr-2" />
                Refuser
              </Button>

              <Button
                variant="ghost"
                onClick={() => showDetails ? handleAcceptSelected() : setShowDetails(true)}
                className="order-3 text-muted-foreground"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                {showDetails ? "Enregistrer mes choix" : "Personnaliser"}
              </Button>

              <a 
                href="/mentions-legales" 
                className="order-4 text-xs text-muted-foreground hover:text-foreground transition-colors text-center sm:text-left sm:ml-auto"
              >
                Politique de confidentialité
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
