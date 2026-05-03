import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

/**
 * FunPun Page - Retro Gaming Console
 * Back icon handled by Layout component | Console positioned for full mobile view
 */
export default function FunPun() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0f1e] flex flex-col">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0f1e]">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center mb-4 animate-pulse">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <p className="text-white font-semibold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Loading FunPun...
          </p>
          <p className="text-[#94A3B8] text-sm mt-2">Preparing retro gaming console</p>
        </div>
      )}
      
      {/* Game Console - Optimized mobile positioning */}
      <div className="w-full flex-1 -mt-1 md:mt-0">
        <iframe 
          src="/funpun.html" 
          className="w-full h-full border-none"
          title="FunPun FP-333 Console"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
