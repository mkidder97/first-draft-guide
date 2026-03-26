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
import { Badge } from "@/components/ui/badge";

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
  const [nearestAirport, setNearestAirport] = useState<string | null>(null);

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

  const AIRPORTS = [
    { code: "DFW", name: "Dallas/Fort Worth International", cities: ["dallas", "fort worth", "irving", "frisco", "plano", "arlington", "southlake", "grapevine", "colleyville", "euless", "bedford", "hurst", "keller", "flower mound", "lewisville", "carrollton", "farmers branch"] },
    { code: "DAL", name: "Dallas Love Field", cities: ["highland park", "university park", "addison", "richardson", "garland", "mesquite", "balch springs"] },
    { code: "IAH", name: "Houston George Bush Intercontinental", cities: ["houston", "humble", "the woodlands", "spring", "conroe", "kingwood", "tomball", "cypress", "katy", "sugar land", "stafford"] },
    { code: "HOU", name: "Houston William P. Hobby", cities: ["pearland", "pasadena", "friendswood", "league city", "webster", "clear lake", "missouri city"] },
    { code: "AUS", name: "Austin-Bergstrom International", cities: ["austin", "round rock", "cedar park", "pflugerville", "georgetown", "kyle", "buda", "lakeway", "bee cave"] },
    { code: "SAT", name: "San Antonio International", cities: ["san antonio", "new braunfels", "san marcos", "schertz", "converse", "universal city", "leon valley"] },
    { code: "ELP", name: "El Paso International", cities: ["el paso", "socorro", "anthony"] },
    { code: "LBB", name: "Lubbock Preston Smith International", cities: ["lubbock", "wolfforth", "slaton"] },
    { code: "AMA", name: "Rick Husband Amarillo International", cities: ["amarillo", "canyon"] },
    { code: "MAF", name: "Midland International Air & Space Port", cities: ["midland", "odessa"] },
    { code: "CRP", name: "Corpus Christi International", cities: ["corpus christi", "portland"] },
    { code: "HRL", name: "Valley International", cities: ["harlingen", "mcallen", "brownsville", "edinburg", "mission", "pharr"] },
    { code: "TYR", name: "Tyler Pounds Regional", cities: ["tyler", "longview", "nacogdoches"] },
    { code: "ACT", name: "Waco Regional", cities: ["waco", "temple", "killeen"] },
    { code: "ATL", name: "Hartsfield-Jackson Atlanta International", cities: ["atlanta", "buckhead", "marietta", "decatur", "sandy springs", "alpharetta", "roswell", "smyrna", "dunwoody", "peachtree city", "newnan"] },
    { code: "MCO", name: "Orlando International", cities: ["orlando", "kissimmee", "sanford", "oviedo", "lake mary", "altamonte springs", "winter park", "maitland"] },
    { code: "MIA", name: "Miami International", cities: ["miami", "coral gables", "hialeah", "miami beach", "doral", "kendall", "homestead", "florida city", "sweetwater"] },
    { code: "FLL", name: "Fort Lauderdale-Hollywood International", cities: ["fort lauderdale", "hollywood", "pembroke pines", "miramar", "davie", "weston", "plantation", "sunrise", "tamarac", "coral springs"] },
    { code: "TPA", name: "Tampa International", cities: ["tampa", "st. petersburg", "clearwater", "brandon", "lakeland", "sarasota", "bradenton"] },
    { code: "JAX", name: "Jacksonville International", cities: ["jacksonville", "orange park", "fleming island", "st. augustine"] },
    { code: "MSY", name: "Louis Armstrong New Orleans International", cities: ["new orleans", "metairie", "kenner", "gretna", "harvey", "marrero", "baton rouge", "slidell"] },
    { code: "BHM", name: "Birmingham-Shuttlesworth International", cities: ["birmingham", "hoover", "vestavia hills", "mountain brook", "tuscaloosa"] },
    { code: "MEM", name: "Memphis International", cities: ["memphis", "germantown", "collierville", "bartlett", "cordova"] },
    { code: "BNA", name: "Nashville International", cities: ["nashville", "brentwood", "franklin", "murfreesboro", "smyrna", "hendersonville", "gallatin", "mt. juliet"] },
    { code: "CLT", name: "Charlotte Douglas International", cities: ["charlotte", "concord", "gastonia", "kannapolis", "mooresville", "huntersville", "rock hill"] },
    { code: "RDU", name: "Raleigh-Durham International", cities: ["raleigh", "durham", "cary", "chapel hill", "apex", "morrisville", "wake forest"] },
    { code: "GSO", name: "Piedmont Triad International", cities: ["greensboro", "winston-salem", "high point"] },
    { code: "CHS", name: "Charleston International", cities: ["charleston", "north charleston", "mount pleasant", "summerville", "goose creek"] },
    { code: "SAV", name: "Savannah/Hilton Head International", cities: ["savannah", "pooler", "richmond hill", "hilton head"] },
    { code: "GSP", name: "Greenville-Spartanburg International", cities: ["greenville", "spartanburg", "anderson", "simpsonville", "greer"] },
    { code: "MKE", name: "Milwaukee Mitchell International", cities: ["milwaukee", "wauwatosa", "west allis", "greenfield", "brookfield", "waukesha", "racine", "kenosha"] },
    { code: "JFK", name: "John F. Kennedy International", cities: ["new york", "brooklyn", "queens", "long island city", "astoria", "flushing", "jamaica"] },
    { code: "LGA", name: "LaGuardia", cities: ["bronx", "manhattan", "new york city", "nyc"] },
    { code: "EWR", name: "Newark Liberty International", cities: ["newark", "jersey city", "hoboken", "elizabeth", "union", "irvington"] },
    { code: "BOS", name: "Boston Logan International", cities: ["boston", "cambridge", "somerville", "quincy", "braintree", "dedham", "waltham", "newton", "brookline"] },
    { code: "PHL", name: "Philadelphia International", cities: ["philadelphia", "camden", "cherry hill", "king of prussia", "wilmington", "bucks county"] },
    { code: "BWI", name: "Baltimore/Washington International", cities: ["baltimore", "columbia", "bowie", "laurel", "annapolis", "glen burnie"] },
    { code: "IAD", name: "Washington Dulles International", cities: ["dulles", "herndon", "reston", "ashburn", "sterling", "chantilly", "fairfax", "vienna", "tyson"] },
    { code: "DCA", name: "Ronald Reagan Washington National", cities: ["washington", "arlington", "alexandria", "crystal city", "dc", "pentagon city"] },
    { code: "PIT", name: "Pittsburgh International", cities: ["pittsburgh", "cranberry", "moon township"] },
    { code: "BUF", name: "Buffalo Niagara International", cities: ["buffalo", "niagara falls", "amherst", "cheektowaga", "williamsville"] },
    { code: "HPN", name: "Westchester County Airport", cities: ["white plains", "yonkers", "mount vernon", "new rochelle", "westchester"] },
    { code: "ORD", name: "Chicago O'Hare International", cities: ["chicago", "schaumburg", "arlington heights", "des plaines", "elk grove village", "itasca", "wood dale", "bensenville", "roselle", "bloomingdale"] },
    { code: "MDW", name: "Chicago Midway International", cities: ["berwyn", "cicero", "oak lawn", "evergreen park", "bridgeview", "burbank"] },
    { code: "DTW", name: "Detroit Metropolitan", cities: ["detroit", "dearborn", "livonia", "westland", "ann arbor", "ypsilanti", "taylor", "romulus", "wayne"] },
    { code: "MSP", name: "Minneapolis-St. Paul International", cities: ["minneapolis", "st. paul", "saint paul", "bloomington", "eden prairie", "plymouth", "maple grove", "brooklyn park", "minnetonka"] },
    { code: "STL", name: "St. Louis Lambert International", cities: ["st. louis", "saint louis", "chesterfield", "ballwin", "florissant", "hazelwood", "bridgeton", "st. charles"] },
    { code: "CMH", name: "John Glenn Columbus International", cities: ["columbus", "dublin", "westerville", "grove city", "gahanna", "reynoldsburg"] },
    { code: "CLE", name: "Cleveland Hopkins International", cities: ["cleveland", "lakewood", "parma", "strongsville", "westlake", "fairview park", "rocky river"] },
    { code: "IND", name: "Indianapolis International", cities: ["indianapolis", "carmel", "fishers", "noblesville", "greenwood", "plainfield"] },
    { code: "OKC", name: "Will Rogers World Airport", cities: ["oklahoma city", "edmond", "norman", "moore", "midwest city", "del city", "yukon"] },
    { code: "TUL", name: "Tulsa International", cities: ["tulsa", "broken arrow", "owasso", "bixby", "jenks", "sand springs"] },
    { code: "MCI", name: "Kansas City International", cities: ["kansas city", "overland park", "olathe", "lenexa", "shawnee", "leawood", "independence", "liberty"] },
    { code: "OMA", name: "Eppley Airfield", cities: ["omaha", "council bluffs", "bellevue", "papillion", "la vista"] },
    { code: "DSM", name: "Des Moines International", cities: ["des moines", "ankeny", "urbandale", "west des moines", "clive", "johnston"] },
    { code: "LIT", name: "Bill and Hillary Clinton National", cities: ["little rock", "north little rock", "conway", "sherwood", "jacksonville"] },
    { code: "LAX", name: "Los Angeles International", cities: ["los angeles", "santa monica", "culver city", "inglewood", "hawthorne", "el segundo", "manhattan beach", "redondo beach", "torrance", "long beach"] },
    { code: "SFO", name: "San Francisco International", cities: ["san francisco", "south san francisco", "daly city", "san mateo", "burlingame", "millbrae"] },
    { code: "SJC", name: "Norman Y. Mineta San Jose International", cities: ["san jose", "santa clara", "sunnyvale", "milpitas", "campbell"] },
    { code: "OAK", name: "Oakland International", cities: ["oakland", "alameda", "berkeley", "emeryville", "san leandro", "fremont", "hayward"] },
    { code: "SEA", name: "Seattle-Tacoma International", cities: ["seattle", "tacoma", "bellevue", "redmond", "kirkland", "renton", "kent", "federal way", "auburn", "tukwila"] },
    { code: "PDX", name: "Portland International", cities: ["portland", "gresham", "beaverton", "hillsboro", "lake oswego", "tigard", "vancouver"] },
    { code: "PHX", name: "Phoenix Sky Harbor International", cities: ["phoenix", "scottsdale", "tempe", "chandler", "gilbert", "mesa", "glendale", "peoria", "surprise"] },
    { code: "LAS", name: "Harry Reid International (Las Vegas)", cities: ["las vegas", "henderson", "north las vegas", "summerlin", "boulder city"] },
    { code: "DEN", name: "Denver International", cities: ["denver", "aurora", "lakewood", "thornton", "arvada", "westminster", "centennial", "highlands ranch", "littleton", "englewood", "parker"] },
    { code: "SLC", name: "Salt Lake City International", cities: ["salt lake city", "west valley city", "west jordan", "sandy", "orem", "provo", "ogden", "murray"] },
    { code: "ABQ", name: "Albuquerque International Sunport", cities: ["albuquerque", "rio rancho", "santa fe"] },
    { code: "TUS", name: "Tucson International", cities: ["tucson", "marana", "sahuarita", "green valley", "oro valley"] },
    { code: "BUR", name: "Hollywood Burbank Airport", cities: ["burbank", "glendale", "pasadena", "san fernando", "north hollywood", "studio city"] },
    { code: "SNA", name: "John Wayne Airport", cities: ["santa ana", "anaheim", "irvine", "costa mesa", "newport beach", "huntington beach", "garden grove", "orange", "tustin"] },
    { code: "SAN", name: "San Diego International", cities: ["san diego", "chula vista", "el cajon", "santee", "la mesa", "national city", "coronado"] },
    { code: "SMF", name: "Sacramento International", cities: ["sacramento", "roseville", "elk grove", "folsom", "rancho cordova", "davis", "woodland", "stockton"] },
    { code: "BZN", name: "Bozeman Yellowstone International", cities: ["bozeman", "billings"] },
    { code: "BOI", name: "Boise Airport", cities: ["boise", "nampa", "meridian", "caldwell", "eagle", "kuna"] },
    { code: "HNL", name: "Daniel K. Inouye International (Honolulu)", cities: ["honolulu", "pearl city", "ewa beach", "kapolei", "aiea", "kailua"] },
    { code: "ANC", name: "Ted Stevens Anchorage International", cities: ["anchorage", "eagle river", "wasilla", "palmer"] },
  ];

  useEffect(() => {
    if (!fields.address) {
      setNearestAirport(null);
      return;
    }
    const lower = fields.address.toLowerCase();
    const match = AIRPORTS.find((a) => a.cities.some((city) => lower.includes(city)));
    setNearestAirport(match ? `${match.code} — ${match.name}` : null);
  }, [fields.address]);

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
            nearestAirport={nearestAirport}
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
  nearestAirport,
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
  nearestAirport: string | null;
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
