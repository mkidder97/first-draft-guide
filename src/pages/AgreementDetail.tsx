import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const SCOPE_PARAGRAPHS: Record<string, string> = {
  annual_pm:
    "Includes scheduled visual inspection of all accessible roofing surfaces, identification of deterioration or deficiencies, photographic documentation, and delivery of a written condition report with recommended maintenance actions.",
  due_diligence:
    "Includes a comprehensive assessment of the roofing system conducted on behalf of the client in connection with a property transaction. Report will document current condition, estimated remaining service life, and anticipated capital expenditure requirements.",
  survey:
    "Includes a baseline condition assessment of a roofing system being inspected by SRC for the first time. Report will establish a condition baseline, document existing deficiencies, and provide recommendations for ongoing maintenance or repair.",
  storm:
    "Includes assessment of roofing systems following a significant weather event. Report will document storm-related damage, differentiate pre-existing conditions where identifiable, and provide findings suitable for insurance claim support.",
  construction_management:
    "Includes oversight and management of the full reroof process on behalf of the client. Services include contractor coordination, materials verification, progress inspections, quality control documentation, and final completion review.",
};

const SERVICE_LABELS: Record<string, string> = {
  annual_pm: "Annual Preventive Maintenance",
  due_diligence: "Due Diligence",
  survey: "Survey",
  storm: "Storm Assessment",
  construction_management: "Construction Management",
};

