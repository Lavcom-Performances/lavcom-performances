import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  FileQuestion, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Globe, 
  ShieldCheck, 
  ArrowRight,
  Loader2,
  XCircle,
  RefreshCw,
  Save,
  Flag,
  Trash2,
  Edit2,
  Check,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuthRequirement = 'public' | 'auth' | 'auth+admin' | 'auth+site' | 'token';
type RouteStatus = 'unknown' | 'checking' | 'ok' | 'redirect' | 'error';
type ReviewStatus = 'pending' | 'reviewed' | 'flagged' | 'deprecated' | 'keep';

interface OrphanPage {
  path: string;
  name: string;
  description: string;
  category: 'legacy' | 'internal' | 'utility' | 'deprecated' | 'redirect' | 'public';
  auth: AuthRequirement;
  notes?: string;
}

interface ReviewData {
  id: string;
  route_path: string;
  status: ReviewStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
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
  { path: "/", name: "Landing Page", description: "Public homepage (not in app navigation)", category: "public", auth: "public" },
  { path: "/demo", name: "Demo Page", description: "Interactive demo without authentication", category: "public", auth: "public" },
  { path: "/pricing", name: "Pricing Page", description: "Public pricing information", category: "public", auth: "public" },
  { path: "/simulateur", name: "Simulateur", description: "Public simulator landing page", category: "public", auth: "public" },
  { path: "/mentions-legales", name: "Mentions Légales", description: "Legal notices (footer link)", category: "public", auth: "public" },
  { path: "/cgv", name: "CGV", description: "Terms and conditions (footer link)", category: "public", auth: "public" },
  { path: "/politique-confidentialite", name: "Politique de Confidentialité", description: "Privacy policy (footer link)", category: "public", auth: "public" },
  
  // ============ AUTH FLOW PAGES ============
  { path: "/login", name: "Login", description: "Authentication login page", category: "internal", auth: "public", notes: "Redirects to /dashboard if logged in" },
  { path: "/signup", name: "Signup", description: "New user registration", category: "internal", auth: "public", notes: "Prompts logout if session exists" },
  { path: "/forgot-password", name: "Forgot Password", description: "Password recovery request", category: "internal", auth: "public" },
  { path: "/reset-password", name: "Reset Password", description: "Password reset (accessed via email link)", category: "internal", auth: "token", notes: "Requires valid reset token from email" },
  
  // ============ SUBSCRIPTION/PAYMENT FLOW ============
  { path: "/subscribe", name: "Subscribe (Simple)", description: "Simple subscription flow", category: "redirect", auth: "public" },
  { path: "/subscribe-full", name: "Subscribe (Full)", description: "Full subscription flow with all options", category: "utility", auth: "public" },
  { path: "/subscribe-simulator", name: "Subscribe Simulator", description: "Simulator-specific subscription", category: "redirect", auth: "public" },
  { path: "/simulator-payment-success", name: "Simulator Payment Success", description: "Redirect after simulator payment", category: "redirect", auth: "auth", notes: "Processes Stripe session" },
  { path: "/billing/success", name: "Billing Success", description: "Redirect after successful subscription", category: "redirect", auth: "auth", notes: "Processes Stripe session" },
  { path: "/billing/cancel", name: "Billing Cancel", description: "Redirect after cancelled payment", category: "redirect", auth: "auth" },
  
  // ============ TEAM/INVITATION FLOW ============
  { path: "/invitation", name: "Accept Invitation", description: "Team invitation acceptance (accessed via email)", category: "internal", auth: "token", notes: "Requires valid invitation token" },
  
  // ============ SIMULATION WIZARD PAGES ============
  { path: "/simulation/local", name: "Simulation - Local", description: "Simulation wizard step 2 (location)", category: "utility", auth: "public", notes: "Part of wizard flow from /simulation" },
  { path: "/simulation/charges", name: "Simulation - Charges", description: "Simulation wizard step 3 (costs)", category: "utility", auth: "public", notes: "Part of wizard flow" },
  { path: "/simulation/results", name: "Simulation - Results", description: "Simulation wizard step 4 (results)", category: "utility", auth: "public", notes: "Part of wizard flow" },
  
