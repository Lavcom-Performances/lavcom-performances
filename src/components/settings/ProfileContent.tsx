import { useState, useEffect } from "react";
import { Loader2, Save, Building2, Phone, FileText, Mail, Lock, Eye, EyeOff, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { formatFirstName, formatLastName } from "@/lib/textUtils";
import { PasswordStrengthIndicator, usePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ReAuthDialog } from "@/components/auth/ReAuthDialog";
import { useOnboarding } from "@/hooks/useOnboarding";

export default function ProfileContent() {
  const { t } = useTranslation(['app', 'common']);
  const { toast } = useToast();
  const { user, profile, updateProfile, updatePassword, loading: authLoading } = useAuth();
  const { resetOnboarding } = useOnboarding();
  
  // Profile form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showReAuthForPassword, setShowReAuthForPassword] = useState(false);
  const [pendingPasswordChange, setPendingPasswordChange] = useState(false);
  
  const { strength: passwordStrength } = usePasswordStrength(newPassword);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Sync form with profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setCompanyName(profile.company_name || "");
      setPhone(profile.phone || "");
      setSiret(profile.siret || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const profileSchema = z.object({
    firstName: z.string().min(1, t('app:profile.validation.firstNameRequired')),
    lastName: z.string().min(1, t('app:profile.validation.lastNameRequired')),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    siret: z.string().optional(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = profileSchema.safeParse({
      firstName,
      lastName,
      companyName,
      phone,
      siret,
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

    const { error } = await updateProfile({
      first_name: formatFirstName(firstName),
      last_name: formatLastName(lastName),
      company_name: companyName || null,
      phone: phone || null,
      siret: siret || null,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t('app:profile.updateSuccess'),
      description: t('app:profile.updateSuccessDescription'),
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    if (!newPassword) {
      setPasswordErrors({ newPassword: t('app:profile.password.required') });
      return;
    }

    if (passwordStrength === 'weak') {
      setPasswordErrors({ newPassword: t('app:profile.password.tooWeak') });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrors({ confirmPassword: t('app:profile.password.noMatch') });
      return;
    }

    setPendingPasswordChange(true);
    setShowReAuthForPassword(true);
  };

  const handlePasswordChangeAfterReAuth = async () => {
    setIsPasswordLoading(true);

    const { error } = await updatePassword(newPassword);

    setIsPasswordLoading(false);
    setPendingPasswordChange(false);

    if (error) {
      toast({
        title: t('common:error'),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    toast({
      title: t('app:profile.password.updateSuccess'),
      description: t('app:profile.password.updateSuccessDescription'),
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('app:profile.personalInfo')}</CardTitle>
          <CardDescription>{t('app:profile.personalInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {user && (
            <div className="flex justify-center pb-6 mb-6 border-b">
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={avatarUrl}
                firstName={firstName}
                lastName={lastName}
                onAvatarUpdate={(url) => setAvatarUrl(url)}
              />
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {t('app:profile.email')}
              </Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">{t('app:profile.emailReadOnly')}</p>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('app:profile.firstName')} *</Label>
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
                <Label htmlFor="lastName">{t('app:profile.lastName')} *</Label>
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

            {/* Company info */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t('app:profile.companyInfo')}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('app:profile.companyName')}</Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder={t('app:signup.form.companyPlaceholder')}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {t('app:profile.phone')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {t('app:profile.siret')}
                    </Label>
                    <Input
                      id="siret"
                      type="text"
                      placeholder="123 456 789 00012"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('app:profile.saving')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {t('app:profile.save')}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t('app:profile.password.title')}
          </CardTitle>
          <CardDescription>{t('app:profile.password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('app:profile.password.newPassword')} *</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder={t('app:profile.password.newPasswordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={`pr-10 ${passwordErrors.newPassword ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>
              )}
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('app:profile.password.confirmPassword')} *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('app:profile.password.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={`pr-10 ${passwordErrors.confirmPassword ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('app:profile.saving')}
                  </>
                ) : (
                  t('app:profile.password.update')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Onboarding Reset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Tutoriel
          </CardTitle>
          <CardDescription>Revoir le tutoriel de prise en main</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={resetOnboarding}>
            Relancer le tutoriel
          </Button>
        </CardContent>
      </Card>

      {/* ReAuth Dialog */}
      <ReAuthDialog
        open={showReAuthForPassword}
        onOpenChange={setShowReAuthForPassword}
        onSuccess={handlePasswordChangeAfterReAuth}
        title={t('app:profile.password.reauthTitle')}
        description={t('app:profile.password.reauthDescription')}
      />
    </div>
  );
}
