import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Sparkles, Loader2, Pencil, Lock, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicUrlSafe } from '@/lib/storageHelpers';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { DEFAULT_PROFILE_EXTRAS, loadProfileExtras, saveProfileExtras, type ProfileExtras } from '@/lib/profileExtras';

type Profile = Database['public']['Tables']['profiles']['Row'];

const INTERESTS = [
  'Connect', 'Learn', 'Games', 'Buy/Sell',
  'Adventure', 'Travel', 'Music', 'Food',
];

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile;
  onSaved: () => void;
}

export function EditProfileSheet({ open, onOpenChange, profile, onSaved }: EditProfileSheetProps) {
  const { user } = useAuth();
  const avatarRef = useRef<HTMLInputElement>(null);
  const storageUserId = user?.id || profile.id;

  const [name, setName] = useState(profile.name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [country, setCountry] = useState(profile.country || '');
  const [ageGroup, setAgeGroup] = useState(profile.age_group || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    profile.primary_interest ? profile.primary_interest.split(',').map(s => s.trim()) : []
  );
  const [schools, setSchools] = useState<string[]>(['']);
  const [hobbiesList, setHobbiesList] = useState<string[]>(['']);
  const [emails, setEmails] = useState<string[]>(['']);
  const [favoriteClub, setFavoriteClub] = useState('');
  const [favoriteShowMovieSong, setFavoriteShowMovieSong] = useState('');
  const [favoriteActorAthletePerson, setFavoriteActorAthletePerson] = useState('');
  const [games, setGames] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [occupation, setOccupation] = useState('');
  
  
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const [privateFields, setPrivateFields] = useState<Set<string>>(new Set());


  const isPrivate = (field: string) => privateFields.has(field);
  const togglePrivacy = (field: string) => {
    const next = new Set(privateFields);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    setPrivateFields(next);
    toast.info(`${field.replace('_', ' ')} is now ${next.has(field) ? 'Private' : 'Public'}`);
  };

  useEffect(() => {
    if (!username || username === profile.username) {
      setUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .maybeSingle();
      setUsernameAvailable(!data);
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, profile.username, user?.id]);

  useEffect(() => {
    if (!open) return;

    const storedExtras = loadProfileExtras(storageUserId);
    const normalizeVisibility = (value: unknown): Record<string, boolean> => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, raw]) => [key, raw === false ? false : true])
      );
    };

    const profileExtras: ProfileExtras = {
      school_name: profile.school_name || '',
      hobbies: profile.hobbies || '',
      contact_email: profile.contact_email || '',
      favorite_club: profile.favorite_club || '',
      favorite_show_movie_song: profile.favorite_show_movie_song || '',
      favorite_actor_athlete_person: profile.favorite_actor_athlete_person || '',
      games: profile.games || '',
      contact_phone: profile.contact_phone || '',
      relationship: profile.relationship || '',
      occupation: profile.occupation || '',
      profile_visibility: normalizeVisibility(profile.profile_visibility as unknown) as Record<string, boolean>,
    };
    const resolvedExtras: ProfileExtras = {
      ...DEFAULT_PROFILE_EXTRAS,
      ...storedExtras,
      ...profileExtras,
    };

    const toArray = (value: string) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    setName(profile.name || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setLocation(profile.location || '');
    setCountry(profile.country || '');
    setAgeGroup(profile.age_group || '');
    setGender(profile.gender || '');
    setWebsite(profile.website || '');
    setSelectedInterests(profile.primary_interest ? profile.primary_interest.split(',').map((s) => s.trim()) : []);
    setSchools(toArray(resolvedExtras.school_name).length > 0 ? toArray(resolvedExtras.school_name) : ['']);
    setHobbiesList(toArray(resolvedExtras.hobbies).length > 0 ? toArray(resolvedExtras.hobbies) : ['']);
    setEmails(toArray(resolvedExtras.contact_email).length > 0 ? toArray(resolvedExtras.contact_email) : ['']);
    setFavoriteClub(resolvedExtras.favorite_club || '');
    setFavoriteShowMovieSong(resolvedExtras.favorite_show_movie_song || '');
    setFavoriteActorAthletePerson(resolvedExtras.favorite_actor_athlete_person || '');
    setGames(resolvedExtras.games || '');
    setContactPhone(resolvedExtras.contact_phone || '');
    setRelationship(resolvedExtras.relationship || '');
    setOccupation(resolvedExtras.occupation || '');
    setPrivateFields(new Set(Object.entries(resolvedExtras.profile_visibility || {}).filter(([, visible]) => visible === false).map(([field]) => field)));
  }, [open, profile, storageUserId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(url);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const generateBio = async () => {
    setGeneratingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bio', {
        body: {
          name: name || profile.name,
          city: location || profile.location || '',
          interests: selectedInterests.join(', ') || 'socializing',
        },
      });
      if (error) throw error;
      if (data?.bio) setBio(data.bio.slice(0, 150));
    } catch {
      toast.error('Failed to generate bio');
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleSave = async () => {
    if (!user || !name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const nextUsername = username.trim();

      if (nextUsername && nextUsername !== profile.username) {
        const { data: existingUsername } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', nextUsername)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUsername) {
          toast.error('That username is already taken');
          return;
        }
      }

      let newAvatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        newAvatarUrl = (getPublicUrlSafe('avatars', path) ?? profile.avatar_url) + '?t=' + Date.now();
      }

      const nextExtras: ProfileExtras = {
        ...DEFAULT_PROFILE_EXTRAS,
        school_name: schools.filter(Boolean).join(', '),
        hobbies: hobbiesList.filter(Boolean).join(', '),
        contact_email: emails.filter(Boolean).join(', '),
        favorite_club: favoriteClub.trim(),
        favorite_show_movie_song: favoriteShowMovieSong.trim(),
        favorite_actor_athlete_person: favoriteActorAthletePerson.trim(),
        games: games.trim(),
        contact_phone: contactPhone.trim(),
        relationship: relationship.trim(),
        occupation: occupation.trim(),
        profile_visibility: Object.fromEntries(Array.from(privateFields).map((field) => [field, false])),
      };

      saveProfileExtras(storageUserId, nextExtras);

      // Build update data for core profile fields and extended profile fields.
      // If the live schema rejects the extended columns, we fall back to core-only.
      const coreUpdateData: any = {
        name: name.trim(),
        username: nextUsername || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        country: country.trim() || null,
        age_group: ageGroup || null,
        gender: gender || null,
        website: website.trim() || null,
        primary_interest: selectedInterests.join(', ') || null,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const extendedUpdateData: any = {
        ...coreUpdateData,
        school_name: nextExtras.school_name || null,
        hobbies: nextExtras.hobbies || null,
        contact_email: nextExtras.contact_email || null,
        favorite_club: nextExtras.favorite_club || null,
        favorite_show_movie_song: nextExtras.favorite_show_movie_song || null,
        favorite_actor_athlete_person: nextExtras.favorite_actor_athlete_person || null,
        games: nextExtras.games || null,
        contact_phone: nextExtras.contact_phone || null,
        relationship: nextExtras.relationship || null,
        occupation: nextExtras.occupation || null,
        profile_visibility: nextExtras.profile_visibility,
      };

      let { error } = await supabase
        .from('profiles')
        .update(extendedUpdateData)
        .eq('id', user.id);

      if (error && /section_order|profile_visibility|school_name|hobbies|favorite_club|favorite_show_movie_song|favorite_actor_athlete_person|games|contact_email|contact_phone|relationship|occupation|schema cache/i.test(error.message || '')) {
        console.warn('Extended profile columns unavailable, falling back to core profile save only', error);
        ({ error } = await supabase
          .from('profiles')
          .update(coreUpdateData)
          .eq('id', user.id));
      }

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      saveProfileExtras(storageUserId, nextExtras);
      
      // Wait a moment to ensure data persistence before closing
      toast.success('Profile updated successfully');
      setTimeout(() => {
        onSaved();
        onOpenChange(false);
      }, 150);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const FieldHeader = ({ label, field, canAdd, onAdd }: { label: string; field: string; canAdd?: boolean; onAdd?: () => void }) => (
    <div className="flex items-center justify-between mb-1.5">
      <label className="text-xs font-medium block" style={{ color: '#94A3B8' }}>{label}</label>
      <div className="flex items-center gap-3">
        {canAdd && (
          <button onClick={onAdd} className="p-1 hover:bg-white/5 rounded transition-colors text-orange-500">
            <Plus className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={() => togglePrivacy(field)} 
          className={cn("p-1 hover:bg-white/5 rounded transition-colors", isPrivate(field) ? "text-orange-500" : "text-slate-500")}
          title={isPrivate(field) ? "Private" : "Public"}
        >
          {isPrivate(field) ? <Lock className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[99vh] p-0 border-0 rounded-t-[32px] overflow-hidden shadow-2xl" style={{ background: '#0a0f1e' }}>
        <SheetTitle className="sr-only">Edit Profile</SheetTitle>
        
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full" style={{ background: '#1e293b' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900/50">
          <h2 className="text-white" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20 }}>
            Edit Profile
          </h2>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto h-[calc(99vh-140px)] pb-20 no-scrollbar">
          {/* Avatar */}
          <div className="px-5 pt-3">
            <div
              className="w-24 h-24 rounded-full overflow-hidden relative"
              style={{ border: '3px solid #111827', boxShadow: '0 0 0 2px #7C3AED' }}
            >
              {avatarPreview ? (
                <Avatar className="w-full h-full">
                  <AvatarImage src={avatarPreview} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-white text-3xl font-bold">
                    {name[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)' }}>
                  {name[0]?.toUpperCase() || '?'}
                </div>
              )}
              {/* Camera icon at bottom right */}
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#7C3AED' }}
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </div>

          {/* Form */}
          <div className="px-5 mt-6 space-y-6">
            {/* Name */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94A3B8' }}>Name *</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94A3B8' }}>Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>@</span>
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="username"
                  className="border-0 text-white placeholder:text-gray-500 pl-9 bg-[#111827] h-12 rounded-xl"
                  style={{ fontFamily: "'Inter'", fontSize: 15 }}
                />
                {checkingUsername && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: '#94A3B8' }} />}
                {usernameAvailable === true && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#22c55e' }}>✓ Available</span>}
                {usernameAvailable === false && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#ef4444' }}>✗ Taken</span>}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#94A3B8' }}>Bio</label>
              <div className="relative">
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 150))}
                  placeholder="Tell the world about yourself..."
                  rows={3}
                  className="border-0 text-white placeholder:text-gray-500 resize-none bg-[#111827] rounded-xl px-4 pt-3"
                  style={{ fontFamily: "'Inter'", fontSize: 15 }}
                />
                <span className="absolute bottom-2 right-3 text-[11px]" style={{ color: '#4B5563' }}>
                  {bio.length}/150
                </span>
              </div>
              <button
                onClick={generateBio}
                disabled={generatingBio}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
                style={{ color: '#7C3AED', fontFamily: "'Inter'" }}
              >
                {generatingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Bio with AI
              </button>
            </div>

            {/* Location */}
            <div>
              <FieldHeader label="Location" field="location" />
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, Country"
                className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              />
            </div>

            {/* Website */}
            <div>
              <FieldHeader label="Website / Social link" field="website" />
              <Input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                placeholder="https://..."
                className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              />
            </div>

            {/* School */}
            <div className="space-y-2">
              <FieldHeader label="School name" field="school_name" canAdd onAdd={() => setSchools([...schools, ''])} />
              {schools.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={s}
                    onChange={e => {
                      const next = [...schools];
                      next[i] = e.target.value;
                      setSchools(next);
                    }}
                    placeholder="Your school or college"
                    className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4 flex-1"
                    style={{ fontFamily: "'Inter'", fontSize: 15 }}
                  />
                  {schools.length > 1 && (
                    <button onClick={() => setSchools(schools.filter((_, idx) => idx !== i))} className="text-slate-500 p-2"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Hobbies */}
            <div className="space-y-2">
              <FieldHeader label="Hobbies" field="hobbies" canAdd onAdd={() => setHobbiesList([...hobbiesList, ''])} />
              {hobbiesList.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={h}
                    onChange={e => {
                      const next = [...hobbiesList];
                      next[i] = e.target.value;
                      setHobbiesList(next);
                    }}
                    placeholder="e.g. Painting"
                    className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4 flex-1"
                    style={{ fontFamily: "'Inter'", fontSize: 15 }}
                  />
                  {hobbiesList.length > 1 && (
                    <button onClick={() => setHobbiesList(hobbiesList.filter((_, idx) => idx !== i))} className="text-slate-500 p-2"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Favorite Club */}
            <div>
              <FieldHeader label="Favorite Club" field="favorite_club" />
              <Input value={favoriteClub} onChange={e => setFavoriteClub(e.target.value)} placeholder="Sports or fan club" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Favorite Show/Movie/Song */}
            <div>
              <FieldHeader label="Favorite show / movie / song" field="favorite_show_movie_song" />
              <Input value={favoriteShowMovieSong} onChange={e => setFavoriteShowMovieSong(e.target.value)} placeholder="Your favorite show, movie, or song" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Favorite Actor/Athlete/Person */}
            <div>
              <FieldHeader label="Favorite actor / athlete / person" field="favorite_actor_athlete_person" />
              <Input value={favoriteActorAthletePerson} onChange={e => setFavoriteActorAthletePerson(e.target.value)} placeholder="Someone you look up to" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Games */}
            <div>
              <FieldHeader label="Games" field="games" />
              <Input value={games} onChange={e => setGames(e.target.value)} placeholder="Games you like to play" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <FieldHeader label="Contact email" field="contact_email" canAdd onAdd={() => setEmails([...emails, ''])} />
              {emails.map((email, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={email}
                    onChange={e => {
                      const next = [...emails];
                      next[i] = e.target.value;
                      setEmails(next);
                    }}
                    placeholder="you@example.com"
                    className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4 flex-1"
                    style={{ fontFamily: "'Inter'", fontSize: 15 }}
                  />
                  {emails.length > 1 && (
                    <button onClick={() => setEmails(emails.filter((_, idx) => idx !== i))} className="text-slate-500 p-2"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>

            {/* Contact Phone */}
            <div>
              <FieldHeader label="Contact phone" field="contact_phone" />
              <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Optional phone number" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Country */}
            <div>
              <FieldHeader label="Country" field="country" />
              <Input
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g., Nepal"
                className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              />
            </div>

            
            {/* Occupation */}
            <div>
              <FieldHeader label="Occupation" field="occupation" />
              <Input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="What do you do?" className="border-0 text-white placeholder:text-gray-500 bg-[#111827] h-12 rounded-xl px-4" style={{ fontFamily: "'Inter'", fontSize: 15 }} />
            </div>

            {/* Relationship Status */}
            <div>
              <FieldHeader label="Relationship Status" field="relationship" />
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-0 text-white bg-[#111827]"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              >
                <option value="">Select status</option>
                <option value="Single">Single</option>
                <option value="In a relationship">In a relationship</option>
                <option value="Married">Married</option>
                <option value="Complicated">It's complicated</option>
                <option value="Private">Private</option>
              </select>
            </div>

            {/* Age Group */}
            <div>
              <FieldHeader label="Age Group" field="age_group" />
              <select
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-0 text-white bg-[#111827]"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              >
                <option value="">Select age group</option>
                <option value="13-17">13-17</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55+">55+</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <FieldHeader label="Gender" field="gender" />
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-0 text-white bg-[#111827]"
                style={{ fontFamily: "'Inter'", fontSize: 15 }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            {/* Interests */}
            <div>
              <label className="text-xs font-medium mb-3 block" style={{ color: '#94A3B8' }}>Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(interest => {
                  const selected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className="px-5 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95"
                      style={{
                        background: selected ? '#7C3AED' : '#111827',
                        border: selected ? '1px solid #7C3AED' : '1px solid #1f2937',
                        color: selected ? 'white' : '#94A3B8',
                        fontFamily: "'Inter'",
                      }}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer with Cancel/Done buttons */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-900/50" style={{ background: '#0a0f1e' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 rounded-full text-slate-400 text-sm font-medium hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-full text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #3B82F6)', fontFamily: "'Inter'" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Done'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
