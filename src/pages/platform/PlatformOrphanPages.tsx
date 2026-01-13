import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileQuestion, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

interface OrphanPage {
  path: string;
  name: string;
  description: string;
  category: 'legacy' | 'internal' | 'utility' | 'deprecated';
}

// List of pages that are not linked from main navigation
const orphanPages: OrphanPage[] = [
  // Legacy admin pages (old admin system)
  { path: "/company-settings", name: "Company Settings", description: "Legacy company settings page (not in sidebar)", category: "legacy" },
  
  // Subscribe pages
  { path: "/subscribe-full", name: "Subscribe Full", description: "Full subscription flow (alternative to simple)", category: "utility" },
  
  // Hidden help alias
  { path: "/aide", name: "Aide (Help alias)", description: "French alias for /help page", category: "utility" },
  
  // Success/cancel pages (accessed via redirect)
  { path: "/simulator-payment-success", name: "Simulator Payment Success", description: "Redirect page after simulator payment", category: "internal" },
  { path: "/billing/success", name: "Billing Success", description: "Redirect page after subscription payment", category: "internal" },
  { path: "/billing/cancel", name: "Billing Cancel", description: "Redirect page after cancelled payment", category: "internal" },
  
  // Invitation flow
  { path: "/invitation", name: "Accept Invitation", description: "Team invitation acceptance page (accessed via email link)", category: "internal" },
  
  // Auth flow pages
  { path: "/reset-password", name: "Reset Password", description: "Password reset page (accessed via email link)", category: "internal" },
  { path: "/forgot-password", name: "Forgot Password", description: "Password recovery request page", category: "utility" },
];

const categoryColors: Record<string, string> = {
  legacy: "bg-amber-500/20 text-amber-600 border-amber-500/30",
  internal: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  utility: "bg-green-500/20 text-green-600 border-green-500/30",
  deprecated: "bg-red-500/20 text-red-600 border-red-500/30",
};

const categoryLabels: Record<string, string> = {
  legacy: "Legacy",
  internal: "Internal",
  utility: "Utility",
  deprecated: "Deprecated",
};

export default function PlatformOrphanPages() {
  const { t } = useTranslation(['app', 'common']);
  
  const groupedPages = orphanPages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, OrphanPage[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-amber-500" />
          {t('app:platformAdmin.nav.orphanPages', 'Orphan Pages')}
        </h1>
        <p className="text-muted-foreground mt-1">
          Pages that are not linked from the main navigation (admin, billing, or app sidebars)
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-600">About Orphan Pages</p>
              <p className="text-sm text-muted-foreground mt-1">
                These pages exist in the application but are not accessible through standard navigation. 
                They may be accessed via direct URL, redirects, email links, or legacy bookmarks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedPages).map(([category, pages]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{categoryLabels[category]} Pages</CardTitle>
              <Badge variant="outline" className={categoryColors[category]}>
                {pages.length}
              </Badge>
            </div>
            <CardDescription>
              {category === 'legacy' && "Pages from previous versions that may still be needed"}
              {category === 'internal' && "Pages accessed via redirects or external links (emails)"}
              {category === 'utility' && "Helper pages with alternative access paths"}
              {category === 'deprecated' && "Pages scheduled for removal"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pages.map((page) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                    className="shrink-0"
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
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(groupedPages).map(([category, pages]) => (
              <div key={category} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{pages.length}</div>
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
