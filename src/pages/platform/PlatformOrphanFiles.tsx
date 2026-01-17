import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileX2, 
  AlertTriangle, 
  Trash2, 
  ExternalLink,
  FileCode,
  FolderOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FileStatus = 'orphan' | 'deprecated' | 'legacy' | 'wrapper';

interface OrphanFile {
  path: string;
  name: string;
  description: string;
  status: FileStatus;
  recommendation: 'delete' | 'keep' | 'refactor' | 'review';
  usedBy?: string;
  replacedBy?: string;
  notes?: string;
}

// List of orphan files discovered in the codebase
const orphanFiles: OrphanFile[] = [
  // ============ DEPRECATED FILES ============
  {
    path: "src/pages/CompanySettings.tsx",
    name: "CompanySettings",
    description: "Deprecated company settings page",
    status: "deprecated",
    recommendation: "delete",
    replacedBy: "/settings (SettingsPage.tsx)",
    notes: "Route redirects to /settings since TAEX-189. File can be safely deleted."
  },
  
  // ============ LEGACY FILES (REPLACED BY PLATFORM VERSIONS) ============
  {
    path: "src/pages/AdminDashboard.tsx",
    name: "AdminDashboard",
    description: "Legacy admin dashboard - not used in any route",
    status: "legacy",
    recommendation: "delete",
    replacedBy: "PlatformAdminHome (src/pages/platform/PlatformAdminHome.tsx)",
    notes: "Imported in App.tsx but never used in any Route. Platform admin uses PlatformAdminHome."
  },
  {
    path: "src/pages/AdminUsers.tsx",
    name: "AdminUsers",
    description: "Legacy admin users page - not used in any route",
    status: "legacy",
    recommendation: "delete",
    replacedBy: "PlatformAdminUsers (src/pages/platform/PlatformAdminUsers.tsx)",
    notes: "Imported in App.tsx but never used in any Route. Platform admin uses PlatformAdminUsers."
  },
  
  // ============ UNUSED SIMULATION FILE ============
  {
    path: "src/pages/SimulationPage.tsx",
    name: "SimulationPage",
    description: "Old simulation page with stepper (monolithic)",
    status: "legacy",
    recommendation: "delete",
    replacedBy: "Simulation wizard (src/pages/simulation/*.tsx)",
    notes: "Replaced by dedicated pages: SimulationProjectPage, SimulationLocalPage, SimulationChargesPage, SimulationResultsPage"
  },
  
  // ============ WRAPPER FILES (INTENTIONAL) ============
  {
    path: "src/pages/Index.tsx",
    name: "Index",
    description: "Wrapper that imports and renders LandingPage",
    status: "wrapper",
    recommendation: "keep",
    usedBy: "Route '/' in App.tsx",
    notes: "Intentional wrapper pattern - keeps routing clean. LandingPage is the actual implementation."
  },
  {
    path: "src/pages/LandingPage.tsx",
    name: "LandingPage",
    description: "Actual landing page implementation",
    status: "wrapper",
    recommendation: "keep",
    usedBy: "Index.tsx wrapper",
    notes: "Contains the actual landing page. Used by Index.tsx wrapper."
  },
];

const statusConfig: Record<FileStatus, { label: string; color: string; bgColor: string; icon: typeof FileX2 }> = {
  orphan: { label: "Orphan", color: "text-red-600", bgColor: "bg-red-500/20", icon: FileX2 },
  deprecated: { label: "Deprecated", color: "text-amber-600", bgColor: "bg-amber-500/20", icon: AlertTriangle },
  legacy: { label: "Legacy", color: "text-orange-600", bgColor: "bg-orange-500/20", icon: FileCode },
  wrapper: { label: "Wrapper", color: "text-blue-600", bgColor: "bg-blue-500/20", icon: FolderOpen },
};

const recommendationConfig: Record<string, { label: string; color: string; icon: typeof Trash2 }> = {
  delete: { label: "Safe to Delete", color: "text-red-500", icon: Trash2 },
  keep: { label: "Keep", color: "text-green-500", icon: CheckCircle2 },
  refactor: { label: "Refactor", color: "text-blue-500", icon: RefreshCw },
  review: { label: "Needs Review", color: "text-amber-500", icon: AlertTriangle },
};