function formatServiceType(type: string) {
  return SERVICE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusVariant(status: string) {
  switch (status) {
    case "signed":
      return "default";
    case "sent":
      return "secondary";
    default:
      return "outline";
  }
}

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

export default function AgreementDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: agreement, isLoading, error } = useQuery({
    queryKey: ["agreement", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreements")
        .select("*, clients(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  function generatePDF() {
    if (!agreement) return;
    const client = agreement.clients as { name: string; address: string } | null;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 72;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    function checkPage(needed: number) {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    }

    function addHeading(text: string) {
      checkPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(text, margin, y);
      y += 20;
    }

    function addBody(text: string) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text, contentWidth);
      checkPage(lines.length * 14 + 10);
      doc.text(lines, margin, y);
      y += lines.length * 14 + 10;
    }

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SOUTHERN ROOF CONSULTANTS", pageWidth / 2, y, { align: "center" });
    y += 22;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Professional Roofing Services Agreement", pageWidth / 2, y, { align: "center" });
    y += 30;

    // Client info block
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const infoLines = [
      ["CLIENT:", client?.name || "—"],
      ["PROPERTY ADDRESS:", client?.address || "—"],
      ["AGREEMENT DATE:", format(new Date(agreement.created_at), "MMMM d, yyyy")],
      ["DURATION:", agreement.duration || "—"],
      ["FREQUENCY:", agreement.frequency || "—"],
      ["SERVICE TYPE:", formatServiceType(agreement.service_type)],
    ];
    infoLines.forEach(([label, value]) => {
      checkPage(16);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 130, y);
      y += 16;
    });
    y += 14;

    // Scope
    addHeading("SCOPE OF SERVICES");
    addBody(SCOPE_PARAGRAPHS[agreement.service_type] || "Scope to be determined.");

    if (agreement.scope_notes) {
      addBody("Additional Notes: " + agreement.scope_notes);
    }

    // Standard terms
    addHeading("REPORTING");
    addBody(
      "A written report will be delivered within five (5) business days of the completed inspection. The report will include photographic documentation and a condition assessment of the inspected roofing systems."
    );

    addHeading("CLIENT RESPONSIBILITIES");
    addBody(
      "Client shall provide reasonable access to all areas to be inspected and shall notify SRC of any known hazards, restricted areas, or special access requirements prior to the scheduled inspection date."
    );

    addHeading("FEES AND PAYMENT");
    addBody(
      "Fees for services shall be as set forth in the accompanying proposal. Invoices are due within thirty (30) days of issuance. SRC reserves the right to suspend services on accounts more than sixty (60) days past due."
    );

    addHeading("LIMITATION OF LIABILITY");
    addBody(
      "SRC's liability under this agreement shall be limited to the total fees paid by the client for the applicable services. SRC shall not be liable for pre-existing conditions or latent defects not reasonably discoverable during a visual inspection."
    );

    addHeading("TERM AND TERMINATION");
    addBody(
      "Either party may terminate this agreement with thirty (30) days written notice. Upon termination, any outstanding fees for services already rendered shall remain due and payable."
    );

    addHeading("GOVERNING LAW");
    addBody("This agreement shall be governed by and construed in accordance with the laws of the State of Texas.");

    // Signatures
    y += 20;
    checkPage(100);
    addHeading("SIGNATURES");
    y += 10;

    const sigLine = (label: string, x: number) => {
      doc.setDrawColor(0);
      doc.line(x, y, x + 200, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(label, x, y + 14);
      doc.text("Date: _______________", x, y + 28);
    };

    sigLine("Southern Roof Consultants", margin);
    sigLine("Client", margin + 260);
    y += 50;

    const clientName = client?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "agreement";
    doc.save(`SRC_Agreement_${clientName}.pdf`);
  }

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading agreement…</div>;
  }

  if (error || !agreement) {
    return (
      <div className="p-8">
        <p className="text-destructive mb-4">Agreement not found.</p>
        <Link to="/agreements" className="text-primary underline">
          Back to Agreements
        </Link>
      </div>
    );
  }

  const client = agreement.clients as { name: string; address: string } | null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/agreements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Agreement Detail</h1>
          <Badge className={statusColor(agreement.status)}>
            {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
          </Badge>
        </div>
        <Button onClick={generatePDF} className="gap-2">
          <Download className="h-4 w-4" />
          Generate PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-8 space-y-6 text-sm leading-relaxed text-foreground">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-wide">SOUTHERN ROOF CONSULTANTS</h2>
            <p className="text-muted-foreground">Professional Roofing Services Agreement</p>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 border rounded-md p-4 bg-muted/30">
            <InfoRow label="CLIENT" value={client?.name || "—"} />
            <InfoRow label="PROPERTY ADDRESS" value={client?.address || "—"} />
            <InfoRow label="AGREEMENT DATE" value={format(new Date(agreement.created_at), "MMMM d, yyyy")} />
            <InfoRow label="DURATION" value={agreement.duration || "—"} />
            <InfoRow label="FREQUENCY" value={agreement.frequency || "—"} />
            <InfoRow label="SERVICE TYPE" value={formatServiceType(agreement.service_type)} />
          </div>

          {/* Scope */}
          <Section title="SCOPE OF SERVICES">
            <p>{SCOPE_PARAGRAPHS[agreement.service_type] || "Scope to be determined."}</p>
            {agreement.scope_notes && (
              <p className="mt-2 text-muted-foreground italic">Additional Notes: {agreement.scope_notes}</p>
            )}
          </Section>

          <Section title="REPORTING">
            <p>
              A written report will be delivered within five (5) business days of the completed inspection. The report
              will include photographic documentation and a condition assessment of the inspected roofing systems.
            </p>
          </Section>

          <Section title="CLIENT RESPONSIBILITIES">
            <p>
              Client shall provide reasonable access to all areas to be inspected and shall notify SRC of any known
              hazards, restricted areas, or special access requirements prior to the scheduled inspection date.
            </p>
          </Section>

          <Section title="FEES AND PAYMENT">
            <p>
              Fees for services shall be as set forth in the accompanying proposal. Invoices are due within thirty (30)
              days of issuance. SRC reserves the right to suspend services on accounts more than sixty (60) days past
              due.
            </p>
          </Section>

          <Section title="LIMITATION OF LIABILITY">
            <p>
              SRC's liability under this agreement shall be limited to the total fees paid by the client for the
              applicable services. SRC shall not be liable for pre-existing conditions or latent defects not reasonably
              discoverable during a visual inspection.
            </p>
          </Section>

          <Section title="TERM AND TERMINATION">
            <p>
              Either party may terminate this agreement with thirty (30) days written notice. Upon termination, any
              outstanding fees for services already rendered shall remain due and payable.
            </p>
          </Section>

          <Section title="GOVERNING LAW">
            <p>
              This agreement shall be governed by and construed in accordance with the laws of the State of Texas.
            </p>
          </Section>

          {/* Signatures */}
          <div className="pt-8 space-y-8">
            <h3 className="font-bold text-base">SIGNATURES</h3>
            <div className="grid grid-cols-2 gap-8">
              <SignatureLine label="Southern Roof Consultants" />
              <SignatureLine label="Client" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-muted-foreground min-w-[140px]">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-base mb-2">{title}</h3>
      {children}
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div className="space-y-1">
      <div className="border-b border-foreground w-full h-8" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">Date: _______________</p>
    </div>
  );
}
