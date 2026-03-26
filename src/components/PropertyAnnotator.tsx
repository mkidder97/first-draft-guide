import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Undo2, Trash2, Save, Square, PenLine, Move, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

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
  const [tool, setTool] = useState<"rect" | "freehand" | "pan">("pan");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [label, setLabel] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
  const [panOffsetStart, setPanOffsetStart] = useState<Point>({ x: 0, y: 0 });

  // Convert screen coords to image-space coords
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const screenX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const screenY = (e.clientY - rect.top) * (canvas.height / rect.height);
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  };

  // Get raw screen-space coords (for panning)
  const getScreenPoint = (e: React.MouseEvent): Point => {
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

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    shapesToDraw.forEach((shape) => {
      ctx.fillStyle = shape.color;
      const borderColor = COLOR_PRESETS.find(c => c.color === shape.color)?.border || shape.color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2 / scale;
      if (shape.type === "rect" && shape.points.length === 2) {
        const [a, b] = shape.points;
        ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
        if (shape.label) {
          ctx.fillStyle = borderColor;
          ctx.font = `bold ${13 / scale}px sans-serif`;
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
          ctx.font = `bold ${13 / scale}px sans-serif`;
          ctx.fillText(shape.label, shape.points[0].x + 4, shape.points[0].y + 16);
        }
      }
    });

    // Draw preview
    if (previewPoints && previewPoints.length > 0) {
      ctx.fillStyle = selectedColor.color;
      ctx.strokeStyle = selectedColor.border;
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([4 / scale, 4 / scale]);
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

    ctx.restore();
  }, [imgLoaded, selectedColor, tool, scale, offset]);

  useEffect(() => {
    redraw(shapes);
  }, [shapes, imgLoaded, redraw]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "pan") {
      setIsPanning(true);
      setPanStart(getScreenPoint(e));
      setPanOffsetStart({ ...offset });
      return;
    }
    const pt = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentPoints([pt]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === "pan" && isPanning) {
      const current = getScreenPoint(e);
      setOffset({
        x: panOffsetStart.x + (current.x - panStart.x),
        y: panOffsetStart.y + (current.y - panStart.y),
      });
      return;
    }
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
    if (tool === "pan") {
      setIsPanning(false);
      return;
    }
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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newScale = Math.min(4, Math.max(0.5, scale + delta));
    const ratio = newScale / scale;

    setOffset(prev => ({
      x: mouseX - ratio * (mouseX - prev.x),
      y: mouseY - ratio * (mouseY - prev.y),
    }));
    setScale(newScale);
  }, [scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const zoomIn = () => {
    const newScale = Math.min(4, scale + 0.25);
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const ratio = newScale / scale;
      setOffset(prev => ({ x: cx - ratio * (cx - prev.x), y: cy - ratio * (cy - prev.y) }));
    }
    setScale(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(0.5, scale - 0.25);
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const ratio = newScale / scale;
      setOffset(prev => ({ x: cx - ratio * (cx - prev.x), y: cy - ratio * (cy - prev.y) }));
    }
    setScale(newScale);
  };

  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const handleUndo = () => setShapes(prev => prev.slice(0, -1));
  const handleClear = () => setShapes([]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    setIsSaving(true);
    try {
      // Render at full resolution without pan/zoom for export
      const ctx = canvas.getContext("2d")!;
      const origW = canvas.width;
      const origH = canvas.height;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      shapes.forEach((shape) => {
        ctx.fillStyle = shape.color;
        const borderColor = COLOR_PRESETS.find(c => c.color === shape.color)?.border || shape.color;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        if (shape.type === "rect" && shape.points.length === 2) {
          const [a, b] = shape.points;
          ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
          ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
          if (shape.label) { ctx.fillStyle = borderColor; ctx.font = "bold 13px sans-serif"; ctx.fillText(shape.label, a.x + 4, a.y + 16); }
        } else if (shape.type === "freehand" && shape.points.length > 1) {
          ctx.beginPath(); ctx.moveTo(shape.points[0].x, shape.points[0].y);
          shape.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
          if (shape.label) { ctx.fillStyle = borderColor; ctx.font = "bold 13px sans-serif"; ctx.fillText(shape.label, shape.points[0].x + 4, shape.points[0].y + 16); }
        }
      });

      const annotationImage = canvas.toDataURL("image/png");

      // Restore canvas size and redraw with current view
      canvas.width = origW;
      canvas.height = origH;
      redraw(shapes);

      const { error } = await supabase
        .from("agreements")
        .update({
          annotation_data: shapes as any,
          annotation_image: annotationImage,
          satellite_image_url: satelliteImageUrl,
        })
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

  const cursorClass = tool === "pan" ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={tool === "pan" ? "default" : "outline"} onClick={() => setTool("pan")} className="gap-1.5 h-8 text-xs">
            <Move className="h-3.5 w-3.5" /> Move
          </Button>
          <Button size="sm" variant={tool === "rect" ? "default" : "outline"} onClick={() => setTool("rect")} className="gap-1.5 h-8 text-xs">
            <Square className="h-3.5 w-3.5" /> Rectangle
          </Button>
          <Button size="sm" variant={tool === "freehand" ? "default" : "outline"} onClick={() => setTool("freehand")} className="gap-1.5 h-8 text-xs">
            <PenLine className="h-3.5 w-3.5" /> Freehand
          </Button>
        </div>

        <div className="flex items-center gap-1 border-l pl-2 ml-1">
          <Button size="sm" variant="ghost" onClick={zoomOut} className="h-8 w-8 p-0"><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button size="sm" variant="ghost" onClick={zoomIn} className="h-8 w-8 p-0"><ZoomIn className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={resetView} className="h-8 w-8 p-0" title="Reset view"><RotateCcw className="h-3.5 w-3.5" /></Button>
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
          className={`w-full ${cursorClass}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isPanning) setIsPanning(false);
            if (isDrawing) handleMouseUp({} as any);
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">Use Move tool to pan, scroll wheel to zoom. Switch to Rectangle or Freehand to draw shapes.</p>
    </div>
  );
}
