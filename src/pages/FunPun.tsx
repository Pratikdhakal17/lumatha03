import { useState, useCallback } from 'react';
import { useState, useCallback } from 'react';
import { Code, MessageCircle, Share2, Bookmark } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function FunPun() {
  const [showPlayer, setShowPlayer] = useState(false);
  const { profile } = useAuth();

  const avatar = profile?.avatar || profile?.photo_url || '/lumatha-logo-new.png';

  const openPlayer = useCallback(() => setShowPlayer(true), []);
  const closePlayer = useCallback(() => setShowPlayer(false), []);

  return (
    <div className="w-full min-h-screen bg-[#0a0f1e] text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-3xl flex items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
            <Code className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AB Dev</h1>
          </div>
        </div>
      </header>

      <div className="w-full max-w-3xl flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          <Avatar>
            <AvatarImage src={avatar} alt="profile" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1">
          <input
            placeholder="Search AB Dev..."
            className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 placeholder:text-muted-foreground focus:outline-none"
            aria-label="search-abdev"
          />
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <Card className="bg-[#071023]">
          <CardHeader>
            <h2 className="text-lg font-semibold">FunPun</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">FunPun is a single member project inside AB Dev — a playground for ambitious beginner developers to try projects. Tap Launch to open the game in full-screen.</p>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button aria-label="comment" className="text-muted-foreground hover:text-white"><MessageCircle /></button>
              <button aria-label="share" className="text-muted-foreground hover:text-white"><Share2 /></button>
              <button aria-label="save" className="text-muted-foreground hover:text-white"><Bookmark /></button>
            </div>
            <div>
              <Button onClick={openPlayer} className="bg-cyan-500 hover:bg-cyan-600 text-black">Launch</Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {showPlayer && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          <div className="flex items-center justify-between p-3 max-w-3xl w-full mx-auto">
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
