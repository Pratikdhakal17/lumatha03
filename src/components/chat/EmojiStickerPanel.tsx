import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, Upload, Sticker, Heart, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export interface ImportedSticker {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  pack: string;
  favorite: boolean;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

const IMPORTED_STICKERS_KEY = 'lumatha_imported_stickers_v1';
const RECENT_EMOJIS_KEY = 'lumatha_recent_emojis_v1';

// Comprehensive emoji categories with full emoji sets
const EMOJI_CATEGORIES: Array<{ id: string; label: string; emojis: string[]; icon: string }> = [
  { 
    id: 'recent', 
    label: 'Recent', 
    emojis: [], 
    icon: '🕐' 
  },
  { 
    id: 'smileys', 
    label: 'Smileys', 
    icon: '😊',
    emojis: [
      // Faces
      '😀', '�', '😄', '�😁', '�', '😅', '🤣', '�', '🙂', '🙃', '😉', '�😊', 
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', 
      '�', '�', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '�', 
      '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '�😴', '�', '🤒', 
      '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', 
      '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', 
      '😧', '😨', '😰', '😥', '😢', '�😭', '😱', '😖', '😣', '😞', '😓', '😩', 
      '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', 
      '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', 
      '🙀', '😿', '😾'
    ]
  },
  { 
    id: 'animals', 
    label: 'Animals', 
    icon: '🐻',
    emojis: [
      '🐶', '🐱', '🐭', '�', '�', '🦊', '🐻', '🐼', '�', '🐯', '🦁', '�', 
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', 
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', 
      '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '�', '🦎', 
      '🦖', '🦕', '�🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', 
      '🦈', '🐋', '🐊', '🐆', '🐅', '🐃', '🐂', '🐄', '🦌', '🐪', '🐫', '🦙', 
      '🦒', '🐘', '🦏', '🦛', '🐐', '🐏', '🐑', '🐎', '🐖', '🐀', '🐁', '🐓', 
      '�', '🕊️', '🐕', '🐩', '🐈', '🐇', '🐿️', '🦔', '🦇', '🐓'
    ]
  },
  { 
    id: 'food', 
    label: 'Food', 
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', 
      '🍑', '�', '🥝', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', 
      '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🥨', '🥯', 
      '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '�🍔', '🍟', '🍕', '🌭', '🥪', 
      '🌮', '�', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '�', '🫕', '🥣', '🥗', 
      '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '�🍜', '�', '🍠', 
      '🍢', '🍣', '🍤', '🍥', '🍡', '🍦', '🍧', '🍨', '�🍩', '�', '�', '�', 
      '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '�', 
      '�', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', 
      '🧉', '🧊'
    ]
  },
  { 
    id: 'activities', 
    label: 'Activities', 
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '�', '⚾', '🥎', '�', '�', '�', '🥏', '�', '🪀', '🏓', 
      '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '�', '�', '🤿', '🥊', 
      '�', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', 
      '🏋️‍♀️', '🏋️‍♂️', '🤼', '🤼‍♀️', '🤼‍♂️', '🤸', '🤸‍♀️', '🤸‍♂️', '⛹️', '⛹️‍♀️', '⛹️‍♂️', 
      '🤺', '🤾', '🤾‍♀️', '🤾‍♂️', '🏌️', '🏌️‍♀️', '🏌️‍♂️', '🏇', '🧘', '🧘‍♀️', '🧘‍♂️', '🏄', 
      '🏄‍♀️', '🏄‍♂️', '🏊', '🏊‍♀️', '🏊‍♂️', '🤽', '🤽‍♀️', '🤽‍♂️', '🚣', '🚣‍♀️', '🚣‍♂️', '🧗', 
      '🧗‍♀️', '🧗‍♂️', '🚵', '🚵‍♀️', '🚵‍♂️', '🚴', '🚴‍♀️', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', 
      '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', 
      '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', 
      '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'
    ]
  },
  { 
    id: 'travel', 
    label: 'Travel', 
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', 
      '�', '🦯', '🦽', '🦼', '🛴', '🚲', '�🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', 
      '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', 
      '🚂', '🚆', '�', '🚊', '🚉', '✈️', '🛫', '�', '🛩️', '💺', '🛰️', '�🚀', 
      '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', 
      '🚦', '🚥', '🚏', '🗺️', '🧭', '🧳', '🌎', '🌍', '🌏', '🌐', '🗾', '🧭', 
      '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '�️', '�🏝️', '�️', '�️', '🏛️', '🏗️', 
      '🧱', '🪨', '🪵', '�', '🏘️', '🏚️', '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', 
      '🏦', '🏨', '🏩', '🏪', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛪', 
      '🕌', '🛕', '🕍', '⛩️', '�', '⛲', '⛺', '🌁', '🌃', '🌄', '🌅', '🌆', 
      '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '�', '🎪'
    ]
  },
  { 
    id: 'objects', 
    label: 'Objects', 
    icon: '💡',
    emojis: [
      '⌚', '📱', '�', '�💻', '⌨️', '�️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', 
      '💾', '💿', '📀', '📼', '�📷', '📸', '📹', '�', '📽️', '🎞️', '📞', '☎️', 
      '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', 
      '⌛', '⏳', '📡', '🔋', '🔌', '💡', '�', '�️', '🪔', '�', '�️', '💸', 
      '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🦯', '🧰', '🔧', 
      '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🗜️', '⚗️', '🧪', '🧫', '🧬', '🔬', 
      '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🌡️', '🚽', '🚰', '🚿', '🛁', 
      '🛀', '🧴', '🧷', '🧹', '🧺', '🧻', '🧼', '🧽', '🧯', '🛒', '🚬', '⚰️', 
      '⚱️', '🗿', '🪦', '🧸', '🧵', '🧶', '🏧', '🚮', '🚰', '♿', '🚹', '🚺', 
      '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', '🛅', '🛎️', '🧳'
    ]
  },
  { 
    id: 'symbols', 
    label: 'Symbols', 
    icon: '❤️',
    emojis: [
      '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', 
      '🗯️', '💭', '💤', '👓', '🕶️', '🥽', '🥼', '🦺', '👔', '👕', '👖', '🧣', 
      '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '👛', 
      '👜', '👝', '🛍️', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', 
      '👑', '👒', '🎩', '🎓', '🧢', '🪖', '⛑️', '📿', '💄', '💍', '💎', '🔇', 
      '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '💹', 
      '🏧', '🚮', '🚰', '♿', '🚹', '🚺', '🚻', '🚼', '🚾', '🛂', '🛃', '🛄', 
      '🛅', '⚠️', '🚸', '⛔', '🚫', '🚳', '🚭', '🚯', '🚱', '🚷', '📵', '🔞', 
      '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '↕️', '↔️', 
      '↩️', '↪️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '⏪', '⏩', '⏫', 
      '⏬', '⏭️', '⏮️', '⏯️', '⏸️', '⏹️', '⏺️', '⏏️', '🎦', '�', '�', '�', 
      '�', '�', '♀️', '♂️', '⚧️', '✖️', '➕', '➖', '➗', '♾️', '‼️', '⁉️', 
      '❓', '❔', '❕', '❗', '〰️', '�', '💲', '⚕️', '♻️', '⚜️', '🔱', '📛', 
      '🔰', '⭕', '✅', '☑️', '✔️', '❌', '❎', '➰', '➿', '〽️', '✳️', '✴️', 
      '❇️', '©️', '®️', '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', 
      '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔠', '🔡', '🔢', '🔣', '🔤', '🅰️', '🆎', 
      '🅱️', '🆑', '🆒', '🆓', 'ℹ️', '🆔', 'Ⓜ️', '🆕', '🆖', '🅾️', '🆗', '🅿️', 
      '🆘', '🆙', '🆚', '🈁', '🈂️', '🈷️', '🈶', '🈯', '🉐', '🈹', '🈚', '🈲', 
      '🉑', '🈸', '🈴', '🈳', '㊗️', '㊙️', '🈺', '🈵', '🔴', '🟠', '🟡', '🟢', 
      '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', 
      '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', 
      '🟪', '⬛', '⬜', '🟫', '🔈', '🔉', '🔊', '🔇', '📣', '📢', '💬', '💭', 
      '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', 
      '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', 
      '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧'
    ]
  },
  { 
    id: 'nature', 
    label: 'Nature', 
    icon: '🌸',
    emojis: [
      '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', 
      '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰', 
      '🦀', '🦞', '🦐', '🦑', '🌍', '🌎', '🌏', '🌑', '🌒', '🌓', '🌔', '🌕', 
      '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '☀️', '🌝', '🌞', '⭐', '🌟', 
      '🌠', '☁️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌨️', '🌩️', '🌪️', '🌫️', 
      '🌬️', '🌀', '🌈', '🌂', '☂️', '☔', '⚡', '❄️', '☃️', '⛄', '☄️', '🔥', 
      '💧', '🌊', '🎃', '🎄', '🎆', '🎇', '🧨', '✨', '🎈', '🎉', '🎊', '🎋', 
      '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫'
    ]
  }
];

