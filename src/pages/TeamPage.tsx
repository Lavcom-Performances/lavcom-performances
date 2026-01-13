/**
 * TeamPage - Company team management page
 * 
 * This page is for COMPANY admins (company_admin/super_admin organization roles)
 * to manage their organization's team members.
 * 
 * NOT to be confused with /admin/users which is for PLATFORM admins.
 */
import { useTranslation } from "react-i18next";
import TeamContent from "@/components/settings/TeamContent";
import { SEOHead } from "@/components/seo/SEOHead";

export default function TeamPage() {
  const { t } = useTranslation(['app']);

  return (
    <>
      <SEOHead 
        title={t('app:nav.team', 'Équipe')}
        description="Gérez les membres de votre équipe et leurs permissions"
      />
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('app:nav.team', 'Équipe')}</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre organisation et leurs permissions
          </p>
        </div>
        <TeamContent />
      </div>
    </>
  );
}
