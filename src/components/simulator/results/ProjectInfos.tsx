import { LucideIcon } from "lucide-react";

interface ProjectInfosProps {
  icon: LucideIcon;
  info: string;
}

export function ProjectInfos({ icon: Icon, info }: ProjectInfosProps) {
  return (
    <div className="flex justify-start items-center w-full gap-3">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-left w-max text-sm text-muted-foreground">
        {info || ""}
      </span>
    </div>
  );
}