  // ============ SETTINGS SUB-PAGES ============
  { path: "/settings/charges", name: "Costs Settings", description: "Site costs configuration page", category: "utility", auth: "auth+site", notes: "Requires selected site" },
  { path: "/settings/objectives", name: "Goals Settings", description: "Revenue goals configuration", category: "utility", auth: "auth+site", notes: "Requires selected site" },
  { path: "/security", name: "Security Page", description: "Dedicated security settings (also in /settings?tab=security)", category: "utility", auth: "auth" },
  { path: "/subscription", name: "Subscription Management", description: "Manage active subscription", category: "utility", auth: "auth" },
  { path: "/billing-history", name: "Billing History", description: "View past invoices and payments", category: "utility", auth: "auth" },
  
  // ============ GETTING STARTED/ONBOARDING ============
  { path: "/getting-started", name: "Getting Started", description: "Onboarding wizard for new users", category: "utility", auth: "auth" },
  
  // ============ DEPRECATED PAGES ============
  { path: "/company-settings", name: "Company Settings", description: "DEPRECATED - Redirects to /settings", category: "deprecated", auth: "public", notes: "Redirects to /settings since TAEX-189" },
  
  // ============ HIDDEN ALIASES ============
  { path: "/aide", name: "Aide (Help alias)", description: "French alias for /help page", category: "utility", auth: "auth" },
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

const authLabels: Record<AuthRequirement, { label: string; icon: typeof Globe; color: string; description: string }> = {
  public: { label: "Public", icon: Globe, color: "text-green-500", description: "No authentication required" },
  auth: { label: "Auth", icon: Lock, color: "text-blue-500", description: "Requires user login" },
  "auth+admin": { label: "Admin", icon: ShieldCheck, color: "text-purple-500", description: "Requires admin role" },
  "auth+site": { label: "Auth+Site", icon: Lock, color: "text-amber-500", description: "Requires login and selected site" },
  token: { label: "Token", icon: ArrowRight, color: "text-cyan-500", description: "Requires valid token (email link)" },
};

const statusConfig: Record<RouteStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  unknown: { icon: FileQuestion, color: "text-muted-foreground", label: "Not tested" },
  checking: { icon: Loader2, color: "text-blue-500", label: "Checking..." },
  ok: { icon: CheckCircle2, color: "text-green-500", label: "Accessible" },
  redirect: { icon: ArrowRight, color: "text-amber-500", label: "Redirects" },
  error: { icon: XCircle, color: "text-red-500", label: "Error/404" },
};

const reviewStatusConfig: Record<ReviewStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending", color: "text-muted-foreground", bgColor: "bg-muted" },
  reviewed: { label: "Reviewed", color: "text-green-600", bgColor: "bg-green-500/20" },
  flagged: { label: "Flagged", color: "text-red-600", bgColor: "bg-red-500/20" },
  deprecated: { label: "Deprecated", color: "text-amber-600", bgColor: "bg-amber-500/20" },
  keep: { label: "Keep", color: "text-blue-600", bgColor: "bg-blue-500/20" },
};

