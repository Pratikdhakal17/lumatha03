import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/* ─── Types ─── */
type SuggestionUser = { id: string; name: string; avatar_url?: string | null };
type TodoItem = { id: string; text: string; done: boolean };
type DocItem = { id: string; title: string };
type MarketItem = { id: string; name: string; image?: string };
type AdventureTask = { id: number; text: string; done: boolean; xp: number; tags: string[] };

/* ─── Constants ─── */
const SIDEBAR_ITEMS = [
  { name: 'Home', icon: '🏠', path: '/' },
  { name: 'Adventure', icon: '🏔', path: '/music-adventure' },
  { name: 'Manage', icon: '⚙️', path: '/manage' },
  { name: 'Learn', icon: '📚', path: '/education' },
  { name: 'Random', icon: '🎲', path: '/random-connect' },
  { name: 'Settings', icon: '🔧', path: '/settings' },
  { name: 'Messages', icon: '💬', path: '/chat' },
  { name: 'Market', icon: '🛒', path: '/marketplace' },
  { name: 'Fun', icon: '🎮', path: '/music-adventure' },
];

const ADVENTURE_TASKS_DEFAULT: AdventureTask[] = [
  { id: 1, text: 'Back-to-back 20 push-ups', done: true, xp: 25, tags: ['Body', 'Daily'] },
  { id: 2, text: 'Run 1 km inside 7 minutes', done: true, xp: 25, tags: ['Health', 'Daily'] },
  { id: 3, text: 'Reduce sugar intake today', done: true, xp: 25, tags: ['Health'] },
  { id: 4, text: 'Draw a mandala mindfully', done: false, xp: 30, tags: ['Mind', 'Daily'] },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  1. DIARY CARD                                                              */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function DiaryCard() {
  const navigate = useNavigate();
  return (
    <div className="w-full mb-4">
      <div className="slabel">1 — private diary</div>
      <div className="s1 active:scale-95 transition-transform touch-manipulation" onClick={() => navigate('/diary')}>
        <div className="lockbox"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="3"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div style={{flex: 1, minWidth: 0}}>
          <div className="s1t1">Your private diary posts</div>
          <div className="s1t2">A personal space only you can see — write freely</div>
        </div>
        <span className="s1badge">Private</span>
        <div className="s1arr"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  2. SUGGESTIONS                                                             */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function SuggestionsSection({
  users,
  followingSet,
  onToggleFollow,
}: {
  users: SuggestionUser[];
  followingSet: Set<string>;
  onToggleFollow: (id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="w-full mb-4">
      <div className="slabel">2 — suggestions &amp; find friends</div>
      <div className="s2">
        <div className="s2head">
          <span className="s2h1">Suggestions for you</span>
          <span className="s2sep"> / </span>
          <span className="s2h2">Find friends</span>
          <button className="seeall" onClick={() => navigate('/search')}>See all</button>
        </div>
        <div className="urow">
          {users.map((user, idx) => {
            const followed = followingSet.has(user.id);
            const initials = user.name.substring(0, 2).toUpperCase() || 'XX';
            const bgGradients = [
              'linear-gradient(135deg,#4c1d95,#7c3aed)',
              'linear-gradient(135deg,#0c447c,#378add)',
              'linear-gradient(135deg,#085041,#1d9e75)',
              'linear-gradient(135deg,#712b13,#d85a30)',
              'linear-gradient(135deg,#633806,#ef9f27)'
            ];
            const bgGrad = bgGradients[idx % bgGradients.length];

            return (
              <div key={user.id} className="ucard" onClick={() => navigate(`/profile/${user.id}`)}>
                <div className="av-wrap">
                  <Avatar className="av">
                    <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback style={{ background: bgGrad }}>{initials}</AvatarFallback>
                  </Avatar>
                  {idx % 2 === 0 && <div className="av-online"></div>}
                </div>
                <div className="uname">{user.name}</div>
                <button
                  className={`fbtn ${followed ? 'ing' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleFollow(user.id); }}
                >
                  {followed ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
          <div className="slide-hint"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  3. TODO                                                                    */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function TodoSection({
  tasks,
  onToggle,
}: {
  tasks: TodoItem[];
  onToggle: (id: string) => void;
}) {
  const navigate = useNavigate();
  const doneCount = tasks.filter(t => t.done).length;
  const total = tasks.length || 1; 
  const progress = Math.round((doneCount / total) * 100);

  return (
    <div className="w-full mb-4">
      <div className="slabel">3 — to-do list</div>
      <div className="s3">
        <div className="s3head">
          <span className="todotab">To-Do</span>
          <div className="s3right">
            <span className="streak-badge">{doneCount} / {tasks.length} done</span>
            <span className="s3sub">Organise your time</span>
          </div>
        </div>
        <div className="pb-wrap">
          <div className="pb-row"><span className="pb-label">Daily progress</span><span className="pb-val">{progress}%</span></div>
          <div className="pb-track"><div className="pb-fill" style={{ width: `${progress}%` }}></div></div>
        </div>
        
        {tasks.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4 text-center">No tasks remaining for today.</p>
        ) : (
          tasks.slice(0, 4).map(task => (
             <div key={task.id} className="titem active:scale-95 transition-transform touch-manipulation" onClick={() => onToggle(task.id)}>
               <div className={`chkbtn ${task.done ? 'done' : ''}`}>
                 {task.done && <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
               </div>
               <span className={`ttitle ${task.done ? 'done' : ''}`}>{task.text}</span>
               <div className="tright" onClick={e => e.stopPropagation()}>
                 <div className="tagibtn"><svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
                 {/* Delete is visual only for demo in widget, functionally handled in education page */}
                 <div className="tagibtn del"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></div>
               </div>
             </div>
          ))
        )}
        {tasks.length > 4 && (
          <button className="seemore" onClick={() => navigate('/education')}>See more tasks</button>
        )}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  4. NOTES                                                                   */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function NotesCards() {
  const navigate = useNavigate();
  const [btnText1, setBtnText1] = useState('+ Add a quick note');
  const [btnText2, setBtnText2] = useState('+ Add a quick note');

  const onAddNote1 = () => {
    setBtnText1('Saved!');
    setTimeout(() => setBtnText1('+ Add a quick note'), 1600);
  };

  const onAddNote2 = () => {
    setBtnText2('Saved!');
    setTimeout(() => setBtnText2('+ Add a quick note'), 1600);
  };

  return (
    <div className="w-full mb-4">
      <div className="slabel">4 — keep notes</div>
      <div className="s4">
        <div className="s4col">
          <div className="s4t"><svg viewBox="0 0 24 24" style={{stroke: '#a78bfa'}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Keep Notes</div>
          <div className="s4buls">
            <div className="s4bul"><div className="s4dot"></div><span>Sticky notes on Lumatha</span></div>
            <div className="s4bul"><div className="s4dot"></div><span>Save your important thoughts</span></div>
          </div>
          <button className={`notebtn ${btnText1 === 'Saved!' ? 'ok' : ''}`} onClick={onAddNote1}>{btnText1}</button>
        </div>
        <div className="s4col">
          <div className="s4t"><svg viewBox="0 0 24 24" style={{stroke: '#34d399'}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Why Notes?</div>
          <div className="s4buls">
            <div className="s4bul"><div className="s4dot" style={{background: '#065f46'}}></div><span>Save dates and timings</span></div>
            <div className="s4bul"><div className="s4dot" style={{background: '#065f46'}}></div><span>Manage long to-do lists</span></div>
            <div className="s4bul"><div className="s4dot" style={{background: '#065f46'}}></div><span>Capture thoughts instantly</span></div>
          </div>
          <button className={`notebtn ${btnText2 === 'Saved!' ? 'ok' : ''}`} style={btnText2 !== 'Saved!' ? {color: '#86efac', borderColor: '#22c55e40', background: '#0a1f0e'} : {}} onClick={onAddNote2}>{btnText2}</button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  5. DOCUMENTS / LEARN                                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function DocumentsSection({ docs }: { docs: DocItem[] }) {
  const navigate = useNavigate();
  return (
    <div className="w-full mb-4">
      <div className="slabel">5 — Docs</div>
      <div className="s5">
        <div className="s5top">
          <div className="doctab"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Documents</div>
          <span className="s5sub">Start learning today</span>
        </div>
        <div className="s5tag">Give your future the time it deserves — learn instead of scroll.</div>
        <div className="docrow">
          {docs.length === 0 ? (
            <div className="dcard" onClick={() => navigate('/education')}>
               <div className="dctop"><div className="dcavr"><div className="dcav" style={{background: 'linear-gradient(135deg, #4c1d95, #7c3aed)'}}>LM</div><span className="dcusr">Lumatha</span></div></div>
               <span className="dcbadge pdf">PDF</span>
               <div className="dctitle">Start learning!</div>
               <div className="dcmore">... see more</div>
            </div>
          ) : (
            docs.map((doc, idx) => (
              <div key={doc.id} className="dcard" onClick={() => navigate('/education')}>
                <div className="dctop">
                  <div className="dcavr">
                    <div className="dcav" style={{background: idx % 2 === 0 ? 'linear-gradient(135deg,#4c1d95,#7c3aed)' : 'linear-gradient(135deg,#0c447c,#378add)'}}>DC</div>
                    <span className="dcusr">User</span>
                  </div>
                  <div className="dcdots"><div className="dcdot"></div><div className="dcdot"></div><div className="dcdot"></div></div>
                </div>
                <span className={`dcbadge ${idx % 2 === 0 ? 'pdf' : 'doc'}`}>{idx % 2 === 0 ? 'PDF' : 'DOC'}</span>
                <div className="dctitle">{doc.title}</div>
                <div className="dcmore">... see more</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  6. SIDEBAR GRID                                                            */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function SidebarGrid() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="w-full mb-4">
      <div className="slabel">6 — sidebar navigation</div>
      <div className="s6trig">
        <div>
          <div className="s6lbl1">Sidebar navigation</div>
          <div className="s6lbl2">Tap hamburger or button to open</div>
        </div>
        <button className="openbtn" onClick={() => setDrawerOpen(true)}>Open sidebar</button>
      </div>

      <div className={`fixed inset-0 z-50 transition-opacity flex ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} style={{background: 'rgba(0,0,0,0.75)'}}>
        <div className={`drawer h-full shadow-xl transition-transform duration-250 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="dhead">
            <div className="dlogorow"><span className="text-xl font-bold text-purple-400">Lumatha</span></div>
            <div className="duser">
               <Avatar className="duav overflow-hidden">
                 <AvatarImage src={profile?.avatar_url || undefined} className="w-full h-full object-cover rounded-full" />
                 <AvatarFallback>ME</AvatarFallback>
               </Avatar>
               <div>
                  <div className="duname">{profile?.name || 'User'}</div>
                  <div className="duhandle">@{profile?.username || 'user'}</div>
               </div>
            </div>
          </div>
          <div className="dgrid">
            <div className="dgi" onClick={() => { navigate('/'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span className="dglbl">Home</span></div>
            <div className="dgi" onClick={() => { navigate('/music-adventure'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg><span className="dglbl">Adventure</span></div>
            <div className="dgi" onClick={() => { navigate('/manage'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span className="dglbl">Manage</span></div>
            <div className="dgi" onClick={() => { navigate('/education'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span className="dglbl">Learn</span></div>
            <div className="dgi" onClick={() => { navigate('/random-connect'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><span className="dglbl">Random Connect</span></div>
            <div className="dgi" onClick={() => { navigate('/settings'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg><span className="dglbl">Settings</span></div>
            <div className="dgi" onClick={() => { navigate('/chat'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span className="dglbl">Messages</span></div>
            <div className="dgi" onClick={() => { navigate('/marketplace'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span className="dglbl">Marketplace</span></div>
            <div className="dgi" onClick={() => { navigate('/music-adventure'); setDrawerOpen(false); }}><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span className="dglbl">FunPun</span></div>
          </div>
          <div className="dfoot">
import { safeSignOut } from '@/lib/supabaseAuth';
            <div className="dlogout" onClick={() => { safeSignOut().finally(() => navigate('/auth')); }}><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Log out</div>
          </div>
        </div>
        <div className="dpane" onClick={() => setDrawerOpen(false)}></div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  7. PUBLIC DIARY                                                            */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function PublicDiaryCard() {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(24);

  const toggleLike = () => {
    setLiked(prev => {
      const next = !prev;
      setCount(c => (next ? c + 1 : Math.max(0, c - 1)));
      return next;
    });
  };

  return (
    <div className="w-full mb-4">
      <div className="slabel">7 — public diary post</div>
      <div className="mx-3 rounded-2xl border border-[#1e2d45] bg-[#0d1625] px-4 py-4">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-[#4c1d9550] bg-[#1c1040] px-2 py-1 text-[8px] font-bold text-[#c4b5fd]">
          Public Diary
        </div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-xs font-bold text-white flex items-center justify-center">PD</div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#e8edf5]">Pratik Dhakal</div>
            <div className="text-[9px] text-[#3d5473]">@pratik_03 · 2h ago</div>
          </div>
          <div className="rounded-full border border-[#22c55e25] bg-[#0a1f0e] px-2 py-1 text-[8px] font-bold text-[#86efac]">Writing</div>
        </div>
        <div className="mb-3 rounded-lg border-l-2 border-[#7c3aed] bg-[#080e1a] px-3 py-2 text-[11px] italic leading-relaxed text-[#c9d8e8]">
          "Today I realised that slowing down is not the same as giving up. Sometimes a quiet moment is the loudest kind of progress..."
        </div>
        <div className="flex items-center gap-2 border-t border-[#111c2e] pt-2">
          <button
            className={`rounded-md px-2 py-1 text-[10px] font-medium ${liked ? 'text-[#f87171]' : 'text-[#4d6280]'} hover:bg-[#111c2e]`}
            onClick={toggleLike}
          >
            {liked ? '❤' : '♡'} {count}
          </button>
          <button className="rounded-md px-2 py-1 text-[10px] font-medium text-[#4d6280] hover:bg-[#111c2e]">💬 8</button>
          <button className="rounded-md px-2 py-1 text-[10px] font-medium text-[#4d6280] hover:bg-[#111c2e]">↗</button>
          <button className="ml-auto rounded-lg bg-gradient-to-br from-[#5b21b6] to-[#7c3aed] px-3 py-1 text-[10px] font-bold text-white">+ Write yours</button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  8. RANDOM CONNECT                                                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function RandomConnectCard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'text' | 'audio' | 'video'>('text');

  return (
    <div className="w-full mb-4">
      <div className="slabel">8 — random connect</div>
      <div className="mx-3 overflow-hidden rounded-2xl border border-[#1e3a5a]">
        <div className="bg-[#0f0a2e] px-4 py-4">
          <div className="mb-1 text-[8px] font-bold uppercase tracking-wider text-[#a78bfa]">Random Connect</div>
          <div className="mb-1 text-sm font-bold text-[#e8edf5]">Want to build a real connection?</div>
          <div className="mb-3 text-[10px] leading-relaxed text-[#8fa3c0]">Feeling lonely or anxious? Connect worldwide and share feelings anonymously.</div>
          <button
            onClick={() => navigate('/random-connect')}
            className="rounded-lg bg-gradient-to-br from-[#5b21b6] to-[#7c3aed] px-3 py-2 text-[11px] font-bold text-white"
          >
            Try Random Connect
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md border border-[#4c1d9540] bg-[#1c1040] px-2 py-1 text-[9px] font-semibold text-[#c4b5fd]">Be happy</span>
            <span className="rounded-md border border-[#4c1d9540] bg-[#1c1040] px-2 py-1 text-[9px] font-semibold text-[#c4b5fd]">Be sociable</span>
            <span className="rounded-md border border-[#4c1d9540] bg-[#1c1040] px-2 py-1 text-[9px] font-semibold text-[#c4b5fd]">Boost confidence</span>
          </div>
        </div>
        <div className="border-t border-[#1e2d45] bg-[#080e1a] px-3 py-2 text-[9px] text-[#3d5473]">Anonymous · Auto-deletes in 24h · No screenshots</div>
        <div className="flex gap-2 border-t border-[#111c2e] bg-[#080e1a] px-3 py-3">
          <button className={`flex-1 rounded-md border px-2 py-2 text-[9px] font-bold ${mode === 'text' ? 'border-[#7c3aed] bg-[#1c1040] text-[#c4b5fd]' : 'border-[#1e2d45] bg-[#0d1625] text-[#6b7fa0]'}`} onClick={() => setMode('text')}>Text</button>
          <button className={`flex-1 rounded-md border px-2 py-2 text-[9px] font-bold ${mode === 'audio' ? 'border-[#7c3aed] bg-[#1c1040] text-[#c4b5fd]' : 'border-[#1e2d45] bg-[#0d1625] text-[#6b7fa0]'}`} onClick={() => setMode('audio')}>Audio</button>
          <button className={`flex-1 rounded-md border px-2 py-2 text-[9px] font-bold ${mode === 'video' ? 'border-[#7c3aed] bg-[#1c1040] text-[#c4b5fd]' : 'border-[#1e2d45] bg-[#0d1625] text-[#6b7fa0]'}`} onClick={() => setMode('video')}>Video</button>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  9. SAVED & LIKED                                                           */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function SavedLikedCards({ likedCount, savedCount }: { likedCount: number; savedCount: number }) {
  const navigate = useNavigate();
  return (
    <div className="w-full mb-4">
      <div className="slabel">9 — liked &amp; saved posts</div>
      <div className="mx-3 overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#0d1625]">
        <div className="border-b border-[#111c2e] px-4 py-3 text-[11px] font-bold text-[#e8edf5]">Your saved moments</div>
        <div className="cursor-pointer border-b border-[#111c2e] px-4 py-3 hover:bg-[#111c2e]" onClick={() => navigate('/liked')}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-[#be185d28] bg-[#2a0d20] text-[#f9a8d4] flex items-center justify-center">❤</div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#d1dce8]">Posts you liked</div>
              <div className="text-[9px] text-[#3d5473]">Revisit content that resonated with you</div>
            </div>
            <div className="rounded-full border border-[#be185d28] bg-[#2a0d20] px-2 py-1 text-[10px] font-bold text-[#f9a8d4]">{likedCount}</div>
          </div>
        </div>
        <div className="cursor-pointer px-4 py-3 hover:bg-[#111c2e]" onClick={() => navigate('/saved')}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-[#1d4ed828] bg-[#0d1e2e] text-[#93c5fd] flex items-center justify-center">🔖</div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[#d1dce8]">Posts you saved</div>
              <div className="text-[9px] text-[#3d5473]">Bookmarked content to revisit later</div>
            </div>
            <div className="rounded-full border border-[#1d4ed828] bg-[#0d1e2e] px-2 py-1 text-[10px] font-bold text-[#93c5fd]">{savedCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  10. ADVENTURE                                                              */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function AdventureSection({
  tasks,
  onToggle,
}: {
  tasks: AdventureTask[];
  onToggle: (id: number) => void;
}) {
  const navigate = useNavigate();
  const xp = tasks.filter(t => t.done).reduce((sum, task) => sum + task.xp, 0);

  return (
    <div className="w-full mb-4">
      <div className="slabel">10 — adventure challenges</div>
      <div className="mx-3 rounded-2xl border border-[#1e2d45] bg-[#0d1625] px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-gradient-to-br from-[#064e3b] to-[#059669] px-3 py-1 text-[11px] font-bold text-white">Adventure</div>
          <div className="rounded-full border border-[#f59e0b28] bg-[#1a1200] px-2 py-1 text-[10px] font-bold text-[#fbbf24]">+{xp} XP earned</div>
        </div>
        <div className="mb-3 rounded-md border border-[#05966928] bg-[#022c22] px-2 py-2 text-[10px] text-[#6ee7b7]">Feeling bored? Complete a challenge and climb the ranks.</div>
        <div className="space-y-1">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 border-b border-[#111c2e] py-2 last:border-b-0">
              <button
                className={`h-7 w-7 shrink-0 rounded-full border shadow-sm transition-all active:scale-90 touch-manipulation flex items-center justify-center ${t.done ? 'border-[#059669] bg-gradient-to-br from-[#064e3b] to-[#059669] text-white' : 'border-[#2a3d55] bg-transparent text-transparent hover:border-[#059669]'}`}
                onClick={() => onToggle(t.id)}
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] ${t.done ? 'text-[#1e3d2a] line-through' : 'text-[#d1dce8]'}`}>{t.text}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {t.tags.map(tag => (
                    <span key={`${t.id}-${tag}`} className="rounded px-1.5 py-0.5 text-[8px] font-semibold text-[#93c5fd] border border-[#3b82f628] bg-[#0d1e2e]">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] font-bold text-[#fbbf24]">+{t.xp} XP</div>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full rounded-2xl border border-[#05966928] bg-[#022c22] py-2.5 text-[11px] font-bold text-[#6ee7b7] active:scale-95 transition-all touch-manipulation" onClick={() => navigate('/music-adventure')}>
          See all Adventure challenges
        </button>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  10b. EXPLORE PLACES                                                        */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const EXPLORE_PLACES = [
  // NEPAL (6)
  { id: '1', name: 'Mount Everest', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=300&fit=crop', type: 'Adventure' },
  { id: '2', name: 'Pokhara', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1576487503230-b6dc3ad12ded?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '3', name: 'Kathmandu Valley', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ac3?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '4', name: 'Chitwan', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1562602725-0f1bbdf28b21?w=400&h=300&fit=crop', type: 'Wildlife' },
  { id: '5', name: 'Lumbini', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1599999902566-0e9b5d6e5e0e?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '6', name: 'Annapurna', country: 'Nepal', flag: '🇳🇵', image: 'https://images.unsplash.com/photo-1573127959378-3f73bbb08c62?w=400&h=300&fit=crop', type: 'Trekking' },
  // USA (15)
  { id: '7', name: 'Grand Canyon', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '8', name: 'Statue of Liberty', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '9', name: 'Times Square', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '10', name: 'Golden Gate Bridge', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '11', name: 'Yellowstone', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1575351881846-9746ce9f5368?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '12', name: 'Yosemite', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '13', name: 'Las Vegas Strip', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f12d?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '14', name: 'White House', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b64fe?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '15', name: 'Central Park', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1534270804882-6b5048b1c1fc?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '16', name: 'Niagara Falls', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1533094602577-198d3beab8ea?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '17', name: 'Mount Rushmore', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '18', name: 'Disney World', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=400&h=300&fit=crop', type: 'Entertainment' },
  { id: '19', name: 'New Orleans', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '20', name: 'Chicago', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '21', name: 'Miami Beach', country: 'USA', flag: '🇺🇸', image: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=400&h=300&fit=crop', type: 'Beach' },
  // FRANCE (12)
  { id: '22', name: 'Eiffel Tower', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce7859?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '23', name: 'Louvre Museum', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1565099824688-e93eb20fe622?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '24', name: 'Mont Saint-Michel', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1565060169194-12d9e3f812a4?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '25', name: 'Versailles', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1597927222685-47023127738b?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '26', name: 'French Riviera', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08b8f7?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '27', name: 'Provence', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1534351590666-13e3e05b13f4?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '28', name: 'Notre Dame', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '29', name: 'Loire Valley', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1564401306267-6d56d4777b5a?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '30', name: 'Bordeaux', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1559565304-1c6855ab3767?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '31', name: 'Lyon', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1531584990052-740cb3dd5d4e?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '32', name: 'Marseille', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '33', name: 'Alsace', country: 'France', flag: '🇫🇷', image: 'https://images.unsplash.com/photo-1478827536114-da1b27c97720?w=400&h=300&fit=crop', type: 'Culture' },
  // ITALY (12)
  { id: '34', name: 'Colosseum', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '35', name: 'Venice Canals', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '36', name: 'Leaning Tower', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1543837173-6c26bc89937b?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '37', name: 'Amalfi Coast', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '38', name: 'Florence', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1543429776-4a9f18717dfc?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '39', name: 'Vatican City', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1531572758067-37271622529c?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '40', name: 'Cinque Terre', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '41', name: 'Milan Cathedral', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1518182170546-0766bc6f9213?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '42', name: 'Lake Como', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '43', name: 'Sicily', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1520190288747-130a5f31ce41?w=400&h=300&fit=crop', type: 'Island' },
  { id: '44', name: 'Rome', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '45', name: 'Tuscany', country: 'Italy', flag: '🇮🇹', image: 'https://images.unsplash.com/photo-1528114039593-43664da1e1af?w=400&h=300&fit=crop', type: 'Nature' },
  // JAPAN (12)
  { id: '46', name: 'Mount Fuji', country: 'Japan', flag: '��🇵', image: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '47', name: 'Tokyo Tower', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '48', name: 'Kyoto Temples', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '49', name: 'Senso-ji', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '50', name: 'Shibuya Crossing', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '51', name: 'Arashiyama', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '52', name: 'Himeji Castle', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '53', name: 'Nara Park', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1570527140771-020891229bb4?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '54', name: 'Osaka Castle', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1590559899731-a3828398c4e9?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '55', name: 'Hiroshima', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '56', name: 'Okinawa', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1570459027562-4bb998f5f4ee?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '57', name: 'Hakone', country: 'Japan', flag: '🇯🇵', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop', type: 'Nature' },
  // UK (12)
  { id: '58', name: 'Big Ben', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '59', name: 'Tower Bridge', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '60', name: 'Stonehenge', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1516306580123-e6e52b1b7b5f?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '61', name: 'Edinburgh Castle', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1506372023823-6c4f7216995f?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '62', name: 'Lake District', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '63', name: 'Buckingham Palace', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1549488348-44f1b38eacf0?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '64', name: 'Oxford', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1558862107-d49ef2a04d72?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '65', name: 'Scottish Highlands', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '66', name: 'Bath', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1534351590666-3e93e4d3f5d1?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '67', name: 'Liverpool', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef09?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '68', name: 'Cambridge', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1562591970-254bc62245c0?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '69', name: 'Windsor Castle', country: 'UK', flag: '🇬🇧', image: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=400&h=300&fit=crop', type: 'Landmark' },
  // SPAIN (10)
  { id: '70', name: 'Sagrada Familia', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1562886812-41775d01179c?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '71', name: 'Alhambra', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1541343672885-840c51f702e5?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '72', name: 'Park Guell', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1562886812-41775d01179c?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '73', name: 'Madrid', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '74', name: 'Ibiza', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '75', name: 'Seville', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1551189014-fe516aed0e9e?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '76', name: 'Valencia', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1509850629767-76f2a07f4810?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '77', name: 'Costa Brava', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '78', name: 'Santiago', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1562886812-41775d01179c?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '79', name: 'Bilbao', country: 'Spain', flag: '🇪🇸', image: 'https://images.unsplash.com/photo-1562886812-41775d01179c?w=400&h=300&fit=crop', type: 'Culture' },
  // GERMANY (10)
  { id: '80', name: 'Neuschwanstein', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4de1e?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '81', name: 'Brandenburg Gate', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '82', name: 'Cologne Cathedral', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1595867419578-165be0f15885?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '83', name: 'Munich', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1598971861713-5c9d142c1394?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '84', name: 'Black Forest', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1516214104703-d8707975b30f?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '85', name: 'Hamburg', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '86', name: 'Heidelberg', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4de1e?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '87', name: 'Bavaria', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1520939817895-060bdaf4de1e?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '88', name: 'Dresden', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1595867419578-165be0f15885?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '89', name: 'Rhine Valley', country: 'Germany', flag: '🇩🇪', image: 'https://images.unsplash.com/photo-1516214104703-d8707975b30f?w=400&h=300&fit=crop', type: 'Nature' },
  // GREECE (8)
  { id: '90', name: 'Acropolis', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '91', name: 'Santorini', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop', type: 'Island' },
  { id: '92', name: 'Mykonos', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=300&fit=crop', type: 'Island' },
  { id: '93', name: 'Delphi', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '94', name: 'Meteora', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '95', name: 'Crete', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop', type: 'Island' },
  { id: '96', name: 'Athens', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '97', name: 'Corfu', country: 'Greece', flag: '🇬🇷', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=300&fit=crop', type: 'Island' },
  // AUSTRALIA (8)
  { id: '98', name: 'Sydney Opera House', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '99', name: 'Great Barrier Reef', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1582967788606-a171f1080ca8?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '100', name: 'Uluru', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1529108190281-9a4f620675e4?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '101', name: 'Melbourne', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '102', name: 'Great Ocean Road', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1529108190281-9a4f620675e4?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '103', name: 'Bondi Beach', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '104', name: 'Whitsundays', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1582967788606-a171f1080ca8?w=400&h=300&fit=crop', type: 'Island' },
  { id: '105', name: 'Tasmania', country: 'Australia', flag: '🇦🇺', image: 'https://images.unsplash.com/photo-1529108190281-9a4f620675e4?w=400&h=300&fit=crop', type: 'Nature' },
  // CHINA (10)
  { id: '106', name: 'Great Wall', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '107', name: 'Forbidden City', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '108', name: 'Terracotta Army', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1564603239526-2b67b4f28b7f?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '109', name: 'Shanghai', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '110', name: 'Guilin', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1537531149057-fd637910f091?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '111', name: 'Hong Kong', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '112', name: 'Zhangjiajie', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1537531149057-fd637910f091?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '113', name: 'Yellow Mountain', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1564603239526-2b67b4f28b7f?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '114', name: 'Potala Palace', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1599571234909-29ed5d1321d6?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '115', name: 'Li River', country: 'China', flag: '🇨🇳', image: 'https://images.unsplash.com/photo-1537531149057-fd637910f091?w=400&h=300&fit=crop', type: 'Nature' },
  // INDIA (12)
  { id: '116', name: 'Taj Mahal', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '117', name: 'Jaipur', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '118', name: 'Varanasi', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '119', name: 'Kerala Backwaters', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1595658658071-2f0576161ecb?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '120', name: 'Goa', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '121', name: 'Mumbai', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '122', name: 'Hampi', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1606293926075-69a192a8d5ca?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '123', name: 'Ladakh', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=300&fit=crop', type: 'Adventure' },
  { id: '124', name: 'Rishikesh', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1595658658071-2f0576161ecb?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '125', name: 'Udaipur', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '126', name: 'Amritsar', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '127', name: 'Delhi', country: 'India', flag: '🇮🇳', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop', type: 'Urban' },
  // THAILAND (8)
  { id: '128', name: 'Bangkok Temples', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '129', name: 'Phuket', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '130', name: 'Chiang Mai', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1598935898639-54b9468540fb?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '131', name: 'Ayutthaya', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '132', name: 'Krabi', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '133', name: 'Ko Samui', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=300&fit=crop', type: 'Island' },
  { id: '134', name: 'Pattaya', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '135', name: 'Sukhothai', country: 'Thailand', flag: '🇹🇭', image: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400&h=300&fit=crop', type: 'Landmark' },
  // BRAZIL (8)
  { id: '136', name: 'Christ Redeemer', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1619546952912-535e9ec9422a?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '137', name: 'Iguazu Falls', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1565809511426-3e2897f1446d?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '138', name: 'Copacabana', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '139', name: 'Amazon Rainforest', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '140', name: 'Salvador', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '141', name: 'Rio Carnival', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '142', name: 'Pantanal', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=400&h=300&fit=crop', type: 'Wildlife' },
  { id: '143', name: 'Sao Paulo', country: 'Brazil', flag: '🇧🇷', image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=300&fit=crop', type: 'Urban' },
  // MEXICO (8)
  { id: '144', name: 'Chichen Itza', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638151313-982d912f6d12?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '145', name: 'Cancun', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1552074291-ad4df4b2435e?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '146', name: 'Teotihuacan', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638151313-982d912f6d12?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '147', name: 'Mexico City', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '148', name: 'Tulum', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1552074291-ad4df4b2435e?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '149', name: 'Oaxaca', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '150', name: 'Puerto Vallarta', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1552074291-ad4df4b2435e?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '151', name: 'Copper Canyon', country: 'Mexico', flag: '🇲🇽', image: 'https://images.unsplash.com/photo-1518638151313-982d912f6d12?w=400&h=300&fit=crop', type: 'Nature' },
  // EGYPT (6)
  { id: '152', name: 'Pyramids of Giza', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '153', name: 'Luxor Temple', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '154', name: 'Nile River', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1539650116455-251d9a063595?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '155', name: 'Cairo', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '156', name: 'Aswan', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1539650116455-251d9a063595?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '157', name: 'Alexandria', country: 'Egypt', flag: '🇪🇬', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=400&h=300&fit=crop', type: 'Urban' },
  // TURKEY (8)
  { id: '158', name: 'Hagia Sophia', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '159', name: 'Cappadocia', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1641128324972-af3212d0e6e7?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '160', name: 'Blue Mosque', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1541432901044-3715770e8d1a?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '161', name: 'Pamukkale', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1641128324972-af3212d0e6e7?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '162', name: 'Istanbul', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '163', name: 'Ephesus', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '164', name: 'Bodrum', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1641128324972-af3212d0e6e7?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '165', name: 'Antalya', country: 'Turkey', flag: '🇹🇷', image: 'https://images.unsplash.com/photo-1641128324972-af3212d0e6e7?w=400&h=300&fit=crop', type: 'Beach' },
  // DUBAI/UAE (6)
  { id: '166', name: 'Burj Khalifa', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '167', name: 'Palm Jumeirah', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '168', name: 'Dubai Mall', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '169', name: 'Abu Dhabi', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '170', name: 'Sheikh Zayed Mosque', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1541432901044-3715770e8d8a?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '171', name: 'Dubai Marina', country: 'UAE', flag: '🇦🇪', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop', type: 'Urban' },
  // SOUTH KOREA (6)
  { id: '172', name: 'Seoul', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1538669716095-09471c8c6c7a?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '173', name: 'Gyeongbokgung', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '174', name: 'Jeju Island', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1538669716095-09471c8c6c7a?w=400&h=300&fit=crop', type: 'Island' },
  { id: '175', name: 'Busan', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1538669716095-09471c8c6c7a?w=400&h=300&fit=crop', type: 'Coastal' },
  { id: '176', name: 'DMZ', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1548115184-bc6544d06a58?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '177', name: 'Bukhansan', country: 'South Korea', flag: '🇰🇷', image: 'https://images.unsplash.com/photo-1538669716095-09471c8c6c7a?w=400&h=300&fit=crop', type: 'Nature' },
  // NEW ZEALAND (6)
  { id: '178', name: 'Milford Sound', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '179', name: 'Queenstown', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=400&h=300&fit=crop', type: 'Adventure' },
  { id: '180', name: 'Hobbiton', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1507699622177-48857e0e5528?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '181', name: 'Rotorua', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '182', name: 'Auckland', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1507699622177-48857e0e5528?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '183', name: 'Wanaka', country: 'New Zealand', flag: '🇳🇿', image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=400&h=300&fit=crop', type: 'Nature' },
  // CANADA (8)
  { id: '184', name: 'Niagara Falls', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1533094602577-198d3beab8ea?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '185', name: 'Banff', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '186', name: 'CN Tower', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1517090504870-cd406fd94261?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '187', name: 'Vancouver', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1559511260-66a654ae982a?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '188', name: 'Montreal', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1519178555425-50084b782033?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '189', name: 'Lake Louise', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '190', name: 'Jasper', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '191', name: 'Quebec City', country: 'Canada', flag: '🇨🇦', image: 'https://images.unsplash.com/photo-1519178555425-50084b782033?w=400&h=300&fit=crop', type: 'Culture' },
  // PERU (5)
  { id: '192', name: 'Machu Picchu', country: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '193', name: 'Lima', country: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '194', name: 'Cusco', country: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '195', name: 'Nazca Lines', country: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '196', name: 'Lake Titicaca', country: 'Peru', flag: '🇵🇪', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=300&fit=crop', type: 'Nature' },
  // ARGENTINA (5)
  { id: '197', name: 'Buenos Aires', country: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1534134368323-9c59cd491526?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '198', name: 'Patagonia', country: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1518182170546-0766bc6f9213?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '199', name: 'Iguazu Falls', country: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1565809511426-3e2897f1446d?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '200', name: 'Mendoza', country: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1534134368323-9c59cd491526?w=400&h=300&fit=crop', type: 'Nature' },
  { id: '201', name: 'Ushuaia', country: 'Argentina', flag: '🇦🇷', image: 'https://images.unsplash.com/photo-1518182170546-0766bc6f9213?w=400&h=300&fit=crop', type: 'Adventure' },
  // PORTUGAL (5)
  { id: '202', name: 'Lisbon', country: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd81?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '203', name: 'Porto', country: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd81?w=400&h=300&fit=crop', type: 'Culture' },
  { id: '204', name: 'Algarve', country: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1552074291-ad4df4b2435e?w=400&h=300&fit=crop', type: 'Beach' },
  { id: '205', name: 'Sintra', country: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd81?w=400&h=300&fit=crop', type: 'Landmark' },
  { id: '206', name: 'Madeira', country: 'Portugal', flag: '🇵🇹', image: 'https://images.unsplash.com/photo-1552074291-ad4df4b2435e?w=400&h=300&fit=crop', type: 'Island' },
  // INDONESIA (6)
  { id: '207', name: 'Bali', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop', type: 'Island' },
  { id: '208', name: 'Borobudur', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1596401057633-83c8b636bd47?w=400&h=300&fit=crop', type: 'Spiritual' },
  { id: '209', name: 'Jakarta', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1555899434-94d1368acd4e?w=400&h=300&fit=crop', type: 'Urban' },
  { id: '210', name: 'Komodo Island', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1596401057633-83c8b636bd47?w=400&h=300&fit=crop', type: 'Wildlife' },
  { id: '211', name: 'Lombok', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=300&fit=crop', type: 'Island' },
  { id: '212', name: 'Raja Ampat', country: 'Indonesia', flag: '🇮🇩', image: 'https://images.unsplash.com/photo-1596401057633-83c8b636bd47?w=400&h=300&fit=crop', type: 'Nature' },
];

export function ExplorePlacesSection() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const displayPlaces = isExpanded ? EXPLORE_PLACES : EXPLORE_PLACES.slice(0, 15);

  return (
    <div className="w-full mb-4">
      <div className="slabel flex items-center justify-between">
        <span>Explore — discover places</span>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-bold text-[#3b82f6] uppercase tracking-wider hover:underline px-2"
        >
          {isExpanded ? 'Show Less' : 'See All'}
        </button>
      </div>
      <div className="mx-3 rounded-2xl border border-[#1e2d45] bg-[#0d1625] px-4 py-4 transition-all duration-300">
        <div className="mb-2 flex items-center justify-between">
          <div className="rounded-lg bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] px-3 py-1 text-[11px] font-bold text-white">Explore</div>
          <div className="rounded-full border border-[#3b82f628] bg-[#0d1e2e] px-2 py-1 text-[10px] font-bold text-[#60a5fa]">{EXPLORE_PLACES.length} Places</div>
        </div>
        <div className="mb-3 text-[10px] text-[#6b7fa0]">Discover amazing destinations around the world</div>
        
        <div className={cn(
          "gap-2 pb-2 scrollbar-hide transition-all",
          isExpanded ? "grid grid-cols-2 sm:grid-cols-3 max-h-[500px] overflow-y-auto" : "flex overflow-x-auto"
        )}>
          {displayPlaces.map((place) => (
            <button 
              key={place.id}
              onClick={() => navigate('/music-adventure')}
              className={cn(
                "overflow-hidden rounded-xl border border-[#1e2d45] bg-[#111c2e] text-left hover:-translate-y-0.5 transition-all",
                isExpanded ? "w-full" : "shrink-0 w-[120px]"
              )}
            >
              <div className="relative h-[80px]">
                <img src={place.image} className="h-full w-full object-cover" alt={place.name} loading="lazy" />
                <div className="absolute left-1.5 top-1.5 rounded-full border border-[#ffffff22] bg-[#00000066] px-1.5 py-0.5 text-[7px] font-bold text-white">
                  {place.flag} {place.country}
                </div>
                <div className="absolute right-1.5 bottom-1.5 rounded-full border border-[#3b82f644] bg-[#1d4ed866] px-1.5 py-0.5 text-[7px] font-bold text-[#93c5fd]">
                  {place.type}
                </div>
              </div>
              <div className="px-2 py-2">
                <div className="text-[10px] font-bold text-[#d1dce8] truncate">{place.name}</div>
              </div>
            </button>
          ))}
        </div>
        
        {!isExpanded && (
          <button 
            className="mt-2 w-full rounded-2xl border border-[#3b82f628] bg-[#3b82f611] py-2.5 text-[11px] font-bold text-[#60a5fa] active:scale-95 transition-all touch-manipulation" 
            onClick={() => setIsExpanded(true)}
          >
            See all places
          </button>
        )}
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  11. MARKETPLACE                                                            */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function MarketplaceSection({ items }: { items: MarketItem[] }) {
  const navigate = useNavigate();

  const cards = items.length > 0
    ? items.slice(0, 3).map((item, idx) => ({
        id: item.id,
        title: item.name,
        image: item.image,
        badge: idx === 0 ? 'Service' : idx === 1 ? 'Wanted' : 'Job',
      }))
    : [
        { id: 'fallback-1', title: 'Housekeeping', image: '', badge: 'Service' },
        { id: 'fallback-2', title: 'Laptop - HP Elitebook', image: '', badge: 'Wanted' },
        { id: 'fallback-3', title: 'Content Writer', image: '', badge: 'Job' },
      ];

  return (
    <div className="w-full mb-4">
      <div className="slabel">11 — marketplace</div>
      <div className="mx-3 overflow-hidden rounded-2xl border border-[#1e2d45] bg-[#0d1625]">
        <div className="px-4 pt-3">
          <div className="mb-1 inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-[#7c2d12] to-[#ea580c] px-3 py-1 text-[11px] font-bold text-white">Marketplace</div>
          <div className="text-[9px] text-[#4d6280]">Looking to buy/sell or find jobs? Reach your local community.</div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: 'none' }}>
          {cards.map((card, idx) => (
            <div key={card.id} className="w-[136px] shrink-0 overflow-hidden rounded-xl border border-[#1e2d45] bg-[#111c2e] cursor-pointer hover:-translate-y-0.5" onClick={() => navigate('/marketplace')}>
              <div className={`relative h-[76px] ${idx === 0 ? 'bg-[#1a0f00]' : idx === 1 ? 'bg-[#0d1e2e]' : 'bg-[#022c22]'}`}>
                {card.image ? (
                  <img src={card.image} className="h-full w-full object-cover" alt={card.title} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-[#6b7fa0]">{card.badge}</div>
                )}
                <div className="absolute left-1.5 top-1.5 rounded-full border border-[#ffffff22] bg-[#00000044] px-1.5 py-0.5 text-[7px] font-bold text-white">{card.badge}</div>
              </div>
              <div className="px-2 py-2">
                <div className="truncate text-[11px] font-bold text-[#d1dce8]">{card.title}</div>
                <div className="text-[10px] font-bold text-[#fb923c]">Negotiable</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  12. TRAVEL STORIES                                                         */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function SharePostSection() {
  const [postText, setPostText] = useState('');
  const [postType, setPostType] = useState<'Public' | 'Travel story' | 'Thought' | 'Private'>('Public');
  const [visibility, setVisibility] = useState<'Everyone' | 'Friends' | 'Only me'>('Everyone');
  const [mediaAdded, setMediaAdded] = useState(false);

  const sharePost = () => {
    const value = postText.trim();
    if (!value) {
      toast.error('Write something first!');
      return;
    }

    toast.success('Posted!', {
      description: `${postType} post shared for ${visibility}.`,
    });
    setPostText('');
    setMediaAdded(false);
  };

  return (
    <div className="w-full mb-4">
      <div className="slabel">12 — share a post</div>
      <div className="mx-3 rounded-2xl border border-[#1e2d45] bg-[#0d1625] px-4 py-4">
        <div className="mb-3 text-[11px] font-bold text-[#e8edf5]">Share your moment with the world</div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#4c1d95] to-[#7c3aed] text-xs font-bold text-white flex items-center justify-center">PD</div>
          <input
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="What's on your mind, Pratik?"
            className="h-9 flex-1 rounded-lg border border-[#1e2d45] bg-[#111c2e] px-3 text-[11px] text-[#d1dce8] outline-none focus:border-[#7c3aed]"
          />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(['Public', 'Travel story', 'Thought', 'Private'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setPostType(type)}
              className={`rounded-full border px-2 py-1 text-[9px] font-bold ${postType === type ? 'opacity-100' : 'opacity-60'} ${type === 'Public' ? 'border-[#4c1d9550] bg-[#1c1040] text-[#a78bfa]' : type === 'Travel story' ? 'border-[#05966940] bg-[#022c22] text-[#6ee7b7]' : type === 'Thought' ? 'border-[#f59e0b40] bg-[#1a1200] text-[#fbbf24]' : 'border-[#3b82f640] bg-[#0d1e2e] text-[#93c5fd]'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          className={`mb-3 flex h-20 w-full items-center justify-center rounded-xl border-2 border-dashed text-[10px] ${mediaAdded ? 'border-[#22c55e] bg-[#0a1f0e] text-[#86efac]' : 'border-[#1e2d45] bg-[#111c2e] text-[#3d5473] hover:border-[#7c3aed]'}`}
          onClick={() => setMediaAdded(true)}
        >
          {mediaAdded ? 'Photo added ✓' : 'Tap to add photos or videos'}
        </button>

        <div className="mb-3 flex items-center gap-1.5 text-[9px]">
          <span className="mr-1 text-[#3d5473]">Visible to:</span>
          {(['Everyone', 'Friends', 'Only me'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setVisibility(opt)}
              className={`rounded-full border px-2 py-1 ${visibility === opt ? 'border-[#3d5473] bg-[#111c2e] text-[#e8edf5]' : 'border-[#1e2d45] bg-transparent text-[#3d5473]'}`}
            >
              {opt}
            </button>
          ))}
        </div>

        <button className="w-full rounded-lg bg-gradient-to-br from-[#5b21b6] to-[#7c3aed] py-2.5 text-[12px] font-bold text-white" onClick={sharePost}>
          Share post
        </button>
      </div>
    </div>
  );
}

export function usePremiumWidgets() {
  const { user } = useAuth();

  /* ─── State ─── */
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [visibleSuggestions, setVisibleSuggestions] = useState(6);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [adventureTasks, setAdventureTasks] = useState(ADVENTURE_TASKS_DEFAULT);

  /* ─── Fetch data ─── */
  useEffect(() => {
    if (!user?.id) return;

    const fetchSuggestions = async () => {
      const [{ data: profileRows }, { data: followingRows }] = await Promise.all([
        supabase.from('profiles').select('id,name,avatar_url').neq('id', user.id).limit(20),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
      ]);
      setSuggestions(
        (profileRows || []).map((row: any) => ({
          id: row.id,
          name: row.name || 'Explorer',
          avatar_url: row.avatar_url,
        }))
      );
      setFollowingSet(new Set((followingRows || []).map((r: any) => r.following_id)));
    };

    const fetchTodos = async () => {
      const { data } = await supabase.from('todos').select('id,text,completed').eq('user_id', user.id).limit(3);
      setTasks((data || []).map((row: any) => ({ id: row.id, text: row.text || 'Task', done: !!row.completed })));
    };

    const fetchDocs = async () => {
      const { data } = await supabase.from('posts').select('id,title,category').eq('visibility', 'public').limit(4);
      setDocs((data || []).map((row: any) => ({ id: row.id, title: row.title || 'Note' })));
    };

    const fetchMarketplace = async () => {
      const { data } = await supabase.from('marketplace_listings').select('id,title,media_urls').eq('status', 'active').limit(3);
      setMarketItems((data || []).map((row: any) => ({
        id: row.id,
        name: row.title || 'Market Item',
        image: Array.isArray(row.media_urls) ? row.media_urls[0] : undefined,
      })));
    };

    const fetchSavedLikedCounts = async () => {
      const [{ count: liked }, { count: saved }] = await Promise.all([
        supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('saved').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ]);
      setLikedCount(liked || 0);
      setSavedCount(saved || 0);
    };

    void fetchSuggestions();
    void fetchTodos();
    void fetchDocs();
    void fetchMarketplace();
    void fetchSavedLikedCounts();
  }, [user?.id]);

  /* ─── Handlers ─── */
  const toggleFollow = async (id: string) => {
    const isFollowing = followingSet.has(id);
    setFollowingSet(p => { const n = new Set(p); if (isFollowing) n.delete(id); else n.add(id); return n; });
    if (isFollowing) await supabase.from('follows').delete().eq('follower_id', user?.id).eq('following_id', id);
    else await supabase.from('follows').insert({ follower_id: user?.id, following_id: id });
  };

  const toggleTodo = async (id: string) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    setTasks(p => p.map(x => x.id === id ? { ...x, done: !x.done } : x));
    await supabase.from('todos').update({ completed: !t.done }).eq('id', id);
  };

  return {
    suggestions: suggestions.slice(0, visibleSuggestions),
    followingSet,
    toggleFollow,
    tasks,
    toggleTodo,
    docs,
    likedCount,
    savedCount,
    adventureTasks,
    toggleAdventureTask: (id: number) => setAdventureTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t)),
    marketItems
  };
}
