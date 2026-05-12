import { useState, useCallback } from 'react';
import { Code, MessageCircle, Share2, Bookmark, Heart, Upload, Filter } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function FunPun() {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'liked' | 'saved' | 'commented' | 'yours'>('all');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const { profile } = useAuth();

  const avatar = profile?.avatar || profile?.photo_url || '/lumatha-logo-new.png';

  const openPlayer = useCallback(() => setShowPlayer(true), []);
  const closePlayer = useCallback(() => setShowPlayer(false), []);
  const toggleLike = useCallback(() => {
    if (isLiked) {
      setLikesCount(c => Math.max(0, c - 1));
    } else {
      setLikesCount(c => c + 1);
    }
    setIsLiked(!isLiked);
  }, [isLiked]);
  const toggleSave = useCallback(() => setIsSaved(!isSaved), [isSaved]);
  const handlePublish = useCallback(() => {
    if (!projectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    toast.success('Project published!');
    setShowUploadModal(false);
    setProjectName('');
    setProjectDesc('');
  }, [projectName]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0a0f1e] to-[#0f1424] text-white p-6 flex flex-col items-center">
      <header className="w-full max-w-4xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-gradient-to-br from-slate-800 to-slate-700">
            <Code className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AB Dev</h1>
            <p className="text-sm text-muted-foreground mt-1">Ambitious Beginner Developer is a place where you can see developer projects and able to upload yours too with sharing your idea for some suggestion.</p>
          </div>
        </div>
      </header>

      <div className="w-full max-w-4xl flex items-start gap-4 mb-6">
        <div className="flex-shrink-0">
          <Avatar>
            <AvatarImage src={avatar} alt="profile" />
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1">
          <input
            placeholder="Search projects..."
            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500"
            aria-label="search-abdev"
          />
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold gap-2">
          <Upload className="w-4 h-4" />
          Upload
        </Button>
      </div>

      <div className="w-full max-w-4xl mb-6 flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'liked', 'saved', 'commented', 'yours'].map(f => (
            <button
              key={f}
              onClick={() => setFilterActive(f as any)}
              className={`px-3 py-1 rounded-full text-sm capitalize transition ${
                filterActive === f
                  ? 'bg-cyan-500 text-black font-semibold'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-4xl">
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatar} />
                <AvatarFallback>FP</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">FunPun</h3>
                <p className="text-xs text-muted-foreground">Default Project • AB Dev</p>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">FunPun is a single member project inside AB Dev — a playground for ambitious beginner developers to try projects. Tap Launch to open the game in full-screen.</p>
          </div>
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={toggleLike} className={`flex items-center gap-1 transition ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500' : ''}`} />
                <span className="text-xs">{likesCount}</span>
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-cyan-500 transition">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{commentsCount}</span>
              </button>
              <button className="flex items-center gap-1 text-muted-foreground hover:text-cyan-500 transition">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={toggleSave} className={`transition ${isSaved ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}>
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500' : ''}`} />
              </button>
            </div>
            <Button onClick={openPlayer} size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Launch</Button>
          </div>
        </div>
      </div>

      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="bg-[#0a0f1e] border-white/10">
          <DialogHeader>
            <DialogTitle>Upload New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold">Project Name</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Description</label>
              <textarea
                value={projectDesc}
                onChange={e => setProjectDesc(e.target.value)}
                placeholder="Describe your project"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 mt-1 placeholder:text-muted-foreground focus:outline-none h-20 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Project File</label>
              <input type="file" className="w-full text-sm mt-1" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={handlePublish} className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">Publish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
