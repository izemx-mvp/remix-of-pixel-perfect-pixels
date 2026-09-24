import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ---------------- Status badge ---------------- */

const TONES: Record<string, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-primary/10 text-primary border-primary/25",
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  Disponible: "success",
  Actif: "success",
  Payée: "success",
  Résolu: "success",
  "Réception confirmée": "success",
  Livrée: "success",
  "Stock faible": "warning",
  "En retard": "danger",
  Rupture: "danger",
  Critique: "danger",
  Haute: "warning",
  Normale: "info",
  Basse: "neutral",
  Surstock: "info",
  Brouillon: "neutral",
  Envoyée: "info",
  Nouveau: "accent",
  Diagnostic: "info",
  "En analyse": "info",
  "Pièce requise": "warning",
  "En traitement": "warning",
  "Demande envoyée": "accent",
  Validée: "info",
  Préparation: "warning",
  Expédiée: "info",
  Refusée: "danger",
  Commandé: "neutral",
  "En préparation": "neutral",
  Expédié: "info",
  "En transit": "info",
  Arrivé: "warning",
  Réceptionné: "warning",
  Assemblage: "warning",
  Contrôle: "warning",
  Inactif: "neutral",
  Suspendu: "danger",
  "En attente": "warning",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/* ---------------- Page header ---------------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------------- KPI card ---------------- */

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  onClick?: () => void;
}) {
  const ring: Record<string, string> = {
    neutral: "text-foreground bg-secondary",
    accent: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-destructive bg-destructive/10",
  };
  return (
    <Card
      onClick={onClick}
      className={cn(
        "gap-0 py-4 shadow-none transition-all hover:-translate-y-0.5 hover:shadow-md",
        onClick && "cursor-pointer",
      )}
    >
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", ring[tone])}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Section card ---------------- */

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/* ---------------- Data table ---------------- */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchText,
  onRowClick,
  filters,
  pageSize = 10,
  exportName = "export",
  emptyLabel = "Aucun résultat",
}: {
  rows: T[];
  columns: Column<T>[];
  searchText?: (row: T) => string;
  onRowClick?: (row: T) => void;
  filters?: ReactNode;
  pageSize?: number;
  exportName?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    if (query && searchText) {
      const q = query.toLowerCase();
      out = out.filter((r) => searchText(r).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
        });
      }
    }
    return out;
  }, [rows, query, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {searchText && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher…"
                className="pl-9"
              />
            </div>
          )}
          {filters}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => toast.success(`Export ${exportName}.csv généré (simulation)`)}
        >
          <Download className="h-4 w-4" /> Exporter
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className={cn("whitespace-nowrap", c.className)}>
                  {c.sortValue ? (
                    <button
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      onClick={() =>
                        setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))
                      }
                    >
                      {c.header} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    c.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn("py-3", c.className)}>
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} · page {current + 1}/{pages}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled={current === 0} onClick={() => setPage(current - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONES[tone])}>
      {children}
    </Badge>
  );
}

export function Timeline({ steps, currentIndex }: { steps: string[]; currentIndex: number }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "h-3 w-3 shrink-0 rounded-full border-2",
                i <= currentIndex ? "border-primary bg-primary" : "border-border bg-background",
              )}
            />
            {i < steps.length - 1 && (
              <span className={cn("w-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-border")} />
            )}
          </div>
          <span className={cn("pb-6 text-sm", i <= currentIndex ? "font-medium" : "text-muted-foreground")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
