import { useRef, useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Undo2, Trash2, Save, Square, PenLine, MapPin, RotateCw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface Point { x: number; y: number; }

interface Shape {
  type: "rect" | "freehand";
  color: string;
  label: string;
  points: Point[];
  rotation?: number;
}

interface Props {
  agreementId: string;
  address: string;
  existingSatelliteUrl?: string | null;
  existingAnnotations?: Shape[];
  onSaved?: (annotationImage: string) => void;
}

const COLOR_PRESETS = [
  { label: "In Scope", color: "rgba(255, 220, 0, 0.45)", border: "rgba(255, 180, 0, 0.9)" },
  { label: "Out of Scope", color: "rgba(255, 60, 60, 0.45)", border: "rgba(200, 0, 0, 0.9)" },
  { label: "Note", color: "rgba(60, 120, 255, 0.45)", border: "rgba(0, 80, 200, 0.9)" },
  { label: "Complete", color: "rgba(60, 200, 80, 0.45)", border: "rgba(0, 150, 40, 0.9)" },
];

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyA5l3MGWK6jkedxdktSgH_AdmW4FnNFYm0";

const mapContainerStyle = { width: "100%", height: "400px" };

function drawRotatedRect(
  ctx: CanvasRenderingContext2D,
  a: Point, b: Point,
  rotation: number,
  fillColor: string, borderColor: string,
  label?: string
) {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const w = b.x - a.x;
  const h = b.y - a.y;
  const rad = (rotation * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  ctx.fillStyle = fillColor;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  if (label) {
    ctx.fillStyle = borderColor;
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(label, -w / 2 + 4, -h / 2 + 16);
  }

  ctx.restore();
}

export function PropertyAnnotator({ agreementId, address, existingSatelliteUrl, existingAnnotations, onSaved }: Props) {
  const { isLoaded } = useJsApiLoader({ id: "google-map-script", googleMapsApiKey: API_KEY });

  const mapRef = useRef<google.maps.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const hasExisting = !!(existingAnnotations && existingAnnotations.length > 0 && existingSatelliteUrl);
  const [phase, setPhase] = useState<"navigate" | "annotate">(hasExisting ? "annotate" : "navigate");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [staticUrl, setStaticUrl] = useState<string | null>(existingSatelliteUrl || null);
  const [rotation, setRotation] = useState(0);

  // Drawing state
  const [shapes, setShapes] = useState<Shape[]>(existingAnnotations || []);
  const [tool, setTool] = useState<"rect" | "freehand">("rect");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [label, setLabel] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shapeRotation, setShapeRotation] = useState(0);

  // Geocode address
  useEffect(() => {
    if (!isLoaded || !address || center) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        setCenter({ lat: loc.lat(), lng: loc.lng() });
      } else {
        setCenter({ lat: 29.7604, lng: -95.3698 });
      }
    });
  }, [isLoaded, address, center]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setTilt(0);
  }, []);

  // Sync rotation to map heading
  useEffect(() => {
    const map = mapRef.current;
    if (map && phase === "navigate") {
      map.setHeading(rotation);
    }
  }, [rotation, phase]);

  const handleStartAnnotating = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const z = map.getZoom();
    if (!c || z === undefined) return;
    const heading = map.getHeading() || 0;
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${c.lat()},${c.lng()}&zoom=${z}&size=640x640&maptype=satellite&scale=2&heading=${heading}&key=${API_KEY}`;
    setStaticUrl(url);
    setImgLoaded(false);
    setShapeRotation(heading);
    setPhase("annotate");
  };

  const handleBackToMap = () => {
    setPhase("navigate");
    setImgLoaded(false);
  };

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, shape: Shape) => {
    const borderColor = COLOR_PRESETS.find(c => c.color === shape.color)?.border || shape.color;
    if (shape.type === "rect" && shape.points.length === 2) {
      drawRotatedRect(ctx, shape.points[0], shape.points[1], shape.rotation || 0, shape.color, borderColor, shape.label);
    } else if (shape.type === "freehand" && shape.points.length > 1) {
      ctx.fillStyle = shape.color;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
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
  }, []);

  const redraw = useCallback((shapesToDraw: Shape[], previewPoints?: Point[]) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    shapesToDraw.forEach(shape => drawShape(ctx, shape));

    // Draw preview
    if (previewPoints && previewPoints.length > 0) {
      ctx.setLineDash([4, 4]);
      if (tool === "rect" && previewPoints.length === 2) {
        drawRotatedRect(ctx, previewPoints[0], previewPoints[1], shapeRotation, selectedColor.color, selectedColor.border);
      } else if (tool === "freehand") {
        ctx.fillStyle = selectedColor.color;
        ctx.strokeStyle = selectedColor.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(previewPoints[0].x, previewPoints[0].y);
        previewPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  }, [imgLoaded, selectedColor, tool, shapeRotation, drawShape]);

  useEffect(() => {
    if (phase === "annotate") redraw(shapes);
  }, [shapes, imgLoaded, redraw, phase]);

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
        ...(tool === "rect" ? { rotation: shapeRotation } : {}),
      };
      setShapes(prev => [...prev, newShape]);
    }
    setCurrentPoints([]);
  };

  const handleUndo = () => setShapes(prev => prev.slice(0, -1));
  const handleClear = () => setShapes([]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    setIsSaving(true);
    try {
      const ctx = canvas.getContext("2d")!;
      const origW = canvas.width;
      const origH = canvas.height;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      shapes.forEach(shape => drawShape(ctx, shape));

      const annotationImage = canvas.toDataURL("image/png");

      canvas.width = origW;
      canvas.height = origH;
      redraw(shapes);

      const { error } = await supabase
        .from("agreements")
        .update({
          annotation_data: shapes as any,
          annotation_image: annotationImage,
          satellite_image_url: staticUrl,
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

  // Navigate phase
  if (phase === "navigate") {
    if (!isLoaded || !center) {
      return <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">Loading map…</div>;
    }
    return (
      <div className="space-y-3">
        <div className="relative border rounded-md overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={18}
            onLoad={onMapLoad}
            options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, mapTypeId: "satellite", tilt: 0 }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[rotation]}
              onValueChange={([v]) => setRotation(v)}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">{rotation}°</span>
            <Button size="sm" variant="ghost" onClick={() => setRotation(0)} className="h-7 text-xs px-2">
              Reset
            </Button>
          </div>
          <Button onClick={handleStartAnnotating} className="gap-2 shadow-lg">
            <MapPin className="h-4 w-4" />
            Start Annotating
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Pan, zoom, and rotate the map to find the right view, then click "Start Annotating" to begin drawing.</p>
      </div>
    );
  }

  // Annotate phase
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleBackToMap} className="gap-1.5 h-8 text-xs">
          <MapPin className="h-3.5 w-3.5" /> Back to Map
        </Button>

        <div className="flex gap-1 border-l pl-2 ml-1">
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

      {/* Box angle slider — only when Rectangle tool is active */}
      {tool === "rect" && (
        <div className="flex items-center gap-2 px-1">
          <RotateCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Box angle:</span>
          <Slider
            value={[shapeRotation]}
            onValueChange={([v]) => setShapeRotation(v)}
            min={0}
            max={360}
            step={1}
            className="flex-1 max-w-[200px]"
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{shapeRotation}°</span>
          <Button size="sm" variant="ghost" onClick={() => setShapeRotation(0)} className="h-7 text-xs px-2">
            Reset
          </Button>
        </div>
      )}

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
          src={staticUrl || ""}
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

      <p className="text-xs text-muted-foreground">Draw rectangles or freehand shapes. Use the "Box angle" slider to rotate rectangles to match building orientation.</p>
    </div>
  );
}
