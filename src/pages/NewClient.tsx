import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImageIcon } from "lucide-react";

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
  serviceTypes: string[];
  markets: string;
  scopeNotes: string;
}

const emptyFields: ClientFields = {
  clientName: "",
  address: "",
  serviceTypes: [],
  markets: "",
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
  const [inputMode, setInputMode] = useState<"text" | "screenshot">("text");
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);

  // Auto-detect market from address
  useEffect(() => {
    if (!fields.address) return;
    const cityMatch = fields.address.match(/,\s*([A-Za-z\s]+),?\s*[A-Z]{2}\s*\d{5}?/);
    if (cityMatch && cityMatch[1]) {
      const detectedCity = cityMatch[1].trim();
      if (detectedCity && !fields.markets) {
        updateField("markets", detectedCity);
      }
    }
  }, [fields.address]);

  const updateField = (key: keyof ClientFields, value: string | string[]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const toggleServiceType = (value: string) => {
    setFields((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(value)
        ? prev.serviceTypes.filter((s) => s !== value)
        : [...prev.serviceTypes, value],
    }));
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
        serviceTypes: Array.isArray(data.serviceTypes) ? data.serviceTypes : [],
        markets: data.markets || "",
        scopeNotes: data.scopeNotes || "",
      });
    } catch (err: any) {
      console.error("Parse error:", err);
      setParseError(err?.message || "Failed to parse input. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const preview = dataUrl;
      setSelectedImage({ base64, mimeType: file.type, preview });
    };
    reader.readAsDataURL(file);
  };

  const handleParseScreenshot = async () => {
    if (!selectedImage) return;
    setIsParsing(true);
    setParseError("");
    try {
      const { data, error } = await supabase.functions.invoke("parse-client-input", {
        body: { imageBase64: selectedImage.base64, mimeType: selectedImage.mimeType },
      });
      if (error) throw error;
      setFields({
        clientName: data.clientName || "",
        address: data.address || "",
        serviceTypes: Array.isArray(data.serviceTypes) ? data.serviceTypes : [],
        markets: data.markets || "",
        scopeNotes: data.scopeNotes || "",
      });
    } catch (err: any) {
      setParseError(err?.message || "Failed to parse screenshot. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!fields.clientName || !fields.address || fields.serviceTypes.length === 0) {
      setSubmitError("Client Name, Address, and at least one Service Type are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: fields.clientName,
          address: fields.address,
          markets: fields.markets || null,
        })
        .select("id")
        .single();

      if (clientError) throw clientError;

      const { data: insertedAgreements, error: agreementError } = await supabase
        .from("agreements")
        .insert({
          client_id: client.id,
          service_types: fields.serviceTypes,
          scope_notes: fields.scopeNotes || null,
          status: "draft",
        } as any)
        .select("id");

      if (agreementError) throw agreementError;

      toast({
        title: "Client created",
        description: `${fields.clientName} added with 1 draft agreement.`,
      });

      if (insertedAgreements && insertedAgreements.length === 1) {
        navigate(`/agreements/${insertedAgreements[0].id}`);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setSubmitError(err?.message || "Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Client</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            {inputMode === "text" ? "Describe the client" : "Upload a screenshot"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "screenshot")}>
            <TabsList>
              <TabsTrigger value="text" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Text
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                Screenshot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="e.g. New client Acme Corp at 123 Main St, Miami FL 33101. They have 12 buildings across Miami and Dallas markets. They need annual PM and due diligence services, 2-year contract."
                className="min-h-[140px]"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
              />
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
            </TabsContent>

            <TabsContent value="screenshot" className="space-y-4">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelect}
              />
              {selectedImage && (
                <img
                  src={selectedImage.preview}
                  alt="Screenshot preview"
                  className="max-h-48 rounded-md border border-border object-contain"
                />
              )}
              <Button
                onClick={handleParseScreenshot}
                disabled={isParsing || !selectedImage}
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    Parse Screenshot
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {parseError && (
            <p className="text-sm text-destructive">{parseError}</p>
          )}
        </CardContent>
      </Card>

      {/* Shared review + submit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review &amp; Save</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldsForm fields={fields} updateField={updateField} toggleServiceType={toggleServiceType} />
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
  toggleServiceType,
}: {
  fields: ClientFields;
  updateField: (key: keyof ClientFields, value: string | string[]) => void;
  toggleServiceType: (value: string) => void;
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
        <Label>Building Count</Label>
        <Input
          type="number"
          min="0"
          value={fields.buildingCount}
          onChange={(e) => updateField("buildingCount", e.target.value)}
          placeholder="e.g. 12"
        />
      </div>
      <div className="space-y-2">
        <Label>Markets</Label>
        <Input
          value={fields.markets}
          onChange={(e) => updateField("markets", e.target.value)}
          placeholder="e.g. Miami, Dallas, Atlanta"
        />
      </div>
      <div className="space-y-3 sm:col-span-2">
        <Label>Service Types *</Label>
        <div className="flex flex-wrap gap-4">
          {SERVICE_TYPES.map((st) => (
            <label key={st.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={fields.serviceTypes.includes(st.value)}
                onCheckedChange={() => toggleServiceType(st.value)}
              />
              <span className="text-sm">{st.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          value={fields.duration}
          onChange={(e) => updateField("duration", e.target.value)}
          placeholder="e.g. 2 years"
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
