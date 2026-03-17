import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Agreements</h1>
      <Card>
        <CardHeader>
          <CardTitle>Service Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : !agreements?.length ? (
            <p className="text-muted-foreground">No agreements yet. Create a client to get started.</p>
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
                {agreements.map((a) => {
                  const clientName = (a.clients as { name: string } | null)?.name || "—";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      <TableCell>
                        {SERVICE_LABELS[a.service_type] ||
                          a.service_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
