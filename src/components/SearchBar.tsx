import { useState, useCallback, useEffect } from 'react';
import { Search, User, FileText, PlayCircle, Video, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';

interface SearchBarProps {
  wrapperClassName?: string;
  placeholder?: string;
}

export function SearchBar({ wrapperClassName = '', placeholder = 'Search on Lumatha...' }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const getMediaPreview = (post: any) => {
    const urls = Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls
      : post.file_url
        ? [post.file_url]
        : [];
    const types = Array.isArray(post.media_types) && post.media_types.length > 0
      ? post.media_types
      : post.file_type
        ? [post.file_type]
        : [];
    return { url: urls[0], type: String(types[0] || '').toLowerCase() };
  };

  const searchContent = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setUsers([]);
        setPosts([]);
        return;
      }

      setLoading(true);
      try {
        // Search users
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, name, username, name, avatar_url, country')
          .or(`name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
          .limit(8);

        // Search posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title, category, file_url, file_type, media_urls, media_types, profiles(*)')
          .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
          .eq('visibility', 'public')
          .limit(8);

        setUsers(usersData || []);
        setPosts(postsData || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchContent(query);
  }, [query, searchContent]);

  const handleSelect = (type: 'user' | 'post', id: string) => {
    setOpen(false);
    setQuery('');
    if (type === 'user') {
      navigate(`/profile/${id}`);
    } else {
      navigate(`/public?post=${id}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={wrapperClassName ? `relative w-full group ${wrapperClassName}` : 'relative w-full max-w-sm group'}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-10 h-11 bg-muted/30 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,420px)] md:w-[420px] p-0 border-white/5 bg-[#0d1117]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden mt-2" align="start">
        <Command className="bg-transparent">
          <CommandList className="max-h-[450px] scrollbar-hide">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
                🔍 Searching Lumatha...
              </div>
            ) : !query.trim() ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                   <Search className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-foreground">Discover Lumatha</p>
                <p className="text-xs text-muted-foreground">Search for people, posts, and topics</p>
              </div>
            ) : (
              <>
                <CommandEmpty className="p-8 text-center text-sm text-muted-foreground">
                  No results found for "{query}"
                </CommandEmpty>

                {users.length > 0 && (
                  <CommandGroup heading={<span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/60 px-2">People</span>}>
                    {users.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleSelect('user', user.id)}
                        className="cursor-pointer flex items-center p-3 mx-1 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="h-11 w-11 border border-white/10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                            <AvatarImage src={user.avatar_url || undefined} className="object-cover" />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-black uppercase">
                              {(user.name || user.name || user.username || 'U').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0d1117] rounded-full shadow-sm" />
                        </div>
                        <div className="min-w-0 flex-1 ml-3">
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-sm truncate text-white">{user.name || user.name || user.username}</p>
                            <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400/10" />
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">@{user.username || 'member'} • {user.country || 'Global'}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {posts.length > 0 && (
                  <CommandGroup heading={<span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground/60 px-2 mt-2">Content</span>}>
                    {posts.map((post) => (
                      <CommandItem
                        key={post.id}
                        onSelect={() => handleSelect('post', post.id)}
                        className="cursor-pointer flex items-center p-3 mx-1 rounded-xl hover:bg-white/5 transition-colors"
                      >
                        <div className="mr-3 h-14 w-14 rounded-xl overflow-hidden bg-muted/40 border border-white/5 flex items-center justify-center shrink-0 relative group">
                          {(() => {
                            const preview = getMediaPreview(post);
                            if (preview.url && (preview.type.includes('video') || post.file_type?.includes('video'))) {
                              return (
                                <>
                                  <video src={preview.url} muted autoPlay loop playsInline className="h-full w-full object-cover" />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                    <Video className="w-4 h-4 text-white drop-shadow-md" />
                                  </div>
                                </>
                              );
                            }
                            if (preview.url) {
                              return <img src={preview.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-110" />;
                            }
                            return <FileText className="h-5 w-5 text-muted-foreground" />;
                          })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate text-white leading-snug">{post.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground uppercase tracking-tighter font-bold">
                              {post.category || 'Post'}
                            </span>
                            {post.profiles && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                by {post.profiles.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
