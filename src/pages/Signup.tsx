import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Home, CheckCircle2, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import lavcomLogo from "@/assets/lavcom-performances-logo.png";
import { z } from "zod";
import { formatFirstName, formatLastName } from "@/lib/textUtils";

const signupSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  companyName: z.string().optional(),
});

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const result = signupSchema.safeParse({
      email,
      password,
      firstName,
      lastName,
      companyName,
    });
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }
    
    setIsLoading(true);
    
    // Format names before sending (TAEX-066)
    const formattedFirstName = formatFirstName(firstName);
    const formattedLastName = formatLastName(lastName);
    
    const { error } = await signUp(email, password, {
      first_name: formattedFirstName,
      last_name: formattedLastName,
      company_name: companyName,
    });
    
    setIsLoading(false);
    
    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Compte existant",
          description: "Un compte existe déjà avec cet email. Connectez-vous.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }
    
    toast({
      title: "Compte créé !",
      description: "Votre essai gratuit de 14 jours commence maintenant.",
    });
    
    navigate("/select-laundromat");
  };

  const trialFeatures = [
    "Accès complet à toutes les fonctionnalités",
    "Dashboard multi-laveries",
    "Export PDF des rapports",
    "Recommandations intelligentes",
    "Sans engagement, sans CB",
  ];

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border"
      >
        <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Accueil</span>
      </Link>

      {/* Left side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 lg:p-12" 
        style={{ backgroundColor: '#A5C800' }}
      >
        <div className="max-w-lg text-center animate-fade-in">
          <img 
            src={lavcomLogo} 
            alt="Lavcom Performances" 
            className="w-full max-w-md mx-auto mb-6 lg:mb-8"
          />
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gift className="h-6 w-6 text-white" />
              <h3 className="text-xl font-display font-bold text-white">
                14 jours d'essai gratuit
              </h3>
            </div>
            
            <ul className="space-y-3 text-left">
              {trialFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-white/90">
                  <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6 lg:space-y-8 animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-4 sm:mb-6">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-36 sm:w-48 mx-auto"
            />
          </div>

          <div className="space-y-1.5 md:space-y-2">
            <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
              Créer votre compte
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              Commencez votre essai gratuit de 14 jours
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jean"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jean.dupont@laverie.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise (optionnel)</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Ma Laverie SARL"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
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
                  Création en cours...
                </>
              ) : (
                "Démarrer mon essai gratuit"
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              En créant un compte, vous acceptez nos{" "}
              <a href="#" className="text-primary hover:underline">conditions d'utilisation</a>
              {" "}et notre{" "}
              <a href="#" className="text-primary hover:underline">politique de confidentialité</a>.
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              Connectez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
