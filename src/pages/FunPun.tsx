import { useState } from 'react';
import { Code } from 'lucide-react';
import { randomChallenges } from '@/data/funpunChallenges';
import { useNavigate } from 'react-router-dom';

export default function FunPun() {
  const [selected, setSelected] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#0a0f1e] text-white p-4">
      <header className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
          <Code className="w-6 h-6 text-cyan-300" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">AB Dev</h1>
          <p className="text-xs text-muted-foreground">Developer playground — tap a card to play</p>
        </div>
        <div className="ml-auto">
          <button className="text-sm text-muted-foreground hover:text-white" onClick={() => navigate(-1)}>Back</button>
        </div>
      </header>

      {!selected && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Retro console card as first option */}
          <div className="bg-[#071023] p-3 rounded-xl cursor-pointer hover:scale-[1.02] transition" onClick={() => { setIsLoading(true); setSelected(-1); }}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">Retro Console</div>
                <div className="text-[11px] text-muted-foreground">Classic FP-333 (iframe)</div>
              </div>
            </div>
          </div>

          {/* Show a few AB Dev challenge cards */}
          {randomChallenges.slice(0, 8).map((c) => (
            <div key={c.id} className="bg-[#071023] p-3 rounded-xl cursor-pointer hover:scale-[1.02] transition" onClick={() => { setSelected(c.id); setIsLoading(true); }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-gradient-to-br from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold">{c.level}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="text-[11px] text-muted-foreground">{c.instruction}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected !== null && (
        <div className="mt-4 w-full h-[70vh] rounded-lg overflow-hidden bg-black border border-white/5">
          <iframe
            title={`AB Dev player ${selected}`}
            src={`/funpun.html${selected > 0 ? `?challenge=${selected}` : ''}`}
            className="w-full h-full border-none"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      )}

      {isLoading && selected !== null && (
        <div className="mt-2 text-xs text-muted-foreground">Loading game…</div>
      )}
    </div>
  );
}
