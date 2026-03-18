import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Eye } from "lucide-react";
import { format } from "date-fns";

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

export default function Agreements() {
  const [clientFilter, setClientFilter] = useState("all");

  const { data: agreements, isLoading } = useQuery({
    queryKey: ["agreements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uniqueClients = useMemo(() => {
    if (!agreements) return [];
    const names = new Set(
      agreements.map((a) => (a.clients as { name: string } | null)?.name).filter(Boolean) as string[]
    );
    return Array.from(names).sort();
  }, [agreements]);

  const filtered = useMemo(() => {
    if (!agreements) return [];
    if (clientFilter === "all") return agreements;
    return agreements.filter((a) => (a.clients as { name: string } | null)?.name === clientFilter);
  }, [agreements, clientFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Agreements</h1>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Service Agreements</CardTitle>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Filter by Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {uniqueClients.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !filtered?.length ? (
            <p className="text-muted-foreground">
              {clientFilter === "all"
                ? "No agreements yet. Create a client to get started."
                : "No agreements for this client."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const clientName = (a.clients as { name: string } | null)?.name || "—";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      <TableCell>
                        {(a.service_types || []).map(st => SERVICE_LABELS[st] || st.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())).join(", ")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor(a.status)}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/agreements/${a.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
