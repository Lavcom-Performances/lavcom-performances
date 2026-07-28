import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_STRINGS } from "@/constants/dashboard-simulator/common.strings";
import type { DashboardSortBy, DashboardStatusFilter } from "@/types/dashboard-simulator";

interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: DashboardStatusFilter;
  onStatusChange: (value: DashboardStatusFilter) => void;
  sortBy: DashboardSortBy;
  onSortByChange: (value: DashboardSortBy) => void;
  searchPlaceholder: string;
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  searchPlaceholder,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="bg-card pl-9 shadow-form"
        />
      </div>

      <Tabs value={status} onValueChange={(v) => onStatusChange(v as DashboardStatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">{COMMON_STRINGS.filters.all}</TabsTrigger>
          <TabsTrigger value="validated">{COMMON_STRINGS.filters.validated}</TabsTrigger>
          <TabsTrigger value="in_progress">{COMMON_STRINGS.filters.inProgress}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={sortBy} onValueChange={(v) => onSortByChange(v as DashboardSortBy)}>
        <SelectTrigger className="w-[190px] bg-card shadow-form">
          <SelectValue placeholder={COMMON_STRINGS.filters.sortBy} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">
            {COMMON_STRINGS.filters.sortBy} : {COMMON_STRINGS.filters.sortDate}
          </SelectItem>
          <SelectItem value="name">
            {COMMON_STRINGS.filters.sortBy} : {COMMON_STRINGS.filters.sortName}
          </SelectItem>
          <SelectItem value="status">
            {COMMON_STRINGS.filters.sortBy} : {COMMON_STRINGS.filters.sortStatus}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
