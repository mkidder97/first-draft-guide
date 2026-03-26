import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users, CheckCircle, Search, Plus, Trash2,
  Building2, TrendingUp, AlertTriangle, Eye, Download,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";

const SERVICE_LABELS: Record<string, string> = {
  annual_pm: "Annual PM",
  due_diligence: "Due Diligence",
  survey: "Survey",
  storm: "Storm Assessment",
  construction_management: "Construction Mgmt",
};

function statusColor(status: string) {
  switch (status) {
    case "signed":
      return "bg-green-600 text-white border-green-600";
    case "sent":
      return "bg-blue-600 text-white border-blue-600";
    default:
      return "";
  }
}

const MARKET_COLORS = [
  "bg-primary", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-violet-500", "bg-cyan-500", "bg-orange-500",
];

type Agreement = {
  id: string;
  client_id: string;
  service_types: string[];
  status: string;
  created_at: string;
  signed_at: string | null;
  contract_end_date: string | null;
  [key: string]: unknown;
};

type Client = {
  id: string;
  name: string;
  address: string;
  markets: string | null;
  building_count: number | null;
  created_at: string;
  agreements: Agreement[];
};

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["dashboard-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, agreements(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ agreementId, status }: { agreementId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "signed") updates.signed_at = new Date().toISOString();
      const { error } = await supabase.from("agreements").update(updates).eq("id", agreementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-clients"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const deleteAgreement = useMutation({
    mutationFn: async (agreementId: string) => {
      const { error } = await supabase.from("agreements").delete().eq("id", agreementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-clients"] });
      toast({ title: "Agreement deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete agreement", variant: "destructive" });
    },
  });

  // Derive stats
  const allAgreements = clients?.flatMap((c) => c.agreements) ?? [];
  const totalClients = clients?.length ?? 0;
  const totalBuildings = clients?.reduce((sum, c) => sum + (c.building_count ?? 0), 0) ?? 0;
  const signedCount = allAgreements.filter((a) => a.status === "signed").length;
  const pipelineCount = allAgreements.filter((a) => a.status === "draft" || a.status === "sent").length;

  const now = new Date();

  const expiringAgreements = useMemo(() => {
    if (!clients) return [];
    return allAgreements
      .filter((a) => {
        if (a.status !== "signed" || !a.contract_end_date) return false;
        const daysLeft = differenceInDays(parseISO(a.contract_end_date), now);
        return daysLeft >= 0 && daysLeft <= 90;
      })
      .map((a) => {
        const client = clients.find((c) => c.id === a.client_id);
        return {
          ...a,
          clientName: client?.name ?? "Unknown",
          daysLeft: differenceInDays(parseISO(a.contract_end_date!), now),
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [clients, allAgreements]);

  // Market breakdown
  const marketBreakdown = useMemo(() => {
    if (!clients) return [];
    const map: Record<string, { clients: number; buildings: number }> = {};
    clients.forEach((c) => {
      const market = c.markets || "Unassigned";
      if (!map[market]) map[market] = { clients: 0, buildings: 0 };
      map[market].clients++;
      map[market].buildings += c.building_count ?? 0;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [clients]);

  const hasMarkets = marketBreakdown.some((m) => m.name !== "Unassigned");

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (serviceFilter === "all") return true;
      const a = c.agreements[0];
      return a?.service_types?.includes(serviceFilter) ?? false;
    });
  }, [clients, search, serviceFilter]);

  const stats = [
    { label: "Total Clients", value: totalClients, icon: Users },
    { label: "Buildings Managed", value: totalBuildings, icon: Building2 },
    { label: "Active Agreements", value: signedCount, icon: CheckCircle },
    { label: "Pipeline", value: pipelineCount, icon: TrendingUp },
    {
      label: "Expiring Soon",
      value: expiringAgreements.length,
      icon: AlertTriangle,
      amber: expiringAgreements.length > 0,
    },
  ];

  function exportToCSV() {
    if (!clients) return;
    const rows = [
      ["Client Name", "Address", "Markets", "Buildings", "Services", "Status", "Contract End", "Created"],
      ...clients.map((c) => {
        const a = c.agreements.sort(
          (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
        )[0];
        return [
          c.name,
          c.address,
          c.markets || "",
          c.building_count ?? "",
          (a?.service_types || []).map((st) => SERVICE_LABELS[st] || st).join(", "),
          a?.status || "",
          a?.contract_end_date ? format(parseISO(a.contract_end_date), "MMM d, yyyy") : "",
          format(new Date(c.created_at), "MMM d, yyyy"),
        ];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SRC_Clients_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Section 1 — KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${"amber" in s && s.amber ? "text-amber-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${"amber" in s && s.amber ? "text-amber-500" : ""}`}>
                {s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 2 — Market Breakdown */}
      {hasMarkets && (
        <div className="flex flex-wrap gap-3 mb-6">
          {marketBreakdown.map((m, i) => (
            <Card key={m.name} className="flex-1 min-w-[160px] max-w-[220px]">
              <CardContent className="p-4 flex items-start gap-3">
                <span className={`mt-1 h-3 w-3 rounded-full shrink-0 ${MARKET_COLORS[i % MARKET_COLORS.length]}`} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.clients} client{m.clients !== 1 ? "s" : ""} · {m.buildings} building{m.buildings !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Section 3 — Expiring Contracts Alert */}
      {expiringAgreements.length > 0 && (
        <Alert className="mb-6 border-amber-400 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="ml-2">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Contracts expiring within 90 days:
            </span>{" "}
            {expiringAgreements.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link
                  to={`/agreements/${a.id}`}
                  className="text-amber-700 dark:text-amber-400 underline hover:no-underline"
                >
                  {a.clientName} ({a.daysLeft}d)
                </Link>
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            <SelectItem value="annual_pm">Annual PM</SelectItem>
            <SelectItem value="due_diligence">Due Diligence</SelectItem>
            <SelectItem value="survey">Survey</SelectItem>
            <SelectItem value="storm">Storm Assessment</SelectItem>
            <SelectItem value="construction_management">Construction Mgmt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section 4 — Client Table */}
      {isLoading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : !clients?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground">No clients yet.</p>
            <Link to="/new-client">
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Add First Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Markets</TableHead>
                  <TableHead>Buildings</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contract End</TableHead>
                  <TableHead>Update Status</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No clients match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => {
                    const a = client.agreements.sort(
                      (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()
                    )[0];
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-semibold">
                          {a ? (
                            <Link to={`/agreements/${a.id}`} className="text-primary hover:underline">
                              {client.name}
                            </Link>
                          ) : (
                            client.name
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{client.address}</TableCell>
                        <TableCell className="text-muted-foreground">{client.markets || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{client.building_count ?? "—"}</TableCell>
                        <TableCell>
                          {a ? (
                            <span className="text-xs">
                              {(a.service_types || [])
                                .map((st) => SERVICE_LABELS[st] || st)
                                .join(", ")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No agreement</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {a ? (
                            <Badge className={statusColor(a.status)}>
                              {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {a?.contract_end_date
                            ? format(parseISO(a.contract_end_date), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {a && (
                            <Select
                              value={a.status}
                              onValueChange={(val) =>
                                updateStatus.mutate({ agreementId: a.id, status: val })
                              }
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {a && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete agreement?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this agreement. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteAgreement.mutate(a.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
