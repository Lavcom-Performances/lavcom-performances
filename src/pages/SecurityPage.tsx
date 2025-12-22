import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SecurityCenter } from "@/components/security/SecurityCenter";
import { SEOHead } from "@/components/seo/SEOHead";

export default function SecurityPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Centre de sécurité"
        description="Gérez la sécurité de votre compte Lavcom Performances."
        url="/security"
        noindex={true}
      />
      <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label={t('common:back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              {t('app:securityCenter.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('app:securityCenter.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Security Center */}
      <SecurityCenter />
    </div>
    </>
  );
}
