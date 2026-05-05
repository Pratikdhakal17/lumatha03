import { useState, useEffect } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ArrowRight, Camera, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const db = supabase as any;

interface GroupChatCreationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated: (groupId: string) => void;
}

const GRADIENT_COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4', '#8B5CF6'];

export function GroupChatCreation({ open, onOpenChange, onGroupCreated }: GroupChatCreationProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setStep(1);
    setSelectedMembers(new Set());
    setGroupName('');
    loadFriends();
  }, [open, user]);

  const loadFriends = async () => {
    if (!user) return;
    const { data } = await db
      .from('friend_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const friendIds = data?.map(f => f.sender_id === user.id ? f.receiver_id : f.sender_id) || [];
    if (friendIds.length === 0) { setFriends([]); return; }

    const { data: profiles } = await db.from('profiles').select('id, name, avatar_url, username').in('id', friendIds);
    setFriends(profiles || []);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const filteredFriends = friends.filter(f =>
    !searchQuery || f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || f.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createGroup = async () => {
    if (!user || !groupName.trim() || selectedMembers.size === 0) return;
    setCreating(true);
    try {
      const { data: group, error } = await db
        .from('chat_groups')
        .insert({ name: groupName.trim(), created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator as admin
      await db.from('chat_group_members').insert({ group_id: group.id, user_id: user.id, role: 'admin' });

      // Add selected members
      const memberInserts = [...selectedMembers].map(uid => ({
        group_id: group.id, user_id: uid, role: 'member'
      }));
      await db.from('chat_group_members').insert(memberInserts);

      toast.success('Group created!');
      onOpenChange(false);
      onGroupCreated(group.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const getGradient = (name: string) => {
    const idx = (name?.charCodeAt(0) || 0) % GRADIENT_COLORS.length;
    const idx2 = (idx + 3) % GRADIENT_COLORS.length;
    return `linear-gradient(135deg, ${GRADIENT_COLORS[idx]}, ${GRADIENT_COLORS[idx2]})`;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-0 focus:outline-none" style={{ background: '#111827', borderRadius: '24px 24px 0 0', maxHeight: '90vh' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#374151' }} />
        </div>

        {step === 1 ? (
          <>
            {/* Step 1: Select Members */}
            <div className="px-5 pt-3 pb-4">
              <h3 className="text-[20px] font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Select Members</h3>
              <p className="text-[13px] mb-4" style={{ color: '#94A3B8' }}>{selectedMembers.size} selected</p>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#4B5563' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full rounded-full pl-11 pr-4 py-3 text-[15px] text-white placeholder:text-[#4B5563] outline-none"
                  style={{ background: '#1e293b', border: '1px solid #1f2937' }}
                />
              </div>
            </div>

            {/* Selected chips */}
            {selectedMembers.size > 0 && (
              <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
                {[...selectedMembers].map(id => {
                  const f = friends.find(x => x.id === id);
                  if (!f) return null;
                  return (
                    <button key={id} onClick={() => toggleMember(id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0"
                      style={{ background: 'rgba(124,58,237,0.15)' }}>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={f.avatar_url} />
                        <AvatarFallback style={{ fontSize: 8, background: '#7C3AED', color: 'white' }}>{f.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] text-white">{f.name?.split(' ')[0]}</span>
                      <X className="w-3 h-3" style={{ color: '#94A3B8' }} />
                    </button>
                  );
                })}
              </div>
            )}

            <ScrollArea style={{ maxHeight: 'calc(90vh - 280px)' }}>
              <div className="px-5 space-y-0.5 pb-20">
                {filteredFriends.map(f => {
                  const selected = selectedMembers.has(f.id);
                  return (
                    <button key={f.id} onClick={() => toggleMember(f.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors hover:bg-white/[0.03]">
                      <Avatar className="w-11 h-11">
                        <AvatarImage src={f.avatar_url} />
                        <AvatarFallback style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', fontSize: 14 }}>{f.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-[15px] font-medium text-white truncate">{f.name}</p>
                        {f.username && <p className="text-[12px]" style={{ color: '#4B5563' }}>@{f.username}</p>}
                      </div>
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all", selected ? '' : 'border-2')}
                        style={selected ? { background: '#7C3AED' } : { borderColor: '#374151' }}>
                        {selected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
                {filteredFriends.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-[14px]" style={{ color: '#4B5563' }}>No friends found</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Next button */}
            {selectedMembers.size > 0 && (
              <div className="absolute bottom-6 right-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-semibold text-white shadow-lg transition-transform hover:scale-105" style={{ background: '#7C3AED' }}>
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Step 2: Group Details */}
            <div className="px-5 pt-3 pb-6">
              <h3 className="text-[20px] font-bold text-white mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Group Details</h3>

              <div className="flex flex-col items-center mb-6">
                <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-3 cursor-pointer"
                  style={{ background: groupName ? getGradient(groupName) : '#1e293b' }}>
                  {groupName ? (
                    <span className="text-2xl font-bold text-white">{groupName.charAt(0).toUpperCase()}</span>
                  ) : (
                    <Camera className="w-6 h-6" style={{ color: '#4B5563' }} />
                  )}
                </div>
                <p className="text-[12px]" style={{ color: '#94A3B8' }}>Tap to upload</p>
              </div>

              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-[#4B5563] outline-none mb-4"
                style={{ background: '#1e293b', border: '1px solid #1f2937' }}
              />

              <p className="text-[13px] mb-2" style={{ color: '#94A3B8' }}>{selectedMembers.size} members</p>
              <div className="flex gap-2 flex-wrap mb-6">
                {[...selectedMembers].map(id => {
                  const f = friends.find(x => x.id === id);
                  if (!f) return null;
                  return (
                    <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#1e293b' }}>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={f.avatar_url} />
                        <AvatarFallback style={{ fontSize: 8, background: '#7C3AED', color: 'white' }}>{f.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] text-white">{f.name?.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-[14px] font-semibold" style={{ background: '#1e293b', color: '#94A3B8' }}>Back</button>
                <button
                  onClick={createGroup}
                  disabled={!groupName.trim() || creating}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}
                >
                  {creating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
