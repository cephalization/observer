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
  <div className="grid gap-3 border-b px-6 py-4 md:grid-cols-[1.2fr_0.9fr_0.8fr_0.8fr_0.8fr]">
    <Input
      placeholder="Search by span name or trace id"
      value={filters.search}
      onChange={(event) => onChange({ ...filters, search: event.target.value })}
    />
    <Select
      value={filters.projectName}
      onValueChange={(value) => onChange({ ...filters, projectName: value })}
    >
      <SelectTrigger>
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
      <SelectTrigger>
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
      <SelectTrigger>
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="start_time">Start time</SelectItem>
        <SelectItem value="latency_ms">Latency</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filters.order} onValueChange={(value) => onChange({ ...filters, order: value as TraceFilters["order"] })}>
      <SelectTrigger>
        <SelectValue placeholder="Order" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="desc">Descending</SelectItem>
        <SelectItem value="asc">Ascending</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
