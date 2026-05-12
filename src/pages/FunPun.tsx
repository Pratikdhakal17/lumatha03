import { useState, useCallback } from 'react';
import { Code } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function FunPun() {
  const [showPlayer, setShowPlayer] = useState(false);
  const { profile } = useAuth();

  const avatar = profile?.avatar || profile?.photo_url || '/lumatha-logo-new.png';

  const openPlayer = useCallback(() => setShowPlayer(true), []);
  const closePlayer = useCallback(() => setShowPlayer(false), []);

  return (
    <div className="w-full min-h-screen bg-[#0a0f1e] text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-3xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
            <Code className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AB Dev</h1>
          </div>
        </div>
      </header>

      <div className="w-full max-w-3xl bg-[#071023] rounded-xl p-6 flex flex-col items-center gap-4">
        <img src={avatar} alt="profile" className="w-20 h-20 rounded-full object-cover border-2 border-white/10" />

        <div className="w-full">
          <input
            placeholder="Search AB Dev..."
            className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 placeholder:text-muted-foreground focus:outline-none"
            aria-label="search-abdev"
          />
        </div>

        <div className="w-full text-center">
          <h2 className="text-lg font-semibold">AB Dev — Retro Console</h2>
          <p className="text-sm text-muted-foreground mt-1">One place for classic browser games. Tap Launch to open the player in a full-screen view.</p>
        </div>

        <div className="w-full flex justify-center">
          <button onClick={openPlayer} className="px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Launch</button>
        </div>
      </div>

      {showPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
          <div className="flex items-center justify-between p-3">
            <div />
            <button onClick={closePlayer} className="text-white text-sm bg-white/10 px-3 py-1 rounded">Close</button>
          </div>
          <div className="flex-1">
            <iframe title="AB Dev Player" src="/funpun.html" className="w-full h-full border-none" />
          </div>
        </div>
      )}
    </div>
  );
}
