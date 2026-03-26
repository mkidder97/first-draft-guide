import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, UserPlus, X, ChevronDown, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface LinkedClient {
  id: string;
  name: string;
  address: string;
  agreements: { id: string; status: string }[];
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  title: string | null;
  notes: string | null;
  created_at: string;
  linked_clients: LinkedClient[];
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    title: "",
  });
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get linked clients with their agreements
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, address, contact_id, agreements(id, status)");

      const clientMap: Record<string, LinkedClient[]> = {};
      clients?.forEach((c: any) => {
        if (c.contact_id) {
          if (!clientMap[c.contact_id]) clientMap[c.contact_id] = [];
          clientMap[c.contact_id].push({
            id: c.id,
            name: c.name,
            address: c.address,
            agreements: c.agreements || [],
          });
        }
      });

      return (data as any[]).map((contact) => ({
        ...contact,
        linked_clients: clientMap[contact.id] || [],
      })) as Contact[];
    },
  });

  const insertContact = useMutation({
    mutationFn: async (contact: typeof formData) => {
      const { error } = await supabase.from("contacts").insert({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || null,
        company: contact.company || null,
        title: contact.title || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setFormData({ name: "", email: "", phone: "", company: "", title: "" });
      setShowForm(false);
      toast({ title: "Contact added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error adding contact", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    insertContact.mutate(formData);
  };

  const filtered = contacts?.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.company?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Contact"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input
                placeholder="Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                placeholder="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                placeholder="Company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
              <Input
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={insertContact.isPending} className="gap-2">
                <UserPlus className="h-4 w-4" />
                {insertContact.isPending ? "Saving…" : "Save Contact"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No contacts yet</p>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Contact
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Linked Properties</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || "—"}</TableCell>
                    <TableCell>{contact.company || "—"}</TableCell>
                    <TableCell>{contact.title || "—"}</TableCell>
                    <TableCell>
                      {contact.linked_clients.length === 0 ? (
                        <span className="text-muted-foreground text-xs">None</span>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs">
                              <Badge variant="secondary">{contact.linked_clients.length}</Badge>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-2" align="start">
                            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Linked Properties</p>
                            <div className="space-y-1">
                              {contact.linked_clients.map((client) => {
                                const agreement = client.agreements[0];
                                return (
                                  <div
                                    key={client.id}
                                    className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                                  >
                                    <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium truncate">{client.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{client.address}</p>
                                    </div>
                                    {agreement ? (
                                      <Link to={`/agreements/${agreement.id}`}>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] shrink-0 cursor-pointer hover:bg-primary/10"
                                        >
                                          {agreement.status}
                                        </Badge>
                                      </Link>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] shrink-0">
                                        no agreement
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(contact.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