export default function PlatformOrphanFiles() {
  const { t } = useTranslation(['app', 'common']);
  const [selectedStatus, setSelectedStatus] = useState<FileStatus | 'all'>('all');

  const filteredFiles = selectedStatus === 'all' 
    ? orphanFiles 
    : orphanFiles.filter(f => f.status === selectedStatus);

  const statusCounts = orphanFiles.reduce((acc, file) => {
    acc[file.status] = (acc[file.status] || 0) + 1;
    return acc;
  }, {} as Record<FileStatus, number>);

  const recommendationCounts = orphanFiles.reduce((acc, file) => {
    acc[file.recommendation] = (acc[file.recommendation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deletableFiles = orphanFiles.filter(f => f.recommendation === 'delete');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileX2 className="h-6 w-6 text-red-500" />
            Orphan Files
          </h1>
          <p className="text-muted-foreground mt-1">
            Page component files that exist but are not used in any route or are deprecated
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/orphan-pages">
              <ArrowRight className="h-4 w-4 mr-2" />
              View Orphan Pages
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedStatus('all')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{orphanFiles.length}</p>
                <p className="text-sm text-muted-foreground">Total Files</p>
              </div>
              <FileCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-red-500 transition-colors" onClick={() => setSelectedStatus('deprecated')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{statusCounts.deprecated || 0}</p>
                <p className="text-sm text-muted-foreground">Deprecated</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-orange-500 transition-colors" onClick={() => setSelectedStatus('legacy')}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{statusCounts.legacy || 0}</p>
                <p className="text-sm text-muted-foreground">Legacy</p>
              </div>
              <FileCode className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{deletableFiles.length}</p>
                <p className="text-sm text-muted-foreground">Safe to Delete</p>
              </div>
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <Badge 
          variant={selectedStatus === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedStatus('all')}
        >
          All ({orphanFiles.length})
        </Badge>
        {Object.entries(statusConfig).map(([status, config]) => (
          <Badge 
            key={status}
            variant={selectedStatus === status ? 'default' : 'outline'}
            className={`cursor-pointer ${selectedStatus === status ? '' : config.bgColor}`}
            onClick={() => setSelectedStatus(status as FileStatus)}
          >
            {config.label} ({statusCounts[status as FileStatus] || 0})
          </Badge>
        ))}
      </div>

      {/* Files to Delete Section */}
      {deletableFiles.length > 0 && selectedStatus === 'all' && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Files Safe to Delete ({deletableFiles.length})
            </CardTitle>
            <CardDescription>
              These files are no longer used and can be safely removed from the codebase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deletableFiles.map((file) => (
                <div key={file.path} className="flex items-center justify-between p-3 rounded-lg bg-background border">
                  <div className="flex items-center gap-3">
                    <code className="text-sm text-red-600">{file.path}</code>
                    {file.replacedBy && (
                      <span className="text-xs text-muted-foreground">
                        → Replaced by: {file.replacedBy}
                      </span>
                    )}
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>File Details</CardTitle>
          <CardDescription>
            Detailed information about each orphan file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFiles.map((file) => {
              const statusInfo = statusConfig[file.status];
              const recInfo = recommendationConfig[file.recommendation];
              const StatusIcon = statusInfo.icon;
              const RecIcon = recInfo.icon;

              return (
                <div 
                  key={file.path} 
                  className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                        <h3 className="font-semibold">{file.name}</h3>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <code className="text-xs text-muted-foreground block mb-2">{file.path}</code>
                      <p className="text-sm text-muted-foreground">{file.description}</p>
                      
                      {file.replacedBy && (
                        <div className="mt-2 flex items-center gap-1 text-sm">
                          <ArrowRight className="h-3 w-3 text-green-500" />
                          <span className="text-muted-foreground">Replaced by:</span>
                          <span className="text-green-600 font-medium">{file.replacedBy}</span>
                        </div>
                      )}
                      
                      {file.usedBy && (
                        <div className="mt-2 flex items-center gap-1 text-sm">
                          <CheckCircle2 className="h-3 w-3 text-blue-500" />
                          <span className="text-muted-foreground">Used by:</span>
                          <span className="text-blue-600 font-medium">{file.usedBy}</span>
                        </div>
                      )}
                      
                      {file.notes && (
                        <p className="mt-2 text-xs text-muted-foreground italic">
                          Note: {file.notes}
                        </p>
                      )}
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={`shrink-0 ${recInfo.color} bg-transparent border`}>
                            <RecIcon className="h-3 w-3 mr-1" />
                            {recInfo.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Recommendation: {recInfo.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Status Types</h4>
              <div className="space-y-2">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={status} className="flex items-center gap-2 text-sm">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium">{config.label}:</span>
                      <span className="text-muted-foreground">
                        {status === 'orphan' && 'File exists but not imported anywhere'}
                        {status === 'deprecated' && 'Marked for removal, functionality moved elsewhere'}
                        {status === 'legacy' && 'Old version replaced by newer implementation'}
                        {status === 'wrapper' && 'Intentional wrapper/re-export pattern'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Recommendations</h4>
              <div className="space-y-2">
                {Object.entries(recommendationConfig).map(([rec, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={rec} className="flex items-center gap-2 text-sm">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className="font-medium">{config.label}:</span>
                      <span className="text-muted-foreground">
                        {rec === 'delete' && 'Can be safely removed from codebase'}
                        {rec === 'keep' && 'Intentional pattern, should be kept'}
                        {rec === 'refactor' && 'Should be refactored or consolidated'}
                        {rec === 'review' && 'Needs manual review before decision'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
