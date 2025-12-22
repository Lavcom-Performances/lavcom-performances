import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, ShoppingCart, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { useTranslation } from "react-i18next";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

export default function BillingCancel() {
  const { i18n } = useTranslation();

  return (
    <>
      <SEOHead 
        title={i18n.language === 'fr' ? "Paiement annulé | Lavcom Performances" : "Payment cancelled | Lavcom Performances"}
        description={i18n.language === 'fr' ? "Votre paiement a été annulé" : "Your payment has been cancelled"}
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex flex-col">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={lavcomLogo} alt="Lavcom Performances" className="h-8" />
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
          <div className="max-w-md w-full">
            <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-xl overflow-hidden">
              {/* Orange top bar */}
              <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-500" />
              
              <CardContent className="pt-8 pb-8 px-4 sm:px-6 md:px-8 text-center space-y-6">
                {/* Cancel icon */}
                <div className="flex justify-center">
                  <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 p-5 rounded-full shadow-lg">
                    <XCircle className="h-14 w-14 text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                    {i18n.language === 'fr' ? "Paiement annulé" : "Payment cancelled"}
                  </h1>
                  <p className="text-muted-foreground">
                    {i18n.language === 'fr' 
                      ? "Votre paiement n'a pas été finalisé. Aucun montant n'a été débité." 
                      : "Your payment was not completed. No charges were made."}
                  </p>
                </div>

                {/* Info box */}
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">
                        {i18n.language === 'fr' ? "Que s'est-il passé ?" : "What happened?"}
                      </p>
                      <p>
                        {i18n.language === 'fr' 
                          ? "Vous avez annulé le processus de paiement ou une erreur s'est produite. Vous pouvez réessayer à tout moment." 
                          : "You cancelled the payment process or an error occurred. You can try again at any time."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                  <Button 
                    asChild 
                    size="lg" 
                    className="w-full gap-2 text-base font-semibold"
                  >
                    <Link to="/subscribe-simulator">
                      <ShoppingCart className="h-5 w-5" />
                      {i18n.language === 'fr' ? "Revenir aux packs" : "Back to packs"}
                    </Link>
                  </Button>
                  
                  <Button 
                    asChild 
                    variant="ghost" 
                    size="lg"
                    className="w-full gap-2"
                  >
                    <Link to="/">
                      <ArrowLeft className="h-5 w-5" />
                      {i18n.language === 'fr' ? "Retour à l'accueil" : "Back to home"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Additional info */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              {i18n.language === 'fr' ? "Une question ?" : "Have a question?"}{" "}
              <Link to="/mentions-legales" className="underline hover:text-foreground transition-colors">
                {i18n.language === 'fr' ? "Contactez notre support" : "Contact our support"}
              </Link>
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
