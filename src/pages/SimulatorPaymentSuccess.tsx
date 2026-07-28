import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Sparkles, Gift, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";

const PACK_NAMES: Record<string, string> = {
  essential: "Essentiel",
  project: "Projet",
  comparator: "Comparateur",
  premium: "Premium",
};

const PACK_FEATURES: Record<string, string[]> = {
  essential: ["1 projet de simulation", "Accès 30 jours", "Export PDF"],
  project: ["3 projets de simulation", "Accès 90 jours", "Export PDF", "Comparaison scénarios"],
  comparator: ["5 projets de simulation", "Accès 180 jours", "Export PDF", "Comparaison scénarios", "Support prioritaire"],
  premium: ["Projets illimités", "Accès 90 jours", "Export PDF", "Comparaison scénarios", "Support prioritaire", "Accès anticipé nouvelles fonctionnalités"],
};

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

export default function SimulatorPaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [packId, setPackId] = useState<string>("essential");
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const pack = searchParams.get("pack");
    if (pack && PACK_NAMES[pack]) {
      setPackId(pack);
    }
    // Delay content animation
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const packName = PACK_NAMES[packId] || "Essentiel";
  const packFeatures = PACK_FEATURES[packId] || PACK_FEATURES.essential;
  const packColor = PACK_COLORS[packId] || PACK_COLORS.essential;

  return (
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
            
            <CardContent className="pt-8 pb-8 px-6 md:px-8 text-center space-y-6">
              {/* Success icon with animation */}
              <div className="flex justify-center">
                <div className="relative">
                  {/* Animated rings */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${packColor} rounded-full opacity-30 blur-xl animate-ping`} style={{ animationDuration: '2s' }} />
                  <div className={`absolute -inset-2 bg-gradient-to-r ${packColor} rounded-full opacity-20 blur-lg animate-pulse`} />
                  
                  {/* Main icon container */}
                  <div className={`relative bg-gradient-to-br ${packColor} p-5 rounded-full shadow-lg`}>
                    <CheckCircle className="h-14 w-14 text-white" strokeWidth={2.5} />
                  </div>
                  
                  {/* Floating sparkles */}
                  <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-bounce" style={{ animationDelay: '0.5s' }} />
                  <Gift className="absolute -bottom-1 -left-3 h-5 w-5 text-pink-400 animate-bounce" style={{ animationDelay: '0.8s' }} />
                </div>
              </div>

              {/* Title with gradient */}
              <div className="space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold">
                  <span className={`bg-gradient-to-r ${packColor} bg-clip-text text-transparent`}>
                    Félicitations !
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground">
                  Votre paiement a été effectué avec succès
                </p>
              </div>

              {/* Pack details card */}
              <div className={`relative bg-gradient-to-br from-muted/80 to-muted/40 rounded-xl p-5 space-y-4 border border-border/50`}>
                {/* Pack badge */}
                <div className="flex items-center justify-center gap-2">
                  <div className={`bg-gradient-to-r ${packColor} p-1.5 rounded-lg`}>
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <span className={`font-bold text-xl bg-gradient-to-r ${packColor} bg-clip-text text-transparent`}>
                    Pack {packName}
                  </span>
                </div>
                
                {/* Features list */}
                <ul className="space-y-2">
                  {packFeatures.map((feature, index) => (
                    <li 
                      key={index} 
                      className="flex items-center gap-3 text-sm text-foreground/80 transition-all duration-300"
                      style={{ 
                        animationDelay: `${0.1 * index}s`,
                        opacity: showContent ? 1 : 0,
                        transform: showContent ? 'translateX(0)' : 'translateX(-10px)',
                        transitionDelay: `${0.3 + 0.1 * index}s`
                      }}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-r ${packColor} flex items-center justify-center`}>
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Section */}
              <div className="space-y-4 pt-2">
                <Button 
                  asChild 
                  size="lg" 
                  className={`w-full gap-2 text-base font-semibold bg-gradient-to-r ${packColor} hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] border-0`}
                >
                  <Link to="/dashboard-simulator">
                    <Rocket className="h-5 w-5" />
                    Accéder à mon tableau de bord
                    <ArrowRight className="h-5 w-5" />
                  </Link>

                </Button>
                
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Un email de confirmation vous a été envoyé
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Additional info */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Besoin d'aide ? <Link to="/mentions-legales" className="underline hover:text-foreground transition-colors">Contactez-nous</Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
