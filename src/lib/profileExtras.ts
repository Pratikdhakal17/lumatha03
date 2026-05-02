export interface ProfileExtras {
  school_name: string;
  hobbies: string;
  contact_email: string;
  favorite_club: string;
  favorite_show_movie_song: string;
  favorite_actor_athlete_person: string;
  games: string;
  contact_phone: string;
  relationship: string;
  occupation: string;
  profile_visibility: Record<string, boolean>;
}

export const PROFILE_EXTRAS_STORAGE_KEY = 'lumatha_profile_extras';

export const DEFAULT_PROFILE_EXTRAS: ProfileExtras = {
  school_name: '',
  hobbies: '',
  contact_email: '',
  favorite_club: '',
  favorite_show_movie_song: '',
  favorite_actor_athlete_person: '',
  games: '',
  contact_phone: '',
  relationship: '',
  occupation: '',
  profile_visibility: {},
};

const safeParse = (raw: string | null): ProfileExtras => {
  if (!raw) return { ...DEFAULT_PROFILE_EXTRAS };

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileExtras>;
    return {
      ...DEFAULT_PROFILE_EXTRAS,
      ...parsed,
      profile_visibility:
        parsed.profile_visibility && typeof parsed.profile_visibility === 'object'
          ? parsed.profile_visibility
          : {},
    };
  } catch {
    return { ...DEFAULT_PROFILE_EXTRAS };
  }
};

export function loadProfileExtras(userId: string | undefined | null): ProfileExtras {
  if (!userId || typeof window === 'undefined') return { ...DEFAULT_PROFILE_EXTRAS };
  return safeParse(localStorage.getItem(`${PROFILE_EXTRAS_STORAGE_KEY}_${userId}`));
}

export function saveProfileExtras(userId: string | undefined | null, extras: ProfileExtras) {
  if (!userId || typeof window === 'undefined') return;
  localStorage.setItem(`${PROFILE_EXTRAS_STORAGE_KEY}_${userId}`, JSON.stringify(extras));
}