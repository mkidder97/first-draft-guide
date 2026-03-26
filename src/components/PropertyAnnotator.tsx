import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Undo2, Trash2, Save, Square, PenLine } from "lucide-react";

interface Point { x: number; y: number; }

interface Shape {
  type: "rect" | "freehand";
  color: string;
  label: string;
  points: Point[];
}

interface Props {
  agreementId: string;
  satelliteImageUrl: string;
  existingAnnotations?: Shape[];
  onSaved?: (annotationImage: string) => void;
}

const COLOR_PRESETS = [
  { label: "In Scope", color: "rgba(255, 220, 0, 0.45)", border: "rgba(255, 180, 0, 0.9)" },
  { label: "Out of Scope", color: "rgba(255, 60, 60, 0.45)", border: "rgba(200, 0, 0, 0.9)" },
  { label: "Note", color: "rgba(60, 120, 255, 0.45)", border: "rgba(0, 80, 200, 0.9)" },
  { label: "Complete", color: "rgba(60, 200, 80, 0.45)", border: "rgba(0, 150, 40, 0.9)" },
];

export function PropertyAnnotator({ agreementId, satelliteImageUrl, existingAnnotations, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [shapes, setShapes] = useState<Shape[]>(existingAnnotations || []);
  const [tool, setTool] = useState<"rect" | "freehand">("rect");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [label, setLabel] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const redraw = useCallback((shapesToDraw: Shape[], previewPoints?: Point[]) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    shapesToDraw.forEach((shape) => {
      ctx.fillStyle = shape.color;
      const borderColor = COLOR_PRESETS.find(c => c.color === shape.color)?.border || shape.color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      if (shape.type === "rect" && shape.points.length === 2) {
        const [a, b] = shape.points;
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        if (shape.label) {
          ctx.fillStyle = borderColor;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(shape.label, a.x + 4, a.y + 16);
        }
      } else if (shape.type === "freehand" && shape.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        shape.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (shape.label) {
          ctx.fillStyle = borderColor;
          ctx.font = "bold 13px sans-serif";
          ctx.fillText(shape.label, shape.points[0].x + 4, shape.points[0].y + 16);
        }
      }
    });

    // Draw preview
    if (previewPoints && previewPoints.length > 0) {
      ctx.fillStyle = selectedColor.color;
      ctx.strokeStyle = selectedColor.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      if (tool === "rect" && previewPoints.length === 2) {
        const [a, b] = previewPoints;
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (tool === "freehand") {
        ctx.beginPath();
        ctx.moveTo(previewPoints[0].x, previewPoints[0].y);
        previewPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [imgLoaded, selectedColor, tool]);

  useEffect(() => {
    redraw(shapes);
  }, [shapes, imgLoaded, redraw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentPoints([pt]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    if (tool === "rect") {
      redraw(shapes, [currentPoints[0], pt]);
    } else {
      const newPoints = [...currentPoints, pt];
      setCurrentPoints(newPoints);
      redraw(shapes, newPoints);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pt = getCanvasPoint(e);
    let finalPoints: Point[];
    if (tool === "rect") {
      finalPoints = [currentPoints[0], pt];
    } else {
      finalPoints = [...currentPoints, pt];
    }
    if (finalPoints.length >= 2) {
      const newShape: Shape = {
        type: tool,
        color: selectedColor.color,
        label: label,
        points: finalPoints,
      };
      setShapes(prev => [...prev, newShape]);
    }
    setCurrentPoints([]);
  };

  const handleUndo = () => setShapes(prev => prev.slice(0, -1));
  const handleClear = () => setShapes([]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);
    try {
      const annotationImage = canvas.toDataURL("image/png");
      const { error } = await supabase
        .from("agreements")
        .update({
          annotation_data: shapes as any,
          annotation_image: annotationImage,
          satellite_image_url: satelliteImageUrl,
        } as any)
        .eq("id", agreementId);
      if (error) throw error;
      toast({ title: "Property map saved" });
      onSaved?.(annotationImage);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={tool === "rect" ? "default" : "outline"} onClick={() => setTool("rect")} className="gap-1.5 h-8 text-xs">
            <Square className="h-3.5 w-3.5" /> Rectangle
          </Button>
          <Button size="sm" variant={tool === "freehand" ? "default" : "outline"} onClick={() => setTool("freehand")} className="gap-1.5 h-8 text-xs">
            <PenLine className="h-3.5 w-3.5" /> Freehand
          </Button>
        </div>

        <div className="flex gap-1">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.label}
              onClick={() => setSelectedColor(c)}
              title={c.label}
              className={`h-7 w-7 rounded border-2 transition-all ${selectedColor.label === c.label ? "scale-110 border-foreground" : "border-transparent"}`}
              style={{ backgroundColor: c.border }}
            />
          ))}
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="h-8 text-xs border rounded px-2 w-36 bg-background"
        />

        <div className="flex gap-1 ml-auto">
          <Button size="sm" variant="ghost" onClick={handleUndo} className="h-8 w-8 p-0">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleClear} className="h-8 w-8 p-0">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="default" onClick={handleSave} disabled={isSaving} className="gap-1.5 h-8 text-xs">
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Save Map"}
          </Button>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        {COLOR_PRESETS.map((c) => (
          <div key={c.label} className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: c.border }} />
            <span>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative border rounded-md overflow-hidden">
        <img
          ref={imgRef}
          src={satelliteImageUrl}
          alt="Satellite view"
          className="hidden"
          onLoad={() => {
            const canvas = canvasRef.current;
            const img = imgRef.current;
            if (canvas && img) {
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              setImgLoaded(true);
            }
          }}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (isDrawing) handleMouseUp({} as any); }}
        />
      </div>

      <p className="text-xs text-muted-foreground">Draw shapes over the buildings included in this agreement. Save when done.</p>
    </div>
  );
}
