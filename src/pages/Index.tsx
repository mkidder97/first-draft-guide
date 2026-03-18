import { useState, useEffect, useMemo } from "react";
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
import { Users, FileText, Send, CheckCircle, Search, Plus, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
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

type Agreement = {
  id: string;
  client_id: string;
  service_types: string[];
  status: string;
  created_at: string;
  signed_at: string | null;
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

type ClientGroup = Omit<Client, "agreements"> & { agreements: Agreement[] };

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
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
  const draftCount = allAgreements.filter((a) => a.status === "draft").length;
  const sentCount = allAgreements.filter((a) => a.status === "sent").length;
  const signedCount = allAgreements.filter((a) => a.status === "signed").length;

  // Filter clients by search and build groups
  const filteredGroups: ClientGroup[] = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase();
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
      .map((c) => ({ ...c }));
  }, [clients, search]);

  // Expand all matching groups when search changes
  useEffect(() => {
    setExpandedClients(new Set(filteredGroups.map((g) => g.id)));
  }, [filteredGroups]);

  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const stats = [
    { label: "Total Clients", value: totalClients, icon: Users },
    { label: "Draft Agreements", value: draftCount, icon: FileText },
    { label: "Sent Agreements", value: sentCount, icon: Send },
    { label: "Signed Agreements", value: signedCount, icon: CheckCircle },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by client name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table / Empty State */}
      {isLoading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
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
                  <TableHead className="w-8" />
                  <TableHead>Client / Service</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Markets</TableHead>
                  <TableHead>Buildings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Update Status</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              {filteredGroups.length === 0 ? (
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No agreements match your search.
                    </TableCell>
                  </TableRow>
                </TableBody>
              ) : (
                filteredGroups.map((group) => {
                  const isOpen = expandedClients.has(group.id);
                  return (
                    <TableBody key={group.id}>
                      {/* Client header row */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50 bg-muted/20"
                        onClick={() => toggleClient(group.id)}
                      >
                        <TableCell className="w-8 px-2">
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{group.name}</TableCell>
                        <TableCell className="text-muted-foreground">{group.address}</TableCell>
                        <TableCell className="text-muted-foreground">{group.markets || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{group.building_count ?? "—"}</TableCell>
                        <TableCell>
                          {group.agreements.length === 0 ? (
                            <Link to="/new-client">
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                No agreements
                              </Badge>
                            </Link>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {group.agreements.length} agreement{group.agreements.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </TableRow>
                      {/* Agreement rows */}
                      {isOpen &&
                        group.agreements
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((a) => (
                            <TableRow key={a.id} className="bg-background">
                              <TableCell />
                              <TableCell className="pl-8">
                                <Link to={`/agreements/${a.id}`} className="text-primary hover:underline">
                                  <Badge variant="secondary" className="text-xs">
                                    {(a.service_types || []).map(st => SERVICE_LABELS[st as keyof typeof SERVICE_LABELS] || st).join(", ")}
                                  </Badge>
                                </Link>
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell>
                                <Badge className={statusColor(a.status)}>
                                  {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                              <TableCell>
                                <Select
                                  value={a.status}
                                  onValueChange={(val) => updateStatus.mutate({ agreementId: a.id, status: val })}
                                >
                                  <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="sent">Sent</SelectItem>
                                    
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  );
                })
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
