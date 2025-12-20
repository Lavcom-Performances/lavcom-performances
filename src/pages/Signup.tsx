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
import { useTranslation } from "react-i18next";
import { PasswordStrengthIndicator, usePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";

export default function Signup() {
  const { t } = useTranslation(['app', 'common']);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  const { strength: passwordStrength } = usePasswordStrength(password);

  const signupSchema = z.object({
    email: z.string().email(t('app:signup.validation.invalidEmail')),
    password: z.string()
      .min(8, t('app:signup.validation.passwordMin'))
      .regex(/[A-Z]/, t('app:passwordStrength.criteria.hasUppercase'))
      .regex(/[a-z]/, t('app:passwordStrength.criteria.hasLowercase'))
      .regex(/[0-9]/, t('app:passwordStrength.criteria.hasNumber'))
      .regex(/[!@#$%^&*(),.?":{}|<>]/, t('app:passwordStrength.criteria.hasSpecial')),
    confirmPassword: z.string(),
    firstName: z.string().min(1, t('app:signup.validation.firstNameRequired')),
    lastName: z.string().min(1, t('app:signup.validation.lastNameRequired')),
    companyName: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('app:signup.validation.passwordMismatch'),
    path: ["confirmPassword"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const result = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
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
          title: t('app:signup.existingAccount'),
          description: t('app:signup.alreadyRegistered'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common:error'),
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }
    
    toast({
      title: t('app:signup.accountCreated'),
      description: t('app:signup.trialStarted'),
    });
    
    navigate("/dashboard");
  };

  const trialFeatures = [
    t('app:signup.trialFeatures.feature1'),
    t('app:signup.trialFeatures.feature2'),
    t('app:signup.trialFeatures.feature3'),
    t('app:signup.trialFeatures.feature4'),
    t('app:signup.trialFeatures.feature5'),
  ];

  return (
    <div className="min-h-screen flex bg-background relative">
      {/* Back to home button */}
      <Link 
        to="/" 
        className="absolute top-3 left-3 md:top-4 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-sm px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg border border-border"
      >
        <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">{t('common:home')}</span>
      </Link>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-muted/30 via-background to-primary/5 border-r border-border">
        <div className="max-w-md text-center animate-fade-in">
          {/* Logo */}
          <div className="mb-10">
            <img 
              src={lavcomLogo} 
              alt="Lavcom Performances" 
              className="w-full max-w-xs mx-auto"
            />
          </div>
          
          {/* Features card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground">
                {t('app:signup.trialFeatures.title')}
              </h3>
            </div>
            
            <ul className="space-y-3 text-left">
              {trialFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Decorative element */}
          <p className="mt-8 text-sm text-muted-foreground">
            {t('app:signup.decorativeText')}
          </p>
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
              {t('app:signup.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              {t('app:signup.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('app:signup.form.firstName')} *</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder={t('app:signup.form.firstNamePlaceholder')}
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
                <Label htmlFor="lastName">{t('app:signup.form.lastName')} *</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder={t('app:signup.form.lastNamePlaceholder')}
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
              <Label htmlFor="email">{t('app:signup.form.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('app:signup.form.emailPlaceholder')}
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
              <Label htmlFor="companyName">{t('app:signup.form.companyName')}</Label>
              <Input
                id="companyName"
                type="text"
                placeholder={t('app:signup.form.companyPlaceholder')}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('app:signup.form.password')} *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('app:signup.form.passwordPlaceholder')}
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
              <PasswordStrengthIndicator password={password} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('app:signup.form.confirmPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('app:signup.form.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
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
                  {t('app:signup.form.creating')}
                </>
              ) : (
                t('app:signup.form.submit')
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              {t('app:signup.terms')}{" "}
              <a href="#" className="text-primary hover:underline">{t('app:signup.termsOfUse')}</a>
              {" "}{t('app:signup.and')}{" "}
              <a href="#" className="text-primary hover:underline">{t('app:signup.privacyPolicy')}</a>.
            </p>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t('app:signup.alreadyHaveAccount')}{" "}
            <Link 
              to="/login" 
              className="text-primary hover:underline font-medium"
            >
              {t('app:signup.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
