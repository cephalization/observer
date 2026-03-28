import type { TraceFilters } from "../../../shared/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TraceFiltersBar = ({
  filters,
  phoenixProjectNames,
  onChange,
}: {
  filters: TraceFilters;
  phoenixProjectNames: string[];
  onChange: (filters: TraceFilters) => void;
}) => (
  <div className="flex flex-wrap gap-3 border-b border-white/8 px-6 py-4">
    <div className="min-w-[12rem] flex-1 basis-[16rem]">
      <Input
        placeholder="Search by span name or trace id"
        value={filters.search}
        onChange={(event) => onChange({ ...filters, search: event.target.value })}
      />
    </div>
    <Select
      value={filters.projectName}
      onValueChange={(value) => onChange({ ...filters, projectName: value })}
    >
      <SelectTrigger className="min-w-[14rem] flex-1 basis-[14rem]">
        <SelectValue placeholder="Phoenix project" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All Phoenix projects</SelectItem>
        {phoenixProjectNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <Select value={filters.status} onValueChange={(value) => onChange({ ...filters, status: value as TraceFilters["status"] })}>
      <SelectTrigger className="min-w-[11rem] flex-1 basis-[11rem]">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="ok">OK</SelectItem>
        <SelectItem value="error">Error</SelectItem>
        <SelectItem value="unset">Unset</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filters.sort} onValueChange={(value) => onChange({ ...filters, sort: value as TraceFilters["sort"] })}>
      <SelectTrigger className="min-w-[10rem] flex-1 basis-[10rem]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="start_time">Start time</SelectItem>
        <SelectItem value="latency_ms">Latency</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filters.order} onValueChange={(value) => onChange({ ...filters, order: value as TraceFilters["order"] })}>
      <SelectTrigger className="min-w-[10rem] flex-1 basis-[10rem]">
        <SelectValue placeholder="Order" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="desc">Descending</SelectItem>
        <SelectItem value="asc">Ascending</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filters.timeRange} onValueChange={(value) => onChange({ ...filters, timeRange: value as TraceFilters["timeRange"] })}>
      <SelectTrigger className="min-w-[10rem] flex-1 basis-[10rem]">
        <SelectValue placeholder="Time range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="15m">Last 15 min</SelectItem>
        <SelectItem value="1h">Last hour</SelectItem>
        <SelectItem value="24h">Last 24 hours</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="all">All time</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
