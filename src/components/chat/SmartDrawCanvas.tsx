import { useRef, useState, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Trash2, Check, Sparkles, Share2, Heart, MessageSquare, ArrowLeft, Palette, Brush, PaintBucket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface DrawPoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

interface Stroke {
  color: string;
  points: DrawPoint[];
  baseWidth: number;
}

const PRIMARY_SOLID_COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#facc15',
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const PRIMARY_GRADIENT_COLORS: [string, string][] = [
  ['#ef4444', '#f97316'], ['#f97316', '#facc15'], ['#22c55e', '#14b8a6'], ['#06b6d4', '#3b82f6'], ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#d946ef'], ['#ec4899', '#f97316'], ['#14b8a6', '#22c55e'], ['#0ea5e9', '#8b5cf6'], ['#f43f5e', '#fb7185'],
];

const EXTENDED_SOLID_COLORS = [
  '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#111827',
  '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#f87171', '#fca5a5', '#fee2e2', '#7c2d12', '#9a3412', '#c2410c',
  '#ea580c', '#fb923c', '#fdba74', '#ffedd5', '#713f12', '#854d0e', '#a16207', '#ca8a04', '#eab308', '#fde047',
  '#365314', '#4d7c0f', '#65a30d', '#84cc16', '#bef264', '#dcfce7', '#14532d', '#166534', '#15803d', '#16a34a',
  '#4ade80', '#bbf7d0', '#134e4a', '#0f766e', '#0d9488', '#14b8a6', '#5eead4', '#ccfbf1', '#164e63', '#0e7490',
  '#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd', '#1e1b4b', '#312e81', '#4338ca', '#4f46e5', '#7c3aed', '#a855f7',
];

const BG_PRIMARY_SOLID_COLORS = [
  '#000000', '#0b0f14', '#111827', '#1f2937', '#334155',
  '#0f172a', '#1e293b', '#374151', '#4b5563', '#6b7280',
];

const BG_PRIMARY_GRADIENT_COLORS: [string, string][] = [
  ['#0f172a', '#1e293b'], ['#111827', '#1f2937'], ['#0f3460', '#1a1a2e'], ['#1e1b4b', '#312e81'], ['#581c87', '#6d28d9'],
  ['#14532d', '#166534'], ['#064e3b', '#0f766e'], ['#164e63', '#0e7490'], ['#7c2d12', '#9a3412'], ['#7f1d1d', '#991b1b'],
];

const BG_EXTENDED_SOLID_COLORS = [
  '#020617', '#030712', '#09090b', '#18181b', '#27272a', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8',
  '#172554', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#172554', '#0c4a6e',
  '#0369a1', '#0284c7', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#082f49', '#0f172a', '#052e16',
  '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#dcfce7', '#022c22', '#052e16',
  '#3f1d0b', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fed7aa', '#431407', '#450a0a',
  '#881337', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#f9a8d4', '#fce7f3', '#3b0764', '#4a044e',
];

const BRUSH_COLORS = [
  ...PRIMARY_SOLID_COLORS,
  ...PRIMARY_GRADIENT_COLORS.map(([from, to]) => `gradient:${from}:${to}`),
  ...EXTENDED_SOLID_COLORS,
];

const BACKGROUND_COLORS = [
  ...BG_PRIMARY_SOLID_COLORS,
  ...BG_PRIMARY_GRADIENT_COLORS.map(([from, to]) => `gradient:${from}:${to}`),
  ...BG_EXTENDED_SOLID_COLORS,
];

function parseGradientToken(value: string): [string, string] | null {
  if (!value.startsWith('gradient:')) return null;
  const parts = value.split(':');
  if (parts.length !== 3) return null;
  return [parts[1], parts[2]];
}

interface AIAssistSuggestion {
  id: string;
  action: string;
  icon: React.ReactNode;
  color: string;
}

type ToolPanel = 'color' | 'brush' | 'background' | null;

const toPaint = (value: string) => {
  const gradient = parseGradientToken(value);
  return gradient ? `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` : value;
};

export function SmartDrawCanvas({
  onSubmit,
  onClose,
  initialMood = 'creative',
}: {
  onSubmit: (blob: Blob, exportType: 'story' | 'post' | 'chat' | 'private') => void;
  onClose: () => void;
  initialMood?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [bgColor, setBgColor] = useState(BACKGROUND_COLORS[0]);
  const [baseWidth, setBaseWidth] = useState(6);
  const [drawing, setDrawing] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeToolPanel, setActiveToolPanel] = useState<ToolPanel>(null);

  const activeStrokeRef = useRef<Stroke | null>(null);
  const velocityTrackRef = useRef({ lastX: 0, lastY: 0, lastTime: 0 });

  // AI Assist suggestions based on drawing activity
  const aiSuggestions: AIAssistSuggestion[] = [
    { id: 'smooth', action: 'Smooth your lines?', icon: <Sparkles className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500' },
    { id: 'convert', action: 'Convert to sketch?', icon: <Sparkles className="w-4 h-4" />, color: 'from-purple-500 to-pink-500' },
    { id: 'shade', action: 'Add shading?', icon: <Sparkles className="w-4 h-4" />, color: 'from-amber-500 to-orange-500' },
    { id: 'sticker', action: 'Turn into sticker?', icon: <Sparkles className="w-4 h-4" />, color: 'from-green-500 to-emerald-500' },
  ];

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    drawAll();
  }, []);

  // Speed-based brush: faster movement = thinner line
  const calculateWidth = (velocity: number, baseW: number): number => {
    // Velocity in pixels per millisecond
    // Max velocity ≈ 10 px/ms = very fast = thin line (0.4x)
    // Min velocity ≈ 0 px/ms = stationary = thick line (1.5x)
    const maxVelocity = 8;
    const speedFactor = Math.min(velocity / maxVelocity, 1);
    const thicknessMultiplier = 1.5 - speedFactor * 1.1; // 1.5 (slow) to 0.4 (fast)
    return baseW * thicknessMultiplier;
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;
    const gradientColors = parseGradientToken(stroke.color);
    if (gradientColors) {
      const [from, to] = gradientColors;
      const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
      gradient.addColorStop(0, from);
      gradient.addColorStop(1, to);
      ctx.strokeStyle = gradient;
    } else {
      ctx.strokeStyle = stroke.color;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      const velocity = i === 0 ? 0 : Math.hypot(
        point.x - stroke.points[i - 1].x,
        point.y - stroke.points[i - 1].y,
      ) / (point.time - stroke.points[i - 1].time || 1);

      ctx.lineWidth = calculateWidth(velocity, stroke.baseWidth);
      ctx.beginPath();

      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.moveTo(stroke.points[i - 1].x, stroke.points[i - 1].y);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }
  };

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply selected background color/gradient
    const backgroundGradient = parseGradientToken(bgColor);
    if (backgroundGradient) {
      const [from, to] = backgroundGradient;
      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, from);
      gradient.addColorStop(1, to);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(0, 0, rect.width, rect.height);

    strokes.forEach((stroke) => drawStroke(ctx, stroke));
    if (activeStrokeRef.current) drawStroke(ctx, activeStrokeRef.current);
  }, [strokes, bgColor]);

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resizeCanvas]);

  useEffect(() => {
    drawAll();
  }, [strokes, drawAll]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 1,
      time: Date.now(),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(e);
    if (!point) return;
    setDrawing(true);
    setShowAIAssist(false); // Hide AI suggestions when drawing
    setActiveToolPanel(null);
    const stroke: Stroke = { color, points: [point], baseWidth };
    activeStrokeRef.current = stroke;
    setRedoStack([]);
    velocityTrackRef.current = { lastX: point.x, lastY: point.y, lastTime: point.time };
    e.currentTarget.setPointerCapture(e.pointerId);
    drawAll();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || !activeStrokeRef.current) return;
    const point = pointFromEvent(e);
    if (!point) return;
    activeStrokeRef.current.points.push(point);
    drawAll();
  };

  const finishStroke = () => {
    if (!activeStrokeRef.current) {
      setDrawing(false);
      return;
    }
    const nextStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, nextStroke]);
    setDrawing(false);

    // Show AI assist after 2.5 seconds of inactivity
    const timer = setTimeout(() => {
      if (!drawing) {
        setShowAIAssist(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const popped = next.pop();
      if (popped) setRedoStack((redo) => [...redo, popped]);
      return next;
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop();
      if (restored) setStrokes((s) => [...s, restored]);
      return next;
    });
  };

  const clearAll = () => {
    setStrokes([]);
    setRedoStack([]);
    activeStrokeRef.current = null;
    setShowAIAssist(false);
    drawAll();
  };

  const exportDrawing = (exportType: 'story' | 'post' | 'chat' | 'private') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to export drawing');
        return;
      }
      onSubmit(blob, exportType);
    }, 'image/png', 0.95);
    setShowExportMenu(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar - Minimal */}
      <motion.div
        className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-sm border-b border-white/5"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
        <h2 className="text-white font-semibold text-lg">Draw</h2>
        <Button
          onClick={() => setShowExportMenu(true)}
          className="h-10 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full text-white font-semibold disabled:opacity-50"
          disabled={strokes.length === 0}
        >
          <Check className="w-4 h-4 mr-2" />
          Done
        </Button>
      </motion.div>

      {/* Canvas Area */}
      <motion.div
        className="flex-1 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none', background: toPaint(bgColor) }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
        />
      </motion.div>

      {/* Bottom Toolbar */}
      <motion.div
        className="p-4 bg-black/80 backdrop-blur-sm border-t border-white/5 space-y-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Action Buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            onClick={undo}
            disabled={strokes.length === 0}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 text-white hover:bg-white/10"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={redo}
            disabled={redoStack.length === 0}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 text-white hover:bg-white/10"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={clearAll}
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 text-white hover:bg-white/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setActiveToolPanel((prev) => (prev === 'color' ? null : 'color'))}
            variant="outline"
            size="sm"
            className={`rounded-full border-white/10 text-white hover:bg-white/10 ${
              activeToolPanel === 'color' ? 'bg-white/15' : ''
            }`}
            aria-label="Open color picker"
          >
            <Palette className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setActiveToolPanel((prev) => (prev === 'brush' ? null : 'brush'))}
            variant="outline"
            size="sm"
            className={`rounded-full border-white/10 text-white hover:bg-white/10 ${
              activeToolPanel === 'brush' ? 'bg-white/15' : ''
            }`}
            aria-label="Open brush size"
          >
            <Brush className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setActiveToolPanel((prev) => (prev === 'background' ? null : 'background'))}
            variant="outline"
            size="sm"
            className={`rounded-full border-white/10 text-white hover:bg-white/10 ${
              activeToolPanel === 'background' ? 'bg-white/15' : ''
            }`}
            aria-label="Open background picker"
          >
            <PaintBucket className="w-4 h-4" />
          </Button>
        </div>

        {/* One panel at a time */}
        <AnimatePresence mode="wait">
          {activeToolPanel === 'color' && (
            <motion.div
              key="color-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md"
            >
              <div className="text-sm font-medium text-slate-200 mb-3">Brush Colors</div>
              <div className="max-h-56 overflow-y-auto space-y-4 pr-1">
                <PaletteSection title="Top 10 Solid Colors">
                  {PRIMARY_SOLID_COLORS.map((swatch) => {
                  return (
                  <button
                    key={swatch}
                    onClick={() => setColor(swatch)}
                    className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                      color === swatch ? 'ring-2 ring-purple-500 scale-105' : 'border-white/20'
                    }`}
                    style={{ background: swatch }}
                    aria-label={`Use ${swatch} color`}
                  />
                  );
                })}
              </PaletteSection>
              <PaletteSection title="Top 10 Gradient Colors">
                {PRIMARY_GRADIENT_COLORS.map(([from, to]) => {
                  const token = `gradient:${from}:${to}`;
                  return (
                    <button
                      key={token}
                      onClick={() => setColor(token)}
                      className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                        color === token ? 'ring-2 ring-purple-500 scale-105' : 'border-white/20'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      aria-label={`Use gradient ${from} to ${to}`}
                    />
                  );
                })}
              </PaletteSection>
              <PaletteSection title="Extended 60 Colors">
                {EXTENDED_SOLID_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    onClick={() => setColor(swatch)}
                    className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                      color === swatch ? 'ring-2 ring-purple-500 scale-105' : 'border-white/20'
                    }`}
                    style={{ background: swatch }}
                    aria-label={`Use ${swatch} color`}
                  />
                ))}
              </PaletteSection>
              </div>
            </motion.div>
          )}

          {activeToolPanel === 'brush' && (
            <motion.div
              key="brush-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-3 py-2 bg-white/5 rounded-xl border border-white/10"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs text-slate-300">Brush Size</span>
                <span className="text-xs text-slate-400">{baseWidth}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                value={baseWidth}
                onChange={(e) => setBaseWidth(Number(e.target.value))}
                className="w-full cursor-pointer accent-purple-500"
              />
            </motion.div>
          )}

          {activeToolPanel === 'background' && (
            <motion.div
              key="background-panel"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md"
            >
              <div className="text-sm font-medium text-slate-200 mb-3">Background Colors</div>
              <div className="max-h-56 overflow-y-auto space-y-4 pr-1">
                <PaletteSection title="Top 10 Solid Backgrounds">
                  {BG_PRIMARY_SOLID_COLORS.map((bg) => {
                  return (
                  <button
                    key={bg}
                    onClick={() => setBgColor(bg)}
                    className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                      bgColor === bg ? 'ring-2 ring-purple-500' : 'border-white/20'
                    }`}
                    style={{ background: bg }}
                    aria-label={`Use ${bg} background`}
                  />
                  );
                })}
              </PaletteSection>
              <PaletteSection title="Top 10 Gradient Backgrounds">
                {BG_PRIMARY_GRADIENT_COLORS.map(([from, to]) => {
                  const token = `gradient:${from}:${to}`;
                  return (
                    <button
                      key={token}
                      onClick={() => setBgColor(token)}
                      className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                        bgColor === token ? 'ring-2 ring-purple-500' : 'border-white/20'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      aria-label={`Use gradient ${from} to ${to}`}
                    />
                  );
                })}
              </PaletteSection>
              <PaletteSection title="Extended 60 Background Colors">
                {BG_EXTENDED_SOLID_COLORS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setBgColor(bg)}
                    className={`shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-full border-2 transition-all hover:scale-110 ${
                      bgColor === bg ? 'ring-2 ring-purple-500' : 'border-white/20'
                    }`}
                    style={{ background: bg }}
                    aria-label={`Use ${bg} background`}
                  />
                ))}
              </PaletteSection>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* AI Assist - Floating Chips */}
      <AnimatePresence>
        {showAIAssist && (
          <motion.div
            className="fixed bottom-40 left-1/2 -translate-x-1/2 flex gap-2 flex-wrap justify-center max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {aiSuggestions.slice(0, 2).map((suggestion) => (
              <motion.button
                key={suggestion.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  toast.success(`Applied: ${suggestion.action}`);
                  setShowAIAssist(false);
                }}
                className={`px-3 py-2 rounded-full text-xs font-semibold text-white bg-gradient-to-r ${suggestion.color} hover:shadow-lg transition-shadow flex items-center gap-1`}
              >
                {suggestion.icon}
                {suggestion.action}
              </motion.button>
            ))}
            <button
              onClick={() => setShowAIAssist(false)}
              className="text-xs text-slate-400 hover:text-slate-300 px-2"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Menu */}
      <AnimatePresence>
        {showExportMenu && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExportMenu(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-white/10 p-6 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-bold text-lg mb-1">Share Your Creation</h3>
              <p className="text-slate-400 text-sm mb-5">Choose where to use this drawing</p>

              <div className="space-y-2">
                <ExportOption
                  icon={<Heart className="w-4 h-4" />}
                  label="As a Story"
                  desc="Share with your followers"
                  onClick={() => exportDrawing('story')}
                  color="from-red-500 to-pink-500"
                />
                <ExportOption
                  icon={<Share2 className="w-4 h-4" />}
                  label="As a Post"
                  desc="On your feed or marketplace"
                  onClick={() => exportDrawing('post')}
                  color="from-blue-500 to-cyan-500"
                />
                <ExportOption
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="In Chat"
                  desc="Send to a friend or group"
                  onClick={() => exportDrawing('chat')}
                  color="from-purple-500 to-pink-500"
                />
                <ExportOption
                  icon={<Heart className="w-4 h-4" />}
                  label="Save Privately"
                  desc="Keep for yourself only"
                  onClick={() => exportDrawing('private')}
                  color="from-amber-500 to-orange-500"
                />
              </div>

              <Button
                variant="ghost"
                className="w-full mt-4 text-slate-300 hover:text-white hover:bg-white/10"
                onClick={() => setShowExportMenu(false)}
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaletteSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">{title}</p>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">{children}</div>
    </div>
  );
}

function ExportOption({
  icon,
  label,
  desc,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`w-full p-3 rounded-xl bg-gradient-to-r ${color} text-white text-left transition-all hover:shadow-lg flex items-start gap-3`}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs opacity-90">{desc}</div>
      </div>
    </motion.button>
  );
}
