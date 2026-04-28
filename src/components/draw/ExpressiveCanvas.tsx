import { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Check, Sparkles, Share2, Heart, MessageSquare, 
  Bookmark, Plus, Palette, Undo2, Redo2, Trash2, Wand2,
  Minus, Circle, Paintbrush, Droplets, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Add scrollbar-hide styles
const scrollbarHideStyles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// ============ TYPES ============
interface DrawPoint {
  x: number;
  y: number;
  pressure: number;
  time: number;
}

interface Stroke {
  id: string;
  color: string;
  points: DrawPoint[];
  baseWidth: number;
  layer: 'stroke' | 'text' | 'shape';
}

interface AIAssistSuggestion {
  id: string;
  action: string;
  icon: React.ReactNode;
  gradient: string;
}

export type ExportType = 'story' | 'post' | 'chat' | 'private';
export type MoodType = 'calm' | 'energetic' | 'creative' | 'focused';

// ============ EXTENDED COLOR PALETTE (80+ colors) ============

// Top 10 basic colors (most used)
const BASIC_COLORS = [
  { hex: '#000000', name: 'Black' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink' },
];

// 10 gradient colors
const GRADIENT_COLORS = [
  { hex: '#ff6b6b', name: 'Sunset Red', gradient: 'linear-gradient(135deg, #ff6b6b, #ffd93d)' },
  { hex: '#f43f5e', name: 'Rose Pink', gradient: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { hex: '#ef4444', name: 'Fire Orange', gradient: 'linear-gradient(135deg, #ef4444, #f59e0b)' },
  { hex: '#f97316', name: 'Golden Amber', gradient: 'linear-gradient(135deg, #f97316, #facc15)' },
  { hex: '#84cc16', name: 'Lime Green', gradient: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { hex: '#22c55e', name: 'Emerald Teal', gradient: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
  { hex: '#10b981', name: 'Ocean Cyan', gradient: 'linear-gradient(135deg, #10b981, #06b6d4)' },
  { hex: '#06b6d4', name: 'Sky Blue', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
  { hex: '#3b82f6', name: 'Royal Indigo', gradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' },
  { hex: '#0f172a', name: 'Deep Navy', gradient: 'linear-gradient(135deg, #0f172a, #1e3a8a)' },
];

// 60+ extended colors
const EXTENDED_COLORS = [
  // Whites & Grays
  { hex: '#f3f4f6', name: 'Gray 100' },
  { hex: '#e5e7eb', name: 'Gray 200' },
  { hex: '#9ca3af', name: 'Gray 400' },
  { hex: '#6b7280', name: 'Gray 500' },
  { hex: '#374151', name: 'Gray 700' },
  { hex: '#1f2937', name: 'Gray 800' },
  { hex: '#111827', name: 'Gray 900' },
  // Reds
  { hex: '#fef2f2', name: 'Red 50' },
  { hex: '#fecaca', name: 'Red 200' },
  { hex: '#f87171', name: 'Red 400' },
  { hex: '#dc2626', name: 'Red 600' },
  { hex: '#991b1b', name: 'Red 800' },
  { hex: '#7f1d1d', name: 'Red 900' },
  // Oranges
  { hex: '#fff7ed', name: 'Orange 50' },
  { hex: '#fed7aa', name: 'Orange 200' },
  { hex: '#fb923c', name: 'Orange 400' },
  { hex: '#ea580c', name: 'Orange 600' },
  { hex: '#9a3412', name: 'Orange 800' },
  { hex: '#7c2d12', name: 'Orange 900' },
  // Ambers
  { hex: '#fffbeb', name: 'Amber 50' },
  { hex: '#fde68a', name: 'Amber 200' },
  { hex: '#fbbf24', name: 'Amber 400' },
  { hex: '#f59e0b', name: 'Amber 500' },
  { hex: '#d97706', name: 'Amber 600' },
  { hex: '#b45309', name: 'Amber 700' },
  { hex: '#78350f', name: 'Amber 900' },
  // Yellows
  { hex: '#fefce8', name: 'Yellow 50' },
  { hex: '#fef08a', name: 'Yellow 200' },
  { hex: '#facc15', name: 'Yellow 400' },
  { hex: '#ca8a04', name: 'Yellow 600' },
  { hex: '#854d0e', name: 'Yellow 800' },
  // Limes
  { hex: '#ecfccb', name: 'Lime 50' },
  { hex: '#bef264', name: 'Lime 300' },
  { hex: '#65a30d', name: 'Lime 600' },
  { hex: '#4d7c0f', name: 'Lime 700' },
  { hex: '#3f6212', name: 'Lime 800' },
  // Greens
  { hex: '#f0fdf4', name: 'Green 50' },
  { hex: '#bbf7d0', name: 'Green 200' },
  { hex: '#4ade80', name: 'Green 400' },
  { hex: '#16a34a', name: 'Green 600' },
  { hex: '#14532d', name: 'Green 900' },
  { hex: '#052e16', name: 'Green 950' },
  // Teals
  { hex: '#f0fdfa', name: 'Teal 50' },
  { hex: '#99f6e4', name: 'Teal 200' },
  { hex: '#2dd4bf', name: 'Teal 400' },
  { hex: '#0d9488', name: 'Teal 600' },
  { hex: '#134e4a', name: 'Teal 800' },
  // Cyans
  { hex: '#ecfeff', name: 'Cyan 50' },
  { hex: '#a5f3fc', name: 'Cyan 200' },
  { hex: '#22d3ee', name: 'Cyan 400' },
  { hex: '#0891b2', name: 'Cyan 600' },
  { hex: '#164e63', name: 'Cyan 800' },
  // Sky
  { hex: '#f0f9ff', name: 'Sky 50' },
  { hex: '#7dd3fc', name: 'Sky 300' },
  { hex: '#0284c7', name: 'Sky 600' },
  { hex: '#0c4a6e', name: 'Sky 800' },
  // Blues
  { hex: '#eff6ff', name: 'Blue 50' },
  { hex: '#bfdbfe', name: 'Blue 200' },
  { hex: '#60a5fa', name: 'Blue 400' },
  { hex: '#2563eb', name: 'Blue 600' },
  { hex: '#1e40af', name: 'Blue 800' },
  { hex: '#172554', name: 'Blue 950' },
  // Indigos
  { hex: '#eef2ff', name: 'Indigo 50' },
  { hex: '#c7d2fe', name: 'Indigo 200' },
  { hex: '#818cf8', name: 'Indigo 400' },
  { hex: '#4f46e5', name: 'Indigo 600' },
  { hex: '#312e81', name: 'Indigo 800' },
  { hex: '#1e1b4b', name: 'Indigo 950' },
  // Violets
  { hex: '#f5f3ff', name: 'Violet 50' },
  { hex: '#ddd6fe', name: 'Violet 200' },
  { hex: '#a78bfa', name: 'Violet 400' },
  { hex: '#7c3aed', name: 'Violet 600' },
  { hex: '#5b21b6', name: 'Violet 800' },
  { hex: '#2e1065', name: 'Violet 950' },
  // Purples
  { hex: '#faf5ff', name: 'Purple 50' },
  { hex: '#e9d5ff', name: 'Purple 200' },
  { hex: '#c084fc', name: 'Purple 400' },
  { hex: '#9333ea', name: 'Purple 600' },
  { hex: '#6b21a8', name: 'Purple 800' },
  { hex: '#3b0764', name: 'Purple 950' },
  // Fuchsias
  { hex: '#fdf4ff', name: 'Fuchsia 50' },
  { hex: '#e879f9', name: 'Fuchsia 400' },
  { hex: '#c026d3', name: 'Fuchsia 600' },
  { hex: '#701a75', name: 'Fuchsia 800' },
  { hex: '#4a044e', name: 'Fuchsia 950' },
  // Pinks
  { hex: '#fdf2f8', name: 'Pink 50' },
  { hex: '#fbcfe8', name: 'Pink 200' },
  { hex: '#f472b6', name: 'Pink 400' },
  { hex: '#db2777', name: 'Pink 600' },
  { hex: '#831843', name: 'Pink 800' },
  { hex: '#500724', name: 'Pink 950' },
  // Roses
  { hex: '#fff1f2', name: 'Rose 50' },
  { hex: '#fecdd3', name: 'Rose 200' },
  { hex: '#fb7185', name: 'Rose 400' },
  { hex: '#e11d48', name: 'Rose 600' },
  { hex: '#9f1239', name: 'Rose 800' },
  { hex: '#4c0519', name: 'Rose 950' },
];

// Quick access colors (top row)
const QUICK_COLORS = BASIC_COLORS;

// Extended background colors (50 varieties)
const EXTENDED_BG_COLORS = [
  // Dark theme backgrounds
  { hex: '#0a0f1e', name: 'Midnight', category: 'Dark' },
  { hex: '#0f172a', name: 'Slate', category: 'Dark' },
  { hex: '#111827', name: 'Gray', category: 'Dark' },
  { hex: '#1a0533', name: 'Deep Purple', category: 'Dark' },
  { hex: '#0c0518', name: 'Void', category: 'Dark' },
  { hex: '#071428', name: 'Ocean', category: 'Dark' },
  { hex: '#020617', name: 'Deep Sea', category: 'Dark' },
  { hex: '#071f1e', name: 'Forest', category: 'Dark' },
  { hex: '#022c22', name: 'Emerald', category: 'Dark' },
  { hex: '#1a0d18', name: 'Berry', category: 'Dark' },
  { hex: '#310b0b', name: 'Crimson', category: 'Dark' },
  { hex: '#0c0805', name: 'Espresso', category: 'Dark' },
  { hex: '#1c1917', name: 'Stone', category: 'Dark' },
  { hex: '#18181b', name: 'Zinc', category: 'Dark' },
  { hex: '#0f0f0f', name: 'Pure Black', category: 'Dark' },
  // Medium/Dark
  { hex: '#1e1b4b', name: 'Indigo Dark', category: 'Medium' },
  { hex: '#312e81', name: 'Indigo', category: 'Medium' },
  { hex: '#4c1d95', name: 'Violet', category: 'Medium' },
  { hex: '#581c87', name: 'Purple', category: 'Medium' },
  { hex: '#701a75', name: 'Fuchsia', category: 'Medium' },
  { hex: '#831843', name: 'Pink Dark', category: 'Medium' },
  { hex: '#9f1239', name: 'Rose', category: 'Medium' },
  { hex: '#be123c', name: 'Red', category: 'Medium' },
  { hex: '#c2410c', name: 'Orange', category: 'Medium' },
  { hex: '#b45309', name: 'Amber', category: 'Medium' },
  { hex: '#a16207', name: 'Yellow', category: 'Medium' },
  { hex: '#65a30d', name: 'Lime', category: 'Medium' },
  { hex: '#16a34a', name: 'Green', category: 'Medium' },
  { hex: '#059669', name: 'Emerald', category: 'Medium' },
  { hex: '#0d9488', name: 'Teal', category: 'Medium' },
  { hex: '#0891b2', name: 'Cyan', category: 'Medium' },
  { hex: '#0284c7', name: 'Sky', category: 'Medium' },
  { hex: '#2563eb', name: 'Blue', category: 'Medium' },
  { hex: '#4f46e5', name: 'Indigo', category: 'Medium' },
  // Light backgrounds
  { hex: '#ffffff', name: 'Pure White', category: 'Light' },
  { hex: '#fafafa', name: 'Snow', category: 'Light' },
  { hex: '#f5f5f5', name: 'Whitesmoke', category: 'Light' },
  { hex: '#f3f4f6', name: 'Gray 100', category: 'Light' },
  { hex: '#e5e7eb', name: 'Gray 200', category: 'Light' },
  { hex: '#fef2f2', name: 'Red 50', category: 'Light' },
  { hex: '#fff7ed', name: 'Orange 50', category: 'Light' },
  { hex: '#fffbeb', name: 'Amber 50', category: 'Light' },
  { hex: '#fefce8', name: 'Yellow 50', category: 'Light' },
  { hex: '#f0fdf4', name: 'Green 50', category: 'Light' },
  { hex: '#ecfdf5', name: 'Emerald 50', category: 'Light' },
  { hex: '#f0fdfa', name: 'Teal 50', category: 'Light' },
  { hex: '#ecfeff', name: 'Cyan 50', category: 'Light' },
  { hex: '#f0f9ff', name: 'Sky 50', category: 'Light' },
  { hex: '#eff6ff', name: 'Blue 50', category: 'Light' },
  { hex: '#eef2ff', name: 'Indigo 50', category: 'Light' },
  { hex: '#f5f3ff', name: 'Violet 50', category: 'Light' },
  { hex: '#faf5ff', name: 'Purple 50', category: 'Light' },
  { hex: '#fdf4ff', name: 'Fuchsia 50', category: 'Light' },
  { hex: '#fdf2f8', name: 'Pink 50', category: 'Light' },
  { hex: '#fff1f2', name: 'Rose 50', category: 'Light' },
  // Gradients represented as solid for canvas bg
  { hex: '#1e3a8a', name: 'Blue Gradient', category: 'Gradient' },
  { hex: '#581c87', name: 'Purple Gradient', category: 'Gradient' },
  { hex: '#be185d', name: 'Pink Gradient', category: 'Gradient' },
];

const BRUSH_SIZES = [
  { size: 2, label: 'XS', icon: '•' },
  { size: 4, label: 'S', icon: '••' },
  { size: 6, label: 'M', icon: '•••' },
  { size: 10, label: 'L', icon: '●' },
  { size: 16, label: 'XL', icon: '●●' },
  { size: 24, label: '2XL', icon: '●●●' },
  { size: 32, label: '3XL', icon: '⬤' },
  { size: 48, label: 'Fill', icon: '█' },
];

const MOOD_CONFIG: Record<MoodType, {
  bgGradient: string;
  accentColor: string;
  glowColor: string;
  label: string;
}> = {
  calm: {
    bgGradient: 'from-blue-950 via-slate-900 to-cyan-950',
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    label: 'Calm',
  },
  energetic: {
    bgGradient: 'from-orange-950 via-red-950 to-amber-950',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.3)',
    label: 'Energetic',
  },
  creative: {
    bgGradient: 'from-purple-950 via-fuchsia-950 to-pink-950',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    label: 'Creative',
  },
  focused: {
    bgGradient: 'from-slate-950 via-zinc-900 to-neutral-950',
    accentColor: '#71717a',
    glowColor: 'rgba(113, 113, 122, 0.3)',
    label: 'Focused',
  },
};

const AI_SUGGESTIONS: AIAssistSuggestion[] = [
  { id: 'smooth', action: 'Smooth lines', icon: <Sparkles className="w-3 h-3" />, gradient: 'from-blue-500 to-cyan-400' },
  { id: 'sketch', action: 'Clean sketch', icon: <Wand2 className="w-3 h-3" />, gradient: 'from-purple-500 to-pink-400' },
  { id: 'shade', action: 'Add shading', icon: <Palette className="w-3 h-3" />, gradient: 'from-amber-500 to-orange-400' },
  { id: 'sticker', action: 'Make sticker', icon: <Sparkles className="w-3 h-3" />, gradient: 'from-emerald-500 to-teal-400' },
];

// ============ MAIN COMPONENT ============
export function ExpressiveCanvas({
  onSubmit,
  onClose,
  initialMood = 'creative',
}: {
  onSubmit: (blob: Blob, exportType: ExportType) => void;
  onClose: () => void;
  initialMood?: MoodType;
}) {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drawing state
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tool state
  const [color, setColor] = useState(QUICK_COLORS[0].hex);
  const [bgColor, setBgColor] = useState(EXTENDED_BG_COLORS[0].hex);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [showBrushPanel, setShowBrushPanel] = useState(false);
  const [baseWidth, setBaseWidth] = useState(6);
  const [mood, setMood] = useState<MoodType>(initialMood);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // AI Assist state
  const [showAIAssist, setShowAIAssist] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);
  
  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Ripple animation state
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const moodConfig = MOOD_CONFIG[mood];

  // ============ CANVAS SETUP ============
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    redrawCanvas();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // ============ DRAWING LOGIC ============
  // Speed-based brush: slow = thicker, fast = thinner
  const calculateStrokeWidth = (velocity: number, base: number): number => {
    const maxVelocity = 8; // pixels per ms
    const speedFactor = Math.min(velocity / maxVelocity, 1);
    const thicknessMultiplier = 1.6 - speedFactor * 1.2; // 1.6x (slow) to 0.4x (fast)
    return base * thicknessMultiplier;
  };

  const drawStrokeToContext = (
    ctx: CanvasRenderingContext2D,
    stroke: Stroke,
    isActive = false
  ) => {
    if (stroke.points.length < 2) return;
    
    ctx.strokeStyle = stroke.color;
    
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      
      const velocity = Math.hypot(curr.x - prev.x, curr.y - prev.y) / 
        Math.max(curr.time - prev.time, 1);
      
      ctx.lineWidth = calculateStrokeWidth(velocity, stroke.baseWidth);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Add paper texture noise (2% intensity)
    const imageData = ctx.getImageData(0, 0, rect.width, rect.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 6;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Draw all strokes
    strokes.forEach(stroke => drawStrokeToContext(ctx, stroke));
    if (activeStroke) drawStrokeToContext(ctx, activeStroke, true);
  }, [strokes, activeStroke, bgColor]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // ============ POINTER EVENTS ============
  const getPointFromEvent = (e: React.PointerEvent): DrawPoint | null => {
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

  const handlePointerDown = (e: React.PointerEvent) => {
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setIsDrawing(true);
    setHasInteracted(true);
    setShowAIAssist(false);
    
    // Trigger ripple animation
    const rippleId = Date.now();
    setRipple({ x: point.x, y: point.y, id: rippleId });
    setTimeout(() => setRipple(null), 200);
    
    // Create new stroke
    const newStroke: Stroke = {
      id: `stroke-${Date.now()}`,
      color,
      points: [point],
      baseWidth,
      layer: 'stroke',
    };
    
    setActiveStroke(newStroke);
    setRedoStack([]);
    
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !activeStroke) return;
    
    const point = getPointFromEvent(e);
    if (!point) return;
    
    setActiveStroke(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
  };

  const handlePointerUp = () => {
    if (!activeStroke) {
      setIsDrawing(false);
      return;
    }
    
    setStrokes(prev => [...prev, activeStroke]);
    setActiveStroke(null);
    setIsDrawing(false);
    setLastActivityTime(Date.now());
    
    // Trigger AI assist after 2.5s of inactivity
    if (aiAssistEnabled) {
      setTimeout(() => {
        setShowAIAssist(true);
      }, 2500);
    }
  };

  // ============ ACTIONS ============
  const undo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setRedoStack(prev => [...prev, lastStroke]);
    setStrokes(prev => prev.slice(0, -1));
    setShowAIAssist(false);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const lastRedo = redoStack[redoStack.length - 1];
    setStrokes(prev => [...prev, lastRedo]);
    setRedoStack(prev => prev.slice(0, -1));
    setShowAIAssist(false);
  };

  const clearAll = () => {
    setStrokes([]);
    setRedoStack([]);
    setActiveStroke(null);
    setShowAIAssist(false);
    setHasInteracted(false);
  };

  const exportDrawing = (type: ExportType) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to export');
        return;
      }
      onSubmit(blob, type);
      toast.success(type === 'private' ? 'Saved privately' : 'Ready to share!');
    }, 'image/png', 0.95);
    
    setShowExportMenu(false);
  };

  // ============ RENDER ============
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col bg-gradient-to-br",
      moodConfig.bgGradient
    )}>
      {/* TOP BAR - Minimal Intent-Driven */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-4 py-3"
      >
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <span className="text-white/80 font-medium text-sm tracking-wide">
          Draw
        </span>
        
        <button
          onClick={() => setShowExportMenu(true)}
          disabled={!hasInteracted}
          className={cn(
            "h-10 px-5 rounded-full font-semibold text-sm transition-all",
            hasInteracted 
              ? "bg-white text-black hover:bg-white/90" 
              : "bg-white/10 text-white/40 cursor-not-allowed"
          )}
        >
          Done
        </button>
      </motion.div>

      {/* CANVAS AREA - Full Screen */}
      <div ref={containerRef} className="flex-1 px-4 py-2 relative flex items-center justify-center">
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black/20">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          
          {/* Ripple Effect */}
          <AnimatePresence>
            {ripple && (
              <motion.div
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute w-8 h-8 rounded-full pointer-events-none"
                style={{
                  left: ripple.x - 16,
                  top: ripple.y - 16,
                  background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* DRAWING TOOLBAR - All Icons at Bottom, Panels Expand UP */}
      <div className="px-4 pb-6">
        {/* EXPANDABLE PANELS - Appear ABOVE toolbar when icons clicked */}
        <div className="mb-3 space-y-2">
          {/* COLOR PALETTE PANEL - 10 Basic + 10 Gradients + 60+ Extended */}
          <AnimatePresence>
            {showColorPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-[#1a1a2e] rounded-2xl p-3 border border-white/10">
                  {/* Basic Colors */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">Basic Colors</p>
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {BASIC_COLORS.map((c) => (
                      <motion.button
                        key={c.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setColor(c.hex)}
                        className={cn(
                          "w-10 h-10 rounded-full flex-shrink-0 transition-all border-2 shadow-lg",
                          color === c.hex
                            ? "border-white scale-110 shadow-xl"
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Gradient Colors */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">Gradients</p>
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {GRADIENT_COLORS.map((c) => (
                      <motion.button
                        key={c.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setColor(c.hex)}
                        className={cn(
                          "w-10 h-10 rounded-full flex-shrink-0 transition-all border-2 shadow-lg relative overflow-hidden",
                          color === c.hex
                            ? "border-white scale-110 shadow-xl"
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: c.gradient }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Extended Colors */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">More Colors</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {EXTENDED_COLORS.map((c) => (
                      <motion.button
                        key={c.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setColor(c.hex)}
                        className={cn(
                          "w-8 h-8 rounded-full flex-shrink-0 transition-all border-2 shadow-lg",
                          color === c.hex
                            ? "border-white scale-110 shadow-xl"
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BRUSH SIZE PANEL */}
          <AnimatePresence>
            {showBrushPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-[#1a1a2e] rounded-2xl p-3 border border-white/10">
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-3 text-center font-medium">Brush Size</p>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
                    {BRUSH_SIZES.map((b) => (
                      <motion.button
                        key={b.size}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setBaseWidth(b.size)}
                        className={cn(
                          "flex flex-col items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 transition-all min-w-[60px]",
                          baseWidth === b.size 
                            ? "bg-white text-black shadow-lg" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        )}
                      >
                        <div 
                          className="rounded-full bg-current shadow-sm"
                          style={{ width: Math.min(b.size, 18), height: Math.min(b.size, 18) }}
                        />
                        <span className="text-[10px] font-semibold">{b.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BACKGROUND COLORS PANEL - 10 Basic + 10 Gradients + 60+ Extended */}
          <AnimatePresence>
            {showBgPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: 20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="bg-[#1a1a2e] rounded-2xl p-3 border border-white/10">
                  {/* Basic Backgrounds */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">Basic Backgrounds</p>
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {BASIC_COLORS.map((c) => (
                      <motion.button
                        key={c.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setBgColor(c.hex)}
                        className={cn(
                          "w-10 h-10 rounded-full flex-shrink-0 transition-all border-2 shadow-lg",
                          bgColor === c.hex
                            ? "border-white scale-110 shadow-xl"
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Gradient Backgrounds */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">Gradient Backgrounds</p>
                  <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                    {GRADIENT_COLORS.map((c) => (
                      <motion.button
                        key={c.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setBgColor(c.hex)}
                        className={cn(
                          "w-10 h-10 rounded-xl flex-shrink-0 transition-all border-2 shadow-lg relative overflow-hidden",
                          bgColor === c.hex 
                            ? "border-white scale-110 shadow-xl" 
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: c.gradient }}
                        title={c.name}
                      />
                    ))}
                  </div>

                  {/* Extended Backgrounds */}
                  <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2 text-center font-medium">More Backgrounds</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {EXTENDED_BG_COLORS.map((bg) => (
                      <motion.button
                        key={bg.hex}
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setBgColor(bg.hex)}
                        className={cn(
                          "w-8 h-8 rounded-full flex-shrink-0 transition-all border-2 shadow-lg relative overflow-hidden",
                          bgColor === bg.hex
                            ? "border-white scale-110 shadow-xl"
                            : "border-transparent opacity-90 hover:opacity-100"
                        )}
                        style={{ background: bg.hex }}
                        title={bg.name}
                      >
                        {bg.category === 'Gradient' && (
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MAIN TOOLBAR - Single Row at Bottom */}
        <div className="flex items-center justify-center gap-1.5 bg-[#1a1a2e]/80 backdrop-blur-xl rounded-2xl p-2 border border-white/10">
          {/* Undo */}
          <ToolbarButton
            onClick={undo}
            disabled={strokes.length === 0}
            icon={<Undo2 className="w-4 h-4" />}
            label="Undo"
          />
          
          {/* Redo */}
          <ToolbarButton
            onClick={redo}
            disabled={redoStack.length === 0}
            icon={<Redo2 className="w-4 h-4" />}
            label="Redo"
          />
          
          {/* Clear */}
          <ToolbarButton
            onClick={clearAll}
            disabled={strokes.length === 0}
            icon={<Trash2 className="w-4 h-4" />}
            label="Clear"
            variant="danger"
          />
          
          <div className="w-px h-7 bg-white/20 mx-1" />
          
          {/* Color Palette Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowColorPanel(!showColorPanel);
              setShowBrushPanel(false);
              setShowBgPanel(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
              showColorPanel 
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" 
                : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Palette className="w-4 h-4" />
            <div 
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ background: color }}
            />
          </motion.button>
          
          {/* Brush Size Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowBrushPanel(!showBrushPanel);
              setShowColorPanel(false);
              setShowBgPanel(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
              showBrushPanel 
                ? "bg-white text-black shadow-lg" 
                : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Paintbrush className="w-4 h-4" />
            <div 
              className="rounded-full bg-current"
              style={{ width: Math.min(baseWidth, 12), height: Math.min(baseWidth, 12) }}
            />
          </motion.button>
          
          {/* Background Color Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowBgPanel(!showBgPanel);
              setShowColorPanel(false);
              setShowBrushPanel(false);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
              showBgPanel 
                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" 
                : "bg-white/10 text-white hover:bg-white/20"
            )}
          >
            <Droplets className="w-4 h-4" />
            <div 
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ background: bgColor }}
            />
          </motion.button>
        </div>

        {/* Mood Selector */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {(Object.keys(MOOD_CONFIG) as MoodType[]).map((m) => (
            <motion.button
              key={m}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMood(m)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all",
                mood === m
                  ? "bg-white text-black shadow-md"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              )}
            >
              {MOOD_CONFIG[m].label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* AI ASSIST - Floating Chips */}
      <AnimatePresence>
        {showAIAssist && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-36 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
          >
            <div className="flex items-center gap-2 pointer-events-auto">
              {AI_SUGGESTIONS.slice(0, 2).map((suggestion) => (
                <motion.button
                  key={suggestion.id}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    toast.success(`${suggestion.action} applied!`);
                    setShowAIAssist(false);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium text-white",
                    "bg-gradient-to-r shadow-lg",
                    suggestion.gradient
                  )}
                >
                  {suggestion.icon}
                  {suggestion.action}
                </motion.button>
              ))}
              <button
                onClick={() => setAiAssistEnabled(false)}
                className="px-3 py-2 text-xs text-white/40 hover:text-white/60"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPORT MENU */}
      <AnimatePresence>
        {showExportMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowExportMenu(false)}
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0a0f1e] rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6" />
              
              <h3 className="text-white font-semibold text-lg mb-1">Share Your Creation</h3>
              <p className="text-white/50 text-sm mb-6">Choose where to use this drawing</p>

              <div className="grid grid-cols-2 gap-3">
                <ExportButton
                  icon={<Heart className="w-5 h-5" />}
                  label="Use as Story"
                  desc="Share with followers"
                  gradient="from-red-500 to-pink-500"
                  onClick={() => exportDrawing('story')}
                />
                <ExportButton
                  icon={<Share2 className="w-5 h-5" />}
                  label="Add to Post"
                  desc="Feed or marketplace"
                  gradient="from-blue-500 to-cyan-500"
                  onClick={() => exportDrawing('post')}
                />
                <ExportButton
                  icon={<MessageSquare className="w-5 h-5" />}
                  label="Send in Chat"
                  desc="Message a friend"
                  gradient="from-purple-500 to-pink-500"
                  onClick={() => exportDrawing('chat')}
                />
                <ExportButton
                  icon={<Bookmark className="w-5 h-5" />}
                  label="Save Privately"
                  desc="Keep for yourself"
                  gradient="from-amber-500 to-orange-500"
                  onClick={() => exportDrawing('private')}
                />
              </div>

              <button
                onClick={() => setShowExportMenu(false)}
                className="w-full mt-4 py-3 text-sm text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ SUB COMPONENTS ============
function ToolbarButton({
  onClick,
  disabled,
  icon,
  label,
  variant = 'default',
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
        disabled 
          ? "opacity-30 cursor-not-allowed" 
          : "hover:bg-white/10 active:scale-95",
        variant === 'danger' && !disabled && "hover:bg-red-500/20"
      )}
    >
      <span className={cn(
        "text-white/80",
        variant === 'danger' && "text-red-400"
      )}>
        {icon}
      </span>
      <span className="text-[10px] text-white/40">{label}</span>
    </button>
  );
}

function ExportButton({
  icon,
  label,
  desc,
  gradient,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl",
        "bg-gradient-to-br text-white transition-shadow hover:shadow-lg",
        gradient
      )}
    >
      <div className="p-2 rounded-full bg-white/20">{icon}</div>
      <div className="text-center">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs opacity-80">{desc}</div>
      </div>
    </motion.button>
  );
}

export default ExpressiveCanvas;
