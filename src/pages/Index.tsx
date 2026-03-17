import { useState } from "react";
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
import { Users, FileText, Send, CheckCircle, Search, Plus } from "lucide-react";
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
  service_type: string;
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

type FlatRow = Agreement & { client: Omit<Client, "agreements"> };

export default function Dashboard() {
  const [search, setSearch] = useState("");
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

  // Derive stats
  const allAgreements = clients?.flatMap((c) => c.agreements) ?? [];
  const totalClients = clients?.length ?? 0;
  const draftCount = allAgreements.filter((a) => a.status === "draft").length;
  const sentCount = allAgreements.filter((a) => a.status === "sent").length;
  const signedCount = allAgreements.filter((a) => a.status === "signed").length;

  // Flatten to one row per agreement
  const flatRows: FlatRow[] = clients?.flatMap((c) => {
    const { agreements, ...clientData } = c;
    return agreements.map((a) => ({ ...a, client: clientData }));
  }) ?? [];

  // Filter by client name or address
  const filtered = flatRows.filter((row) => {
    const q = search.toLowerCase();
    return row.client.name.toLowerCase().includes(q) || row.client.address.toLowerCase().includes(q);
  });

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
        <p className="text-muted-foreground">Loading…</p>
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
                  <TableHead>Property Address</TableHead>
                  <TableHead>Markets</TableHead>
                  <TableHead>Buildings</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Update Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link to={`/agreements/${row.id}`} className="text-primary hover:underline">
                        {row.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{row.client.address}</TableCell>
                    <TableCell>{row.client.markets || "—"}</TableCell>
                    <TableCell>{row.client.building_count ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {SERVICE_LABELS[row.service_type] || row.service_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor(row.status)}>
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(row.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Select
                        value={row.status}
                        onValueChange={(val) => updateStatus.mutate({ agreementId: row.id, status: val })}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="signed">Signed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No agreements match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
