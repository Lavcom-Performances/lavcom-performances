import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileQuestion, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface OrphanPage {
  path: string;
  name: string;
  description: string;
  category: 'legacy' | 'internal' | 'utility' | 'deprecated' | 'redirect' | 'public';
}

// ============================================
// ROUTES LINKED IN SIDEBARS (for reference)
// ============================================
// AppSidebar (main app):
//   /dashboard, /profitability, /recommendations, /maintenance, /operations, /import-export
//   /charts/annual, /charts/monthly, /charts/daily, /charts/payments, /charts/machines,
//   /charts/occupancy, /charts/hourly, /charts/daily-freq, /charts/half-hourly, /charts/heatmap, /charts/products
//   /simulation, /team, /roles-management, /settings, /settings?tab=security
//   /laundromat-settings, /select-laundromat, /help, /profile
//
// AdminSidebar (platform admin):
//   /admin, /admin/users, /admin/sites, /admin/analytics, /admin/roles, /admin/permissions,
//   /admin/audit-logs, /admin/login-history, /admin/system-status, /admin/expert-requests,
//   /admin/cron-logs, /admin/orphan-pages
//   Billing: /admin/sales, /admin/sales/invoices, /admin/sales/products, /admin/sales/reports

// List of pages that are NOT linked from main navigation
const orphanPages: OrphanPage[] = [
  // ============ PUBLIC PAGES (Landing/Marketing) ============
  { path: "/", name: "Landing Page", description: "Public homepage (not in app navigation)", category: "public" },
  { path: "/demo", name: "Demo Page", description: "Interactive demo without authentication", category: "public" },
  { path: "/pricing", name: "Pricing Page", description: "Public pricing information", category: "public" },
  { path: "/simulateur", name: "Simulateur", description: "Public simulator landing page", category: "public" },
  { path: "/mentions-legales", name: "Mentions Légales", description: "Legal notices (footer link)", category: "public" },
  { path: "/cgv", name: "CGV", description: "Terms and conditions (footer link)", category: "public" },
  { path: "/politique-confidentialite", name: "Politique de Confidentialité", description: "Privacy policy (footer link)", category: "public" },
  
  // ============ AUTH FLOW PAGES ============
  { path: "/login", name: "Login", description: "Authentication login page", category: "internal" },
  { path: "/signup", name: "Signup", description: "New user registration", category: "internal" },
  { path: "/forgot-password", name: "Forgot Password", description: "Password recovery request", category: "internal" },
  { path: "/reset-password", name: "Reset Password", description: "Password reset (accessed via email link)", category: "internal" },
  
  // ============ SUBSCRIPTION/PAYMENT FLOW ============
  { path: "/subscribe", name: "Subscribe (Simple)", description: "Simple subscription flow", category: "redirect" },
  { path: "/subscribe-full", name: "Subscribe (Full)", description: "Full subscription flow with all options", category: "utility" },
  { path: "/subscribe-simulator", name: "Subscribe Simulator", description: "Simulator-specific subscription", category: "redirect" },
  { path: "/simulator-payment-success", name: "Simulator Payment Success", description: "Redirect after simulator payment", category: "redirect" },
  { path: "/billing/success", name: "Billing Success", description: "Redirect after successful subscription", category: "redirect" },
  { path: "/billing/cancel", name: "Billing Cancel", description: "Redirect after cancelled payment", category: "redirect" },
  
  // ============ TEAM/INVITATION FLOW ============
  { path: "/invitation", name: "Accept Invitation", description: "Team invitation acceptance (accessed via email)", category: "internal" },
  
  // ============ SIMULATION WIZARD PAGES ============
  { path: "/simulation/local", name: "Simulation - Local", description: "Simulation wizard step 2 (location)", category: "utility" },
  { path: "/simulation/charges", name: "Simulation - Charges", description: "Simulation wizard step 3 (costs)", category: "utility" },
  { path: "/simulation/results", name: "Simulation - Results", description: "Simulation wizard step 4 (results)", category: "utility" },
  
  // ============ SETTINGS SUB-PAGES ============
  { path: "/settings/charges", name: "Costs Settings", description: "Site costs configuration page", category: "utility" },
  { path: "/settings/objectives", name: "Goals Settings", description: "Revenue goals configuration", category: "utility" },
  { path: "/security", name: "Security Page", description: "Dedicated security settings (also in /settings?tab=security)", category: "utility" },
  { path: "/subscription", name: "Subscription Management", description: "Manage active subscription", category: "utility" },
  { path: "/billing-history", name: "Billing History", description: "View past invoices and payments", category: "utility" },
  
  // ============ GETTING STARTED/ONBOARDING ============
  { path: "/getting-started", name: "Getting Started", description: "Onboarding wizard for new users", category: "utility" },
  
  // ============ LEGACY PAGES ============
  { path: "/company-settings", name: "Company Settings", description: "Legacy company settings (not in sidebar)", category: "legacy" },
  
  // ============ HIDDEN ALIASES ============
  { path: "/aide", name: "Aide (Help alias)", description: "French alias for /help page", category: "utility" },
];

const categoryColors: Record<string, string> = {
  legacy: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  internal: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  utility: "bg-green-500/20 text-green-600 border-green-500/30",
  deprecated: "bg-red-500/20 text-red-600 border-red-500/30",
  redirect: "bg-purple-500/20 text-purple-600 border-purple-500/30",
  public: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30",
};

const categoryLabels: Record<string, string> = {
  legacy: "Legacy",
  internal: "Auth/Internal",
  utility: "Utility",
  deprecated: "Deprecated",
  redirect: "Redirect",
  public: "Public",
};

const categoryDescriptions: Record<string, string> = {
  legacy: "Pages from previous versions that may still be needed",
  internal: "Auth flow and invitation pages accessed via redirects or email links",
  utility: "Helper pages, sub-pages, and wizard steps with alternative access paths",
  deprecated: "Pages scheduled for removal",
  redirect: "Payment and subscription redirect pages (accessed after Stripe flows)",
  public: "Public marketing pages not linked from authenticated app navigation",
};

export default function PlatformOrphanPages() {
  const { t } = useTranslation(['app', 'common']);
  
  const groupedPages = orphanPages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, OrphanPage[]>);

  // Order categories logically
  const categoryOrder = ['public', 'internal', 'redirect', 'utility', 'legacy', 'deprecated'];
  const orderedCategories = categoryOrder.filter(cat => groupedPages[cat]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-amber-500" />
          {t('app:platformAdmin.nav.orphanPages', 'Orphan Pages')}
        </h1>
        <p className="text-muted-foreground mt-1">
          Pages not linked from main navigation sidebars (admin, billing, or app)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">About Orphan Pages</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pages that exist but aren't in standard sidebar navigation. 
                  Accessed via direct URL, redirects, email links, or sub-navigation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-600">Linked Routes</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AppSidebar: dashboard, charts, profitability, operations, team, settings...
                  AdminSidebar: admin/*, sales/* routes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {orderedCategories.map((category) => {
        const pages = groupedPages[category];
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{categoryLabels[category]} Pages</CardTitle>
                <Badge variant="outline" className={categoryColors[category]}>
                  {pages.length}
                </Badge>
              </div>
              <CardDescription>{categoryDescriptions[category]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pages.map((page) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{page.name}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {page.path}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="shrink-0 ml-2"
                    >
                      <Link to={page.path} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {orderedCategories.map((category) => (
              <div key={category} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{groupedPages[category].length}</div>
                <div className="text-xs text-muted-foreground">{categoryLabels[category]}</div>
              </div>
            ))}
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <div className="text-2xl font-bold text-primary">{orphanPages.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
