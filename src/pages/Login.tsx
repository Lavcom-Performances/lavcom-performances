import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { translations } from "@/lib/i18n";

const t = translations.login;
const tCommon = translations.common;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { signIn, isAuthenticated, loading } = useAuth();

  // Get mode and redirect from URL params
  const mode = searchParams.get("mode") ?? "exploitant";
  const redirectUrl = searchParams.get("redirect");
  const isSimulatorMode = mode === "simulateur";

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (isSimulatorMode) {
        navigate("/simulation");
      } else {
        navigate("/select-laundromat");
      }
    }
  }, [loading, isAuthenticated, navigate, redirectUrl, isSimulatorMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    setIsLoading(false);
    
    if (error) {
      let errorMessage = error.message;
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email ou mot de passe incorrect";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Veuillez confirmer votre email";
      }
      
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: t.loginSuccess,
      description: isSimulatorMode ? t.welcomeSimulator : t.welcomeExploitant,
    });
    
    // Redirect based on mode
    if (redirectUrl) {
      navigate(redirectUrl);
    } else if (isSimulatorMode) {
      navigate("/simulation");
    } else {
      navigate("/select-laundromat");
    }
  };

  const currentMode = isSimulatorMode ? t.simulator : t.exploitant;

  // Don't render if already authenticated and loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border"
      >
        <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">{tCommon.home}</span>
      </Link>

      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 lg:p-12" 
        style={{ backgroundColor: isSimulatorMode ? '#b45309' : '#383838' }}
      >
        <div className="max-w-lg text-center animate-fade-in">
          <img 
            src={lavcomLogo} 
            alt="Lavcom Performances" 
            className="w-full max-w-md mx-auto mb-6 lg:mb-8"
          />
          <p className="text-white text-base lg:text-lg">
            {currentMode.leftPanelSubtitle}
          </p>
          <div className="mt-8 lg:mt-12 grid grid-cols-3 gap-4 lg:gap-6 text-center">
            {isSimulatorMode ? (
              <>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.simulator.stats.quickEstimate}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.simulator.stats.quickEstimateLabel}</p>
                </div>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.simulator.stats.bankReport}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.simulator.stats.bankReportLabel}</p>
                </div>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.simulator.stats.unlimitedScenarios}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.simulator.stats.unlimitedScenariosLabel}</p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.exploitant.stats.realtime}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.exploitant.stats.realtimeLabel}</p>
                </div>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.exploitant.stats.timeSaved}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.exploitant.stats.timeSavedLabel}</p>
                </div>
                <div className="space-y-1.5 lg:space-y-2">
                  <p className="text-2xl lg:text-3xl font-display font-bold text-white">{t.exploitant.stats.secureData}</p>
                  <p className="text-xs lg:text-sm text-white/70">{t.exploitant.stats.secureDataLabel}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 lg:space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-4 sm:mb-6 lg:mb-8">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-36 sm:w-48 mx-auto"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
              {currentMode.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {currentMode.subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t.form.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.form.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t.form.password}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.form.passwordPlaceholder}
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
                {t.form.forgotPassword}
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
                  {t.form.connecting}
                </>
              ) : (
                t.form.submit
              )}
            </Button>
          </form>

          {/* Free trial CTA */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Link to="/signup" className="block">
            <Button variant="outline" size="lg" className="w-full group">
              <Sparkles className="h-4 w-4 mr-2 text-primary group-hover:text-primary" />
              Essai gratuit 14 jours
            </Button>
          </Link>

          <p className="text-center text-sm text-muted-foreground">
            {t.notSubscribed}{" "}
            <Link 
              to={isSimulatorMode ? "/subscribe-simulator" : "/pricing"} 
              className="text-primary hover:underline font-medium"
            >
              {isSimulatorMode ? t.discoverSimulatorPacks : t.discoverOffers}
            </Link>
          </p>

          {/* Mode switch */}
          <div className="pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              {isSimulatorMode ? (
                <>
                  {t.switchToExploitant}{" "}
                  <Link to="/login?mode=exploitant" className="text-primary hover:underline">
                    {t.exploitantLogin}
                  </Link>
                </>
              ) : (
                <>
                  {t.switchToSimulator}{" "}
                  <Link to="/login?mode=simulateur" className="text-primary hover:underline">
                    {t.simulatorLogin}
                  </Link>
                </>
              )}
            </p>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {tCommon.needHelp}{" "}
            <a href="#" className="text-primary hover:underline">
              {tCommon.contactSupport}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
