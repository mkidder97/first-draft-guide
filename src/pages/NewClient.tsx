import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";

const SERVICE_TYPES = [
  { value: "annual_pm", label: "Annual PM" },
  { value: "due_diligence", label: "Due Diligence" },
  { value: "survey", label: "Survey" },
  { value: "storm", label: "Storm Related" },
  { value: "construction_management", label: "Construction Management" },
];

interface ClientFields {
  clientName: string;
  address: string;
  serviceType: string;
  duration: string;
  frequency: string;
  scopeNotes: string;
}

const emptyFields: ClientFields = {
  clientName: "",
  address: "",
  serviceType: "",
  duration: "",
  frequency: "",
  scopeNotes: "",
};

export default function NewClient() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<ClientFields>(emptyFields);
  const [aiMessage, setAiMessage] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const updateField = (key: keyof ClientFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleParse = async () => {
    if (!aiMessage.trim()) return;
    setIsParsing(true);
    setParseError("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "parse-client-input",
        { body: { message: aiMessage } }
      );

      if (error) throw error;

      setFields({
        clientName: data.clientName || "",
        address: data.address || "",
        serviceType: data.serviceType || "",
        duration: data.duration || "",
        frequency: data.frequency || "",
        scopeNotes: data.scopeNotes || "",
      });
    } catch (err: any) {
      console.error("Parse error:", err);
      setParseError(err?.message || "Failed to parse input. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!fields.clientName || !fields.address || !fields.serviceType) {
      setSubmitError("Client Name, Address, and Service Type are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({ name: fields.clientName, address: fields.address })
        .select("id")
        .single();

      if (clientError) throw clientError;

      const { error: agreementError } = await supabase
        .from("agreements")
        .insert({
          client_id: client.id,
          service_type: fields.serviceType,
          duration: fields.duration || null,
          frequency: fields.frequency || null,
          scope_notes: fields.scopeNotes || null,
          status: "draft",
        });

      if (agreementError) throw agreementError;

      toast({
        title: "Client created",
        description: `${fields.clientName} has been added with a draft agreement.`,
      });

      navigate("/agreements");
    } catch (err: any) {
      console.error("Submit error:", err);
      setSubmitError(err?.message || "Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasReviewData =
    fields.clientName || fields.address || fields.serviceType;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Client</h1>

      <Tabs defaultValue="ai" className="mb-6">
        <TabsList className="w-full">
          <TabsTrigger value="ai" className="flex-1 gap-2">
            <Sparkles className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1">
            Manual Form
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Describe the client and agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="e.g. New client Acme Corp at 123 Main St, Miami FL 33101. They need annual PM service, quarterly visits, 2-year contract. Focus on roof and exterior inspections."
                className="min-h-[140px]"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
              />
              {parseError && (
                <p className="text-sm text-destructive">{parseError}</p>
              )}
              <Button
                onClick={handleParse}
                disabled={isParsing || !aiMessage.trim()}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Parse with AI
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Enter client details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldsForm fields={fields} updateField={updateField} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shared review + submit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review &amp; Save</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldsForm fields={fields} updateField={updateField} />
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Client"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldsForm({
  fields,
  updateField,
}: {
  fields: ClientFields;
  updateField: (key: keyof ClientFields, value: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>Client Name *</Label>
        <Input
          value={fields.clientName}
          onChange={(e) => updateField("clientName", e.target.value)}
          placeholder="Acme Corp"
        />
      </div>
      <div className="space-y-2">
        <Label>Property Address *</Label>
        <Input
          value={fields.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="123 Main St, Miami FL 33101"
        />
      </div>
      <div className="space-y-2">
        <Label>Service Type *</Label>
        <Select
          value={fields.serviceType}
          onValueChange={(v) => updateField("serviceType", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((st) => (
              <SelectItem key={st.value} value={st.value}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          value={fields.duration}
          onChange={(e) => updateField("duration", e.target.value)}
          placeholder="e.g. 2 years"
        />
      </div>
      <div className="space-y-2">
        <Label>Frequency</Label>
        <Input
          value={fields.frequency}
          onChange={(e) => updateField("frequency", e.target.value)}
          placeholder="e.g. Quarterly"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Scope Notes</Label>
        <Textarea
          value={fields.scopeNotes}
          onChange={(e) => updateField("scopeNotes", e.target.value)}
          placeholder="Additional details about the scope of work…"
        />
      </div>
    </div>
  );
}