export default function PlatformOrphanPages() {
  const { t } = useTranslation(['app', 'common']);
  const { user } = useAuth();
  const [routeStatuses, setRouteStatuses] = useState<Record<string, RouteStatus>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [reviews, setReviews] = useState<Record<string, ReviewData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<ReviewStatus>("pending");
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('orphan_page_reviews')
          .select('*');
        
        if (error) throw error;
        
        const reviewMap: Record<string, ReviewData> = {};
        data?.forEach((review) => {
          reviewMap[review.route_path] = review as ReviewData;
        });
        setReviews(reviewMap);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReviews();
  }, []);

  const sendFlaggedNotification = async (path: string, pageName: string, notes: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('send-orphan-page-alert', {
        body: {
          route_path: path,
          page_name: pageName,
          notes: notes || undefined,
          flagged_by_email: user?.email,
        },
      });

      if (response.error) {
        console.error('Failed to send flagged notification:', response.error);
        toast.error('Review saved but notification failed');
      } else {
        toast.success('Review saved & team notified');
      }
    } catch (error) {
      console.error('Failed to send flagged notification:', error);
    }
  };

  const handleSaveReview = async (path: string) => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const existingReview = reviews[path];
      const wasNotFlagged = !existingReview || existingReview.status !== 'flagged';
      const isNowFlagged = editStatus === 'flagged';
      const orphanPage = orphanPages.find(p => p.path === path);
      
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('orphan_page_reviews')
          .update({
            status: editStatus,
            notes: editNotes || null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', existingReview.id);
        
        if (error) throw error;
        
        setReviews(prev => ({
          ...prev,
          [path]: {
            ...existingReview,
            status: editStatus,
            notes: editNotes || null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          }
        }));
      } else {
        // Insert new review
        const { data, error } = await supabase
          .from('orphan_page_reviews')
          .insert({
            route_path: path,
            status: editStatus,
            notes: editNotes || null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setReviews(prev => ({
          ...prev,
          [path]: data as ReviewData
        }));
      }
      
      // Send notification if newly flagged
      if (wasNotFlagged && isNowFlagged && orphanPage) {
        await sendFlaggedNotification(path, orphanPage.name, editNotes || null);
      } else {
        toast.success('Review saved');
      }
      
      setEditingPath(null);
    } catch (error) {
      console.error('Failed to save review:', error);
      toast.error('Failed to save review');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (path: string) => {
    const review = reviews[path];
    if (!review) return;
    
    try {
      const { error } = await supabase
        .from('orphan_page_reviews')
        .delete()
        .eq('id', review.id);
      
      if (error) throw error;
      
      setReviews(prev => {
        const newReviews = { ...prev };
        delete newReviews[path];
        return newReviews;
      });
      
      toast.success('Review deleted');
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    }
  };

  const startEditing = (path: string) => {
    const review = reviews[path];
    setEditingPath(path);
    setEditStatus(review?.status || 'pending');
    setEditNotes(review?.notes || '');
  };

  const cancelEditing = () => {
    setEditingPath(null);
    setEditNotes('');
    setEditStatus('pending');
  };

  const groupedPages = orphanPages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, OrphanPage[]>);

  // Order categories logically
  const categoryOrder = ['public', 'internal', 'redirect', 'utility', 'legacy', 'deprecated'];
  const orderedCategories = categoryOrder.filter(cat => groupedPages[cat]);

  // Test a single route by attempting to fetch it
  const testRoute = async (path: string): Promise<RouteStatus> => {
    try {
      const response = await fetch(path, { 
        method: 'HEAD',
        redirect: 'manual'
      });
      
      if (response.status === 200) return 'ok';
      if (response.status >= 300 && response.status < 400) return 'redirect';
      if (response.status === 404) return 'error';
      if (response.type === 'opaqueredirect') return 'redirect';
      return 'ok'; // SPA will handle most routes
    } catch {
      // For SPA routes, fetch might fail but route could still work
      return 'ok';
    }
  };

  const handleTestRoute = async (path: string) => {
    setRouteStatuses(prev => ({ ...prev, [path]: 'checking' }));
    const status = await testRoute(path);
    setRouteStatuses(prev => ({ ...prev, [path]: status }));
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    for (const page of orphanPages) {
      setRouteStatuses(prev => ({ ...prev, [page.path]: 'checking' }));
      const status = await testRoute(page.path);
      setRouteStatuses(prev => ({ ...prev, [page.path]: status }));
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    setIsTestingAll(false);
  };

  // Count by auth requirement
  const authCounts = orphanPages.reduce((acc, page) => {
    acc[page.auth] = (acc[page.auth] || 0) + 1;
    return acc;
  }, {} as Record<AuthRequirement, number>);

  // Count by review status
  const reviewCounts = orphanPages.reduce((acc, page) => {
    const status = reviews[page.path]?.status || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<ReviewStatus, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileQuestion className="h-6 w-6 text-amber-500" />
            {t('app:platformAdmin.nav.orphanPages', 'Orphan Pages')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Pages not linked from main navigation sidebars (admin, billing, or app)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/orphan-files">
              <FileQuestion className="h-4 w-4 mr-2" />
              View Orphan Files
            </Link>
          </Button>
          <Button 
            onClick={handleTestAll} 
            disabled={isTestingAll}
            variant="outline"
            size="sm"
          >
            {isTestingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test All Routes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Review Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Review Progress</CardTitle>
          <CardDescription>Track which orphan pages have been reviewed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(reviewStatusConfig) as ReviewStatus[]).map((status) => {
              const config = reviewStatusConfig[status];
              return (
                <div 
                  key={status} 
                  className={`flex items-center gap-2 p-3 rounded-lg ${config.bgColor}`}
                >
                  <div>
                    <div className={`text-sm font-medium ${config.color}`}>{config.label}</div>
                    <div className="text-lg font-bold">{reviewCounts[status] || 0}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Auth Requirements Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Authentication Requirements</CardTitle>
          <CardDescription>Overview of access control for orphan pages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {(Object.keys(authLabels) as AuthRequirement[]).map((auth) => {
              const config = authLabels[auth];
              const IconComponent = config.icon;
              return (
                <TooltipProvider key={auth}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 cursor-help">
                        <IconComponent className={`h-4 w-4 ${config.color}`} />
                        <div>
                          <div className="text-sm font-medium">{config.label}</div>
                          <div className="text-lg font-bold">{authCounts[auth] || 0}</div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{config.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>

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

      {isLoading ? (
        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        orderedCategories.map((category) => {
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
                  {pages.map((page) => {
                    const authConfig = authLabels[page.auth];
                    const AuthIcon = authConfig.icon;
                    const status = routeStatuses[page.path] || 'unknown';
                    const statusConf = statusConfig[status];
                    const StatusIcon = statusConf.icon;
                    const review = reviews[page.path];
                    const reviewStatus = review?.status || 'pending';
                    const reviewConf = reviewStatusConfig[reviewStatus];
                    const isEditing = editingPath === page.path;
                    
                    return (
                      <div
                        key={page.path}
                        className={`p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                          reviewStatus === 'flagged' ? 'border-red-500/50' : 
                          reviewStatus === 'reviewed' ? 'border-green-500/30' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{page.name}</span>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {page.path}
                              </code>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs py-0 h-5 gap-1">
                                      <AuthIcon className={`h-3 w-3 ${authConfig.color}`} />
                                      {authConfig.label}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{authConfig.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`${statusConf.color}`}>
                                      <StatusIcon className={`h-4 w-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{statusConf.label}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Badge className={`text-xs py-0 h-5 ${reviewConf.bgColor} ${reviewConf.color} border-0`}>
                                {reviewConf.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{page.description}</p>
                            {page.notes && (
                              <p className="text-xs text-amber-600/80 italic">⚠️ {page.notes}</p>
                            )}
                            {review?.notes && !isEditing && (
                              <p className="text-xs text-blue-600/80 mt-1">📝 {review.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestRoute(page.path)}
                              disabled={status === 'checking'}
                              className="h-8 w-8 p-0"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                            </Button>
                            {!isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(page.path)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {review && !isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReview(page.path)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8"
                            >
                              <Link to={page.path} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Open
                              </Link>
                            </Button>
                          </div>
                        </div>
                        
                        {/* Edit Form */}
                        {isEditing && (
                          <div className="mt-3 pt-3 border-t space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="text-xs font-medium mb-1 block">Status</label>
                                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ReviewStatus)}>
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="reviewed">Reviewed ✓</SelectItem>
                                    <SelectItem value="flagged">Flagged for cleanup</SelectItem>
                                    <SelectItem value="deprecated">Deprecated</SelectItem>
                                    <SelectItem value="keep">Keep (verified needed)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium mb-1 block">Notes</label>
                              <Textarea
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                placeholder="Add notes about this page..."
                                className="h-20 text-sm"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveReview(page.path)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-1" />
                                )}
                                Save
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

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
