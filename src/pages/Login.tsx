import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import lavcomLogo from "@/assets/lavcom-analytics-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get mode and redirect from URL params
  const mode = searchParams.get("mode") ?? "exploitant";
  const redirectUrl = searchParams.get("redirect");

  const isSimulatorMode = mode === "simulateur";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulated login for V1 demo
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Connexion réussie",
        description: isSimulatorMode 
          ? "Bienvenue sur Lavcom Analytics Création" 
          : "Bienvenue sur Lavcom Analytics",
      });
      
      // Redirect based on mode
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (isSimulatorMode) {
        // Futur exploitant: redirect to simulator
        navigate("/simulation");
      } else {
        // Exploitant: redirect to laundromat selection
        navigate("/select-laundromat");
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border"
      >
        <Home className="h-4 w-4" />
        Accueil
      </Link>

      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" 
        style={{ backgroundColor: isSimulatorMode ? '#b45309' : '#383838' }}
      >
        <div className="max-w-lg text-center animate-fade-in">
          <img 
            src={lavcomLogo} 
            alt="Lavcom Analytics" 
            className="w-full max-w-md mx-auto mb-8"
          />
          <p className="text-white text-lg">
            {isSimulatorMode 
              ? "Simulez la rentabilité de votre future laverie"
              : "Analysez les performances de vos laveries en un coup d'œil"
            }
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {isSimulatorMode ? (
              <>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">5 min</p>
                  <p className="text-sm text-white/70">Estimation rapide</p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">PDF</p>
                  <p className="text-sm text-white/70">Rapport banque</p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">∞</p>
                  <p className="text-sm text-white/70">Scénarios illimités</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">24/7</p>
                  <p className="text-sm text-white/70">Suivi temps réel</p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">+30%</p>
                  <p className="text-sm text-white/70">Gain de temps</p>
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-display font-bold text-white">100%</p>
                  <p className="text-sm text-white/70">Données sécurisées</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Analytics" 
              className="w-48 mx-auto"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-semibold text-foreground">
              {isSimulatorMode ? "Connexion Simulateur" : "Connexion"}
            </h2>
            <p className="text-muted-foreground">
              {isSimulatorMode 
                ? "Accédez à votre espace simulation"
                : "Entrez vos identifiants pour accéder à votre espace"
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <Button
              type="submit"
              variant="lavcom"
              size="xl"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore abonné ?{" "}
            <Link 
              to={isSimulatorMode ? "/subscribe-simulator" : "/pricing"} 
              className="text-primary hover:underline font-medium"
            >
              {isSimulatorMode ? "Découvrir les packs simulateur" : "Découvrir nos offres"}
            </Link>
          </p>

          {/* Mode switch */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              {isSimulatorMode ? (
                <>
                  Vous êtes exploitant ?{" "}
                  <Link to="/login?mode=exploitant" className="text-primary hover:underline">
                    Connexion exploitant
                  </Link>
                </>
              ) : (
                <>
                  Vous voulez ouvrir une laverie ?{" "}
                  <Link to="/login?mode=simulateur" className="text-primary hover:underline">
                    Connexion simulateur
                  </Link>
                </>
              )}
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Besoin d'aide ?{" "}
            <a href="#" className="text-primary hover:underline">
              Contactez le support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
