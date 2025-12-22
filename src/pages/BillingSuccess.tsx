import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, Gift, Rocket, Calendar, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

const PACK_COLORS: Record<string, string> = {
  essential: "from-blue-500 to-cyan-500",
  project: "from-violet-500 to-purple-500",
  comparator: "from-orange-500 to-amber-500",
  premium: "from-emerald-500 to-teal-500",
};

// Confetti component
const Confetti = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      size: 8 + Math.random() * 8,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

interface ProfileEntitlements {
  access_expires_at: string | null;
  max_projects: number | null;
  plan_code: string | null;
}

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation(['app', 'common']);
  const [showContent, setShowContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entitlements, setEntitlements] = useState<ProfileEntitlements | null>(null);
  const [packId, setPackId] = useState<string>("essential");

  const fetchEntitlements = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("access_expires_at, max_projects, plan_code")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setEntitlements(data);
        if (data.plan_code) {
          setPackId(data.plan_code);
        }
      }
    } catch (err) {
      console.error("Error fetching entitlements:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get session_id from URL (for verification if needed later)
    const sessionId = searchParams.get("session_id");
    console.log("Checkout session completed:", sessionId);
    
    // Fetch entitlements with a small delay to allow webhook processing
    const timer = setTimeout(() => {
      fetchEntitlements();
    }, 1500);

    return () => clearTimeout(timer);
  }, [searchParams, fetchEntitlements]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const packColor = PACK_COLORS[packId] || PACK_COLORS.essential;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const packNames: Record<string, { fr: string; en: string }> = {
    essential: { fr: "Essentiel", en: "Essential" },
    project: { fr: "Projet", en: "Project" },
    comparator: { fr: "Comparateur", en: "Comparator" },
    premium: { fr: "Premium", en: "Premium" },
  };

  const packName = packNames[packId]?.[i18n.language === 'fr' ? 'fr' : 'en'] || "Essential";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {i18n.language === 'fr' ? "Vérification du paiement..." : "Verifying payment..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={i18n.language === 'fr' ? "Paiement réussi | Lavcom Performances" : "Payment successful | Lavcom Performances"}
        description={i18n.language === 'fr' ? "Votre paiement a été effectué avec succès" : "Your payment has been completed successfully"}
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex flex-col relative overflow-hidden">
        {/* Confetti animation */}
        <Confetti />
        
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${packColor} rounded-full opacity-20 blur-3xl animate-pulse`} />
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br ${packColor} rounded-full opacity-20 blur-3xl animate-pulse`} style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={lavcomLogo} alt="Lavcom Performances" className="h-8" />
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex items-center justify-center relative z-10">
          <div className={`max-w-lg w-full transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-xl overflow-hidden">
              {/* Gradient top bar */}
              <div className={`h-2 bg-gradient-to-r ${packColor}`} />
              
              <CardContent className="pt-8 pb-8 px-4 sm:px-6 md:px-8 text-center space-y-6">
                {/* Success icon with animation */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${packColor} rounded-full opacity-30 blur-xl animate-ping`} style={{ animationDuration: '2s' }} />
                    <div className={`absolute -inset-2 bg-gradient-to-r ${packColor} rounded-full opacity-20 blur-lg animate-pulse`} />
                    <div className={`relative bg-gradient-to-br ${packColor} p-5 rounded-full shadow-lg`}>
                      <CheckCircle className="h-14 w-14 text-white" strokeWidth={2.5} />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
                    <Gift className="absolute -bottom-1 -left-3 h-5 w-5 text-pink-400 animate-bounce" style={{ animationDelay: '0.8s' }} />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                    <span className={`bg-gradient-to-r ${packColor} bg-clip-text text-transparent`}>
                      {i18n.language === 'fr' ? "Félicitations !" : "Congratulations!"}
                    </span>
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground">
                    {i18n.language === 'fr' 
                      ? "Votre paiement a été effectué avec succès" 
                      : "Your payment has been completed successfully"}
                  </p>
                </div>

                {/* Pack details with real entitlements */}
                <div className="bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-4 sm:p-5 space-y-4 border border-border/50">
                  {/* Pack badge */}
                  <div className="flex items-center justify-center gap-2">
                    <div className={`bg-gradient-to-r ${packColor} p-1.5 rounded-lg`}>
                      <Rocket className="h-5 w-5 text-white" />
                    </div>
                    <span className={`font-bold text-lg sm:text-xl bg-gradient-to-r ${packColor} bg-clip-text text-transparent`}>
                      Pack {packName}
                    </span>
                  </div>
                  
                  {/* Entitlements display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-background/60 rounded-lg p-3 flex items-center gap-3">
                      <Calendar className={`h-5 w-5 text-primary flex-shrink-0`} />
                      <div className="text-left min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {i18n.language === 'fr' ? "Accès jusqu'au" : "Access until"}
                        </p>
                        <p className="font-semibold text-sm sm:text-base truncate">
                          {formatDate(entitlements?.access_expires_at || null)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-background/60 rounded-lg p-3 flex items-center gap-3">
                      <FolderOpen className={`h-5 w-5 text-primary flex-shrink-0`} />
                      <div className="text-left min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {i18n.language === 'fr' ? "Projets disponibles" : "Available projects"}
                        </p>
                        <p className="font-semibold text-sm sm:text-base">
                          {entitlements?.max_projects || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="space-y-4 pt-2">
                  <Button 
                    asChild 
                    size="lg" 
                    className={`w-full gap-2 text-base font-semibold bg-gradient-to-r ${packColor} hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] border-0`}
                  >
                    <Link to="/simulation">
                      <Rocket className="h-5 w-5" />
                      {i18n.language === 'fr' ? "Commencer ma simulation" : "Start my simulation"}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {i18n.language === 'fr' 
                      ? "Un email de confirmation vous a été envoyé" 
                      : "A confirmation email has been sent to you"}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Additional info */}
            <p className="text-center text-xs text-muted-foreground mt-6">
              {i18n.language === 'fr' ? "Besoin d'aide ?" : "Need help?"}{" "}
              <Link to="/mentions-legales" className="underline hover:text-foreground transition-colors">
                {i18n.language === 'fr' ? "Contactez-nous" : "Contact us"}
              </Link>
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
