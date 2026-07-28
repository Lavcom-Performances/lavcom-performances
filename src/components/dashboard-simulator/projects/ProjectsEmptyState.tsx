import { FolderKanban, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROJECTS_STRINGS } from "@/constants/dashboard-simulator/projects.strings";

export function ProjectsEmptyState({ filtered }: { filtered: boolean }) {
  const Icon = filtered ? SearchX : FolderKanban;

  return (
    <Card className="shadow-form">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">
          {filtered ? PROJECTS_STRINGS.noResultsTitle : PROJECTS_STRINGS.emptyTitle}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {filtered ? PROJECTS_STRINGS.noResultsDescription : PROJECTS_STRINGS.emptyDescription}
        </p>
        {!filtered && (
          <Button asChild className="mt-2">
            <Link to="/simulator/project">{PROJECTS_STRINGS.emptyCta}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
