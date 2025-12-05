import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulated login for V1 demo
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Lavcom Analytics",
      });
      navigate("/select-laundromat");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ backgroundColor: '#383838' }}>
        <div className="max-w-lg text-center animate-fade-in">
          <img 
            src={lavcomLogo} 
            alt="Lavcom Analytics" 
            className="w-full max-w-md mx-auto mb-8"
          />
          <p className="text-lavcom-gray text-lg">
            Analysez les performances de vos laveries en un coup d'œil
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
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
              Connexion
            </h2>
            <p className="text-muted-foreground">
              Entrez vos identifiants pour accéder à votre espace
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
