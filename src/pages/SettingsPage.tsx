import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, 
  User, 
  Shield, 
  CreditCard, 
  Building2, 
  Users,
  Bell,
  Receipt,
  FileText,
  Bot,
  ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/seo/SEOHead";
import { cn } from "@/lib/utils";

// Import existing settings components/content
import ProfileContent from "@/components/settings/ProfileContent";
import SecurityContent from "@/components/settings/SecurityContent";
import SubscriptionContent from "@/components/settings/SubscriptionContent";
import BillingContent from "@/components/settings/BillingContent";
import LaundryContent from "@/components/settings/LaundryContent";
import TeamContent from "@/components/settings/TeamContent";
import NotificationsContent from "@/components/settings/NotificationsContent";
import DocumentsContent from "@/components/settings/DocumentsContent";
import AuditLogSettingsContent from "@/components/settings/AuditLogSettingsContent";
import { AIUsageWidget } from "@/components/settings/AIUsageWidget";

import { History } from "lucide-react";

const TABS = [
  { id: "profile", label: "Profil", icon: User },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "subscription", label: "Abonnement", icon: CreditCard },
  { id: "billing", label: "Facturation", icon: Receipt },
  { id: "laundry", label: "Laverie", icon: Building2 },
  { id: "team", label: "Utilisateurs", icon: Users },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "audit", label: "Journaux", icon: ScrollText },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "ai", label: "IA", icon: Bot },
  { id: "history", label: "Historique", icon: History },
] as const;

type TabId = typeof TABS[number]["id"];

export default function SettingsPage() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialTab = (searchParams.get("tab") as TabId) || "profile";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabId);
    setSearchParams({ tab });
  };

  return (
    <>
      <SEOHead 
        title="Paramètres"
        description="Gérez vos paramètres de compte, sécurité, abonnement et préférences."
        url="/settings"
        noindex={true}
      />
      
      <div className="container max-w-6xl py-6 space-y-6">
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
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Paramètres
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez votre compte et vos préférences
            </p>
          </div>
        </div>

        {/* Tabs Layout */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab Navigation */}
          <div className="border-b">
            <TabsList className="h-auto p-0 bg-transparent gap-0 w-full justify-start overflow-x-auto flex-nowrap">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "data-[state=active]:shadow-none hover:bg-muted/50 transition-colors",
                    "whitespace-nowrap"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="profile" className="mt-0">
            <ProfileContent />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <SecurityContent />
          </TabsContent>

          <TabsContent value="subscription" className="mt-0">
            <SubscriptionContent />
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <BillingContent />
          </TabsContent>

          <TabsContent value="laundry" className="mt-0">
            <LaundryContent />
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <TeamContent />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationsContent />
          </TabsContent>

          <TabsContent value="audit" className="mt-0">
            <AuditLogSettingsContent />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <DocumentsContent />
          </TabsContent>

          <TabsContent value="ai" className="mt-0">
            <div className="max-w-md">
              <AIUsageWidget />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Consultez l'historique complet de vos données, imports et exports.
              </p>
              <Button onClick={() => navigate('/data-history')}>
                Voir l'historique complet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
