import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ImageIcon, Search } from "lucide-react";

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
  contactId: string | null;
  contactName: string;
  contactEmail: string;
}

const emptyFields: ClientFields = {
  clientName: "",
  address: "",
  serviceTypes: [],
  markets: "",
  scopeNotes: "",
  contactId: null,
  contactName: "",
  contactEmail: "",
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
  const [contactMode, setContactMode] = useState<"select" | "create">("select");
  const [contactSearch, setContactSearch] = useState("");
  const [satelliteImageUrl, setSatelliteImageUrl] = useState<string | null>(null);
  const [satelliteError, setSatelliteError] = useState(false);

  const { data: contactResults } = useQuery({
    queryKey: ["contacts-search", contactSearch],
    queryFn: async () => {
      if (!contactSearch.trim()) return [];
      const { data } = await supabase
        .from("contacts")
        .select("id, name, email, company")
        .or(`name.ilike.%${contactSearch}%,company.ilike.%${contactSearch}%`)
        .limit(8);
      return data || [];
    },
    enabled: contactSearch.length > 1,
  });

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

  // Auto-load satellite image from address
  useEffect(() => {
    setSatelliteError(false);
    if (!fields.address || fields.address.length < 10) {
      setSatelliteImageUrl(null);
      return;
    }
    const apiKey = "AIzaSyA5l3MGWK6jkedxdktSgH_AdmW4FnNFYm0";
    if (!apiKey) return;
    const encoded = encodeURIComponent(fields.address);
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=18&size=600x300&maptype=satellite&key=${apiKey}`;
    setSatelliteImageUrl(url);
  }, [fields.address]);

  const updateField = (key: keyof ClientFields, value: string | string[] | null) => {
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
        contactId: null,
        contactName: "",
        contactEmail: "",
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
        contactId: null,
        contactName: "",
        contactEmail: "",
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
      // Resolve contact
      let resolvedContactId = fields.contactId;

      if (contactMode === "create" && fields.contactName && fields.contactEmail) {
        const { data: newContact, error: contactError } = await supabase
          .from("contacts")
          .insert({
            name: fields.contactName,
            email: fields.contactEmail,
          })
          .select("id")
          .single();
        if (contactError) throw contactError;
        resolvedContactId = newContact.id;
      }

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: fields.clientName,
          address: fields.address,
          markets: fields.markets || null,
          contact_id: resolvedContactId || null,
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
                placeholder="e.g. New client Acme Corp at 123 Main St Houston TX 77001. Annual PM services for their Dallas and Houston properties."
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
          <FieldsForm
            fields={fields}
            updateField={updateField}
            toggleServiceType={toggleServiceType}
            contactMode={contactMode}
            setContactMode={setContactMode}
            contactSearch={contactSearch}
            setContactSearch={setContactSearch}
            contactResults={contactResults || []}
            satelliteImageUrl={satelliteImageUrl}
            onSatelliteError={() => setSatelliteError(true)}
            satelliteError={satelliteError}
          />
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

interface ContactResult {
  id: string;
  name: string;
  email: string;
  company: string | null;
}

function FieldsForm({
  fields,
  updateField,
  toggleServiceType,
  contactMode,
  setContactMode,
  contactSearch,
  setContactSearch,
  contactResults,
  satelliteImageUrl,
  onSatelliteError,
  satelliteError,
}: {
  fields: ClientFields;
  updateField: (key: keyof ClientFields, value: string | string[] | null) => void;
  toggleServiceType: (value: string) => void;
  contactMode: "select" | "create";
  setContactMode: (mode: "select" | "create") => void;
  contactSearch: string;
  setContactSearch: (s: string) => void;
  contactResults: ContactResult[];
  satelliteImageUrl: string | null;
  onSatelliteError: () => void;
  satelliteError: boolean;
}) {
  const [showResults, setShowResults] = useState(false);

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

      {satelliteImageUrl && !satelliteError && (
        <div className="sm:col-span-2 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>🛰</span> Aerial view
          </p>
          <img
            src={satelliteImageUrl}
            alt="Aerial satellite view of property"
            className="w-full rounded-md border border-border object-cover h-52"
            onError={onSatelliteError}
          />
        </div>
      )}

      {/* Contact Person */}
      <div className="space-y-2 sm:col-span-2">
        <Label>Contact Person</Label>
        {contactMode === "select" ? (
          <div className="space-y-2">
            {fields.contactId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">
                  {fields.contactName} ({fields.contactEmail})
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => {
                    updateField("contactId", null);
                    updateField("contactName", "");
                    updateField("contactEmail", "");
                    setContactSearch("");
                  }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => {
                    setContactSearch(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  placeholder="Search by name or company…"
                  className="pl-8"
                />
                {showResults && contactResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                    {contactResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          updateField("contactId", c.id);
                          updateField("contactName", c.name);
                          updateField("contactEmail", c.email);
                          setContactSearch("");
                          setShowResults(false);
                        }}
                      >
                        {c.name}{c.company ? ` — ${c.company}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setContactMode("create")}
            >
              Create new instead
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={fields.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                placeholder="Contact Name"
              />
              <Input
                value={fields.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                placeholder="Contact Email"
                type="email"
              />
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                setContactMode("select");
                updateField("contactName", "");
                updateField("contactEmail", "");
              }}
            >
              Select existing instead
            </button>
          </div>
        )}
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
