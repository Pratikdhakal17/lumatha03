import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Pencil, Eraser, Trash2, Delete } from 'lucide-react';
import { DrawingBlockData } from '../../types';
import { cn } from '@/lib/utils';

interface DrawingBlockProps {
  content: DrawingBlockData;
  onChange: (data: DrawingBlockData) => void;
  isFocused?: boolean;
  color?: string;
  brushSize?: number;
}

export const DrawingBlock: React.FC<DrawingBlockProps> = ({ 
  content, onChange, isFocused, color = '#FFFFFF', brushSize = 4 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState(content?.paths || []);
  const [isEraser, setIsEraser] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [showEraserOptions, setShowEraserOptions] = useState(false);
  const [freeDrawMode, setFreeDrawMode] = useState(true); // Free drawing like Instagram

  const redraw = (ctx: CanvasRenderingContext2D, pathsToDraw: any[]) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    pathsToDraw.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      // Quadratic Bezier Smoothing for "Proper" Hand Feel
      for (let i = 1; i < path.points.length - 2; i++) {
        const xc = (path.points[i].x + path.points[i + 1].x) / 2;
        const yc = (path.points[i].y + path.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
      }
      
      // Connect last two points
      if (path.points.length > 2) {
        ctx.quadraticCurveTo(
          path.points[path.points.length - 2].x,
          path.points[path.points.length - 2].y,
          path.points[path.points.length - 1].x,
          path.points[path.points.length - 1].y
        );
      }
      
      ctx.stroke();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    redraw(ctx, paths);
  }, [paths]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isFocused && !freeDrawMode) return;
    setIsDrawing(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (isEraser) {
      // Erase mode - remove paths near this point
      eraseAtPoint(x, y);
    } else {
      // Draw mode - add new path
      setPaths([...paths, { points: [{ x, y }], color, width: brushSize, opacity: 1 }]);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if (!isFocused && !freeDrawMode) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (isEraser) {
      // Continuous erase while dragging
      eraseAtPoint(x, y);
    } else {
      const newPaths = [...paths];
      const currentPath = newPaths[newPaths.length - 1];
      if (currentPath) {
        currentPath.points.push({ x, y });
        setPaths(newPaths);
      }
    }
  };

  // Erase paths near a point
  const eraseAtPoint = (x: number, y: number) => {
    const eraseRadius = eraserSize / 2;
    const newPaths = paths.filter(path => {
      // Keep paths that don't have any point near the erase point
      return !path.points.some(point => {
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        return distance < eraseRadius;
      });
    });
    if (newPaths.length !== paths.length) {
      setPaths(newPaths);
      onChange({ paths: newPaths });
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    onChange({ paths });
  };

  return (
    <div className="relative w-full h-[400px] sm:h-[500px]">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
        className={cn(
          "w-full h-full cursor-crosshair touch-none rounded-[40px] transition-all",
          isFocused ? "bg-white/[0.04]" : "bg-transparent"
        )}
      />
      
      {(isFocused || freeDrawMode) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-50"
        >
          {/* Eraser Size Options - Left, Middle, Right sizes */}
          <AnimatePresence>
            {showEraserOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                className="flex items-center gap-2 bg-[#0D1425F2] backdrop-blur-3xl p-2 rounded-[20px] border border-white/10 shadow-2xl"
              >
                <button
                  onClick={() => { setEraserSize(10); setShowEraserOptions(false); }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    eraserSize === 10 ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"
                  )}
                  title="Small"
                >
                  <div className="w-2 h-2 rounded-full bg-current" />
                </button>
                <button
                  onClick={() => { setEraserSize(20); setShowEraserOptions(false); }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    eraserSize === 20 ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"
                  )}
                  title="Medium"
                >
                  <div className="w-3 h-3 rounded-full bg-current" />
                </button>
                <button
                  onClick={() => { setEraserSize(35); setShowEraserOptions(false); }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    eraserSize === 35 ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"
                  )}
                  title="Large"
                >
                  <div className="w-4 h-4 rounded-full bg-current" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Toolbar */}
          <div className="flex items-center gap-2 bg-[#0D1425F2] backdrop-blur-3xl p-2 rounded-[24px] border border-white/10 shadow-2xl">
            {/* Undo */}
            <button 
              onClick={() => { const p = paths.slice(0, -1); setPaths(p); onChange({ paths: p }); }} 
              className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all"
            >
              <Undo2 className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white/10" />

            {/* Pencil/Draw Mode */}
            <button
              onClick={() => { setIsEraser(false); setShowEraserOptions(false); }}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all",
                !isEraser ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"
              )}
              title="Draw"
            >
              <Pencil className="w-5 h-5" />
            </button>

            {/* Eraser/Delete Mode with size options */}
            <button
              onClick={() => { 
                setIsEraser(!isEraser); 
                if (!isEraser) setShowEraserOptions(true);
                else setShowEraserOptions(false);
              }}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative",
                isEraser ? "bg-white/20 text-white" : "text-white/40 hover:bg-white/10"
              )}
              title="Eraser"
            >
              <Delete className="w-5 h-5" />
              {isEraser && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center text-[8px] font-bold">
                  {eraserSize < 15 ? 'S' : eraserSize < 30 ? 'M' : 'L'}
                </span>
              )}
            </button>

            {/* Clear All */}
            <button
              onClick={() => { setPaths([]); onChange({ paths: [] }); }}
              className="w-10 h-10 flex items-center justify-center hover:bg-red-500/20 rounded-xl text-white/40 hover:text-red-400 transition-all"
              title="Clear All"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white/10" />

            {/* Brush Info */}
            <div className="flex items-center gap-3 px-3">
              <div 
                className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                style={{ backgroundColor: isEraser ? 'transparent' : color, border: isEraser ? '2px solid rgba(255,255,255,0.3)' : 'none' }} 
              />
              <span className="text-[11px] font-black text-white/60 tracking-widest">
                {isEraser ? `${eraserSize}ER` : `${brushSize}PX`}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