const BUILT_IN_STICKERS = ['❤️', '😂', '🔥', '🙏', '✨', '💯', '👏', '🎉', '😎', '🥳', '🤝', '💥'];

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadImportedStickers = (): ImportedSticker[] =>
  safeJsonParse<ImportedSticker[]>(localStorage.getItem(IMPORTED_STICKERS_KEY), []);

export const saveImportedStickers = (stickers: ImportedSticker[]) => {
  localStorage.setItem(IMPORTED_STICKERS_KEY, JSON.stringify(stickers.slice(-80)));
};

const loadRecentEmojis = (): string[] =>
  safeJsonParse<string[]>(localStorage.getItem(RECENT_EMOJIS_KEY), []);

const saveRecentEmojis = (list: string[]) => {
  localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(list.slice(0, 24)));
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

interface EmojiStickerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryEmoji: string;
  primaryStickerId: string | null;
  onSendEmoji: (emoji: string) => void;
  onSendImportedSticker: (sticker: ImportedSticker) => void;
  onSetPrimaryEmoji: (emoji: string) => void;
  onSetPrimarySticker: (stickerId: string | null) => void;
}

export function EmojiStickerPanel({
  open,
  onOpenChange,
  primaryEmoji,
  primaryStickerId,
  onSendEmoji,
  onSendImportedSticker,
  onSetPrimaryEmoji,
  onSetPrimarySticker,
}: EmojiStickerPanelProps) {
  const [mode, setMode] = useState<'emoji' | 'stickers'>('emoji');
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [showManager, setShowManager] = useState(false);
  const [packName, setPackName] = useState('My Pack');
  const [stickerFilter, setStickerFilter] = useState<'all' | 'favorites' | 'recent' | string>('all');
  const [importedStickers, setImportedStickers] = useState<ImportedSticker[]>(() => loadImportedStickers());
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadRecentEmojis());
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);

  // Refresh stickers when panel opens
  useEffect(() => {
    if (open) {
      setImportedStickers(loadImportedStickers());
      setRecentEmojis(loadRecentEmojis());
      setEmojiCategory('smileys');
    }
  }, [open]);

  const packs = useMemo(() => {
    const names = Array.from(new Set(importedStickers.map((item) => item.pack.trim()).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [importedStickers]);

  const activeEmojiList = useMemo(() => {
    if (emojiCategory === 'recent') return recentEmojis;
    const found = EMOJI_CATEGORIES.find((item) => item.id === emojiCategory);
    return found?.emojis || [];
  }, [emojiCategory, recentEmojis]);

  const filteredStickers = useMemo(() => {
    const sorted = [...importedStickers].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    if (stickerFilter === 'favorites') return sorted.filter((item) => item.favorite);
    if (stickerFilter === 'recent') return sorted.filter((item) => item.useCount > 0).slice(0, 20);
    if (stickerFilter === 'all') return sorted;
    return sorted.filter((item) => item.pack === stickerFilter);
  }, [importedStickers, stickerFilter]);

  const pushRecentEmoji = (emoji: string) => {
    const next = [emoji, ...recentEmojis.filter((item) => item !== emoji)].slice(0, 24);
    setRecentEmojis(next);
    saveRecentEmojis(next);
  };

  const handleSendEmoji = (emoji: string) => {
    pushRecentEmoji(emoji);
    onSendEmoji(emoji);
    onOpenChange(false);
  };

  const handleSendImportedSticker = (sticker: ImportedSticker) => {
    const next = importedStickers.map((item) =>
      item.id === sticker.id
        ? { ...item, useCount: item.useCount + 1, lastUsedAt: Date.now() }
        : item
    );
    setImportedStickers(next);
    saveImportedStickers(next);
    onSendImportedSticker(sticker);
    setSelectedSticker(sticker.id);
    // Delay close for animation
    setTimeout(() => onOpenChange(false), 150);
  };

  const handleSetPrimarySticker = useCallback((stickerId: string | null) => {
    onSetPrimarySticker(stickerId);
    if (stickerId) {
      const sticker = importedStickers.find(s => s.id === stickerId);
      if (sticker) {
        toast.success(`${sticker.name} set as primary reaction`);
      }
    }
  }, [importedStickers, onSetPrimarySticker]);

  const toggleFavorite = (id: string) => {
    const next = importedStickers.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    setImportedStickers(next);
    saveImportedStickers(next);
  };

  const removeSticker = (id: string) => {
    const next = importedStickers.filter((item) => item.id !== id);
    setImportedStickers(next);
    saveImportedStickers(next);
    if (primaryStickerId === id) handleSetPrimarySticker(null);
  };

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((file) => ['image/png', 'image/gif', 'image/webp'].includes(file.type));
    if (validFiles.length === 0) {
      toast.error('Only PNG/GIF/WEBP stickers are supported');
      return;
    }

    const created: ImportedSticker[] = [];
    for (const file of validFiles.slice(0, 12)) {
      if (file.size > 4 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 4MB)`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        created.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          name: file.name,
          mimeType: file.type,
          dataUrl,
          pack: packName.trim() || 'My Pack',
          favorite: false,
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
          useCount: 0,
        });
      } catch {
        toast.error(`Could not import ${file.name}`);
      }
    }

    if (created.length === 0) return;

    const next = [...created, ...importedStickers].slice(0, 80);
    setImportedStickers(next);
    saveImportedStickers(next);
    toast.success(`Imported ${created.length} sticker${created.length > 1 ? 's' : ''}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-20px)] max-w-[520px] border-0 rounded-3xl p-0" style={{ background: '#111827' }}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-white text-base font-semibold">Emoji & Stickers</DialogTitle>
            <DialogDescription className="sr-only">Send emoji reactions, stickers, and set a primary sticker.</DialogDescription>
          </DialogHeader>

          <div className="px-4 pb-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as 'emoji' | 'stickers')}>
              <TabsList className="w-full grid grid-cols-2 bg-[#0f172a]">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="stickers">Stickers</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === 'emoji' ? (
              <div className="mt-3 space-y-3">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {EMOJI_CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.id}
                      onClick={() => setEmojiCategory(cat.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        flex items-center gap-1.5 px-3 h-9 rounded-full text-xs font-medium whitespace-nowrap
                        transition-all duration-200 ease-out
                        ${emojiCategory === cat.id 
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-2 ring-primary/50' 
                          : 'bg-[#1e293b] text-[#94A3B8] hover:bg-[#252f3f] hover:text-white'
                        }
                      `}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.label}</span>
                      {cat.id === 'recent' && recentEmojis.length > 0 && (
                        <span className="ml-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </motion.button>
                  ))}
                </div>

                {activeEmojiList.length === 0 ? (
                  <p className="text-xs text-[#94A3B8] px-1">No recent emojis yet</p>
                ) : (
                  <motion.div 
                  className="grid grid-cols-8 gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, staggerChildren: 0.02 }}
                >
                    {activeEmojiList.map((emoji, index) => (
                      <motion.button
                        key={emoji}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.01 }}
                        onClick={() => handleSendEmoji(emoji)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          onSetPrimaryEmoji(emoji);
                          toast.success(`${emoji} set as primary reaction`);
                        }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="h-10 rounded-xl text-xl hover:bg-white/10 active:bg-white/20 transition-colors relative group"
                        title="Tap to send, right click/long press to set as primary"
                      >
                        {emoji}
                        {primaryEmoji === emoji && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                <motion.div 
                  className="rounded-xl border border-[#334155] px-3 py-2 flex items-center justify-between bg-[#0f172a]/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{primaryEmoji}</span>
                    <p className="text-xs text-[#94A3B8]">Primary quick reaction</p>
                  </div>
                  {primaryStickerId && (
                    <Button size="sm" variant="outline" onClick={() => handleSetPrimarySticker(null)}>
                      <Heart className="w-3 h-3 mr-1" /> Use Emoji
                    </Button>
                  )}
                </motion.div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setStickerFilter('all')}
                    className="px-3 h-8 rounded-full text-xs"
                    style={stickerFilter === 'all' ? { background: '#7C3AED', color: '#fff' } : { background: '#1e293b', color: '#94A3B8' }}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStickerFilter('favorites')}
                    className="px-3 h-8 rounded-full text-xs"
                    style={stickerFilter === 'favorites' ? { background: '#7C3AED', color: '#fff' } : { background: '#1e293b', color: '#94A3B8' }}
                  >
                    Favorites
                  </button>
                  <button
                    onClick={() => setStickerFilter('recent')}
                    className="px-3 h-8 rounded-full text-xs"
                    style={stickerFilter === 'recent' ? { background: '#7C3AED', color: '#fff' } : { background: '#1e293b', color: '#94A3B8' }}
                  >
                    Recent
                  </button>
                  {packs.map((pack) => (
                    <button
                      key={pack}
                      onClick={() => setStickerFilter(pack)}
                      className="px-3 h-8 rounded-full text-xs whitespace-nowrap"
                      style={stickerFilter === pack ? { background: '#7C3AED', color: '#fff' } : { background: '#1e293b', color: '#94A3B8' }}
                    >
                      {pack}
                    </button>
                  ))}
                </div>

                <motion.div 
                  className="grid grid-cols-6 gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.03 }}
                >
                  {BUILT_IN_STICKERS.map((emoji, index) => (
                    <motion.button
                      key={emoji}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSendEmoji(emoji)}
                      className="h-11 rounded-xl text-2xl hover:bg-white/10 active:bg-white/20 transition-colors relative"
                    >
                      {emoji}
                    </motion.button>
                  ))}

                  <AnimatePresence mode="popLayout">
                    {filteredStickers.map((item, index) => (
                      <motion.div 
                        key={item.id} 
                        className="relative"
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ delay: index * 0.02, type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <motion.button
                          onClick={() => handleSendImportedSticker(item)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-11 w-full rounded-xl overflow-hidden border-2 transition-all ${
                            primaryStickerId === item.id 
                              ? 'border-primary shadow-lg shadow-primary/30' 
                              : 'border-[#334155] hover:border-primary/50'
                          } bg-[#0f172a]`}
                          title={item.name}
                        >
                          <img src={item.dataUrl} alt={item.name} className="w-full h-full object-cover" />
                          {primaryStickerId === item.id && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                            </div>
                          )}
                        </motion.button>
                        <button
                          onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#111827] border border-[#334155] flex items-center justify-center hover:scale-110 transition-transform"
                          title="Favorite"
                        >
                          <Star className="w-3 h-3" style={{ color: item.favorite ? '#fbbf24' : '#94A3B8' }} />
                        </button>
                        {/* Set as primary button */}
                        <button
                          onClick={(event) => { 
                            event.stopPropagation(); 
                            handleSetPrimarySticker(primaryStickerId === item.id ? null : item.id);
                          }}
                          className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full border flex items-center justify-center hover:scale-110 transition-all ${
                            primaryStickerId === item.id 
                              ? 'bg-primary border-primary text-white' 
                              : 'bg-[#111827] border-[#334155] text-[#94A3B8] hover:text-primary'
                          }`}
                          title={primaryStickerId === item.id ? 'Remove as primary' : 'Set as primary'}
                        >
                          {primaryStickerId === item.id ? <X className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                <div className="flex items-center gap-2">
                  <Button className="flex-1" onClick={() => setShowManager(true)}>
                    <Sticker className="w-4 h-4 mr-1.5" /> Manage Sticker Packs
                  </Button>
                  <Badge variant="outline" className="text-[#94A3B8]">{importedStickers.length} imported</Badge>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Sticker Pack Manager with Device Import Flow */}
      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogContent className="w-[calc(100vw-20px)] max-w-[560px] border-0 rounded-3xl p-0 max-h-[80vh]" style={{ background: '#0f172a' }}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
              <Sticker className="w-5 h-5 text-primary" />
              Sticker Pack Manager
            </DialogTitle>
            <DialogDescription className="sr-only">Import, organize, and manage custom sticker packs.</DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-4">
            {/* Import Section */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-[#94A3B8] mb-1.5 block font-medium">Pack Name</label>
                  <Input 
                    value={packName} 
                    onChange={(event) => setPackName(event.target.value)} 
                    placeholder="My Awesome Stickers" 
                    className="bg-[#111827] border-[#334155] text-white h-10"
                  />
                </div>
                <div className="w-32">
                  <label className="text-xs text-[#94A3B8] mb-1.5 block font-medium opacity-0">Action</label>
                  <label className="flex items-center justify-center px-3 h-10 rounded-xl border border-primary/50 text-primary cursor-pointer bg-primary/10 hover:bg-primary/20 transition-colors">
                    <Upload className="w-4 h-4 mr-1.5" /> 
                    <span className="text-sm font-medium">Import</span>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept="image/png,image/gif,image/webp,image/jpeg"
                      onChange={(event) => {
                        void handleImport(event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
              
              {/* Quick Import Zone */}
              <motion.label 
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#334155] bg-[#111827]/50 cursor-pointer hover:border-primary/50 hover:bg-[#111827] transition-all group"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/png,image/gif,image/webp,image/jpeg"
                  onChange={(event) => {
                    void handleImport(event.target.files);
                    event.currentTarget.value = '';
                  }}
                />
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-[#1e293b] flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Upload className="w-6 h-6 text-[#94A3B8] group-hover:text-primary transition-colors" />
                </motion.div>
                <p className="text-sm text-white font-medium">Tap to select from device</p>
                <p className="text-xs text-[#94A3B8] mt-1">PNG, GIF, WEBP (max 4MB each)</p>
              </motion.label>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-[#111827]/50">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-primary border-primary/30">
                  {importedStickers.length} stickers
                </Badge>
                <Badge variant="outline" className="text-[#94A3B8]">
                  {packs.length} packs
                </Badge>
              </div>
              <div className="flex-1" />
              {primaryStickerId && (
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Heart className="w-3 h-3 mr-1" /> Primary Set
                </Badge>
              )}
            </div>

            {/* Sticker List */}
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 -mr-1">
              {importedStickers.length === 0 ? (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-20 h-20 rounded-3xl bg-[#1e293b] flex items-center justify-center mx-auto mb-4">
                    <Sticker className="w-10 h-10 text-[#334155]" />
                  </div>
                  <p className="text-sm text-white font-medium">No imported stickers yet</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Import your favorite PNG/GIF stickers</p>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {importedStickers.map((item, index) => (
                    <motion.div 
                      key={item.id} 
                      className="flex items-center gap-3 rounded-xl border border-[#334155] bg-[#111827] p-2.5 hover:border-[#475569] transition-colors group"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <motion.img 
                        src={item.dataUrl} 
                        alt={item.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-[#0f172a]"
                        whileHover={{ scale: 1.1 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-[#94A3B8] bg-[#1e293b] px-1.5 py-0.5 rounded">{item.pack}</span>
                          <span className="text-[11px] text-[#64748B]">used {item.useCount}×</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <motion.button 
                          onClick={() => toggleFavorite(item.id)} 
                          className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Favorite"
                        >
                          <Star className="w-4 h-4" style={{ color: item.favorite ? '#fbbf24' : '#94A3B8' }} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleSetPrimarySticker(primaryStickerId === item.id ? null : item.id)}
                          className={`px-2.5 h-8 rounded-lg text-xs font-medium transition-all ${
                            primaryStickerId === item.id 
                              ? 'bg-primary text-white' 
                              : 'border border-[#334155] text-[#94A3B8] hover:text-white hover:border-[#475569]'
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {primaryStickerId === item.id ? '★ Primary' : 'Set Primary'}
                        </motion.button>
                        <motion.button 
                          onClick={() => removeSticker(item.id)} 
                          className="w-8 h-8 rounded-full hover:bg-red-500/10 flex items-center justify-center transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#EF4444]" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
