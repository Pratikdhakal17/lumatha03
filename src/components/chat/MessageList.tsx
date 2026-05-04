import React, { memo, useEffect, useMemo, RefObject, useState, useRef, useCallback } from 'react';
import { Check, CheckCheck, Eye, EyeOff, Forward, Paperclip, Pin, CornerUpLeft, ChevronUp, Loader2, Camera, MapPin, Shield, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatImageGrid } from '@/components/chat/ChatImageGrid';
import { ChatVideoPlayer } from '@/components/chat/ChatVideoPlayer';
import { LinkPreviewCard, extractUrls } from '@/components/chat/LinkPreviewCard';
import { SharedPostPreview, extractInternalPostId, isSharedPostMessage } from '@/components/chat/SharedPostPreview';
import type { Message } from '@/types/chat';
import { VariableSizeList as List } from 'react-window';

const DEFAULT_ROW_HEIGHT = 76;
const DEFAULT_SWIPE_THRESHOLD_PX = 72;
const LOW_END_SWIPE_THRESHOLD_PX = 98;
const DEFAULT_HORIZONTAL_INTENT_RATIO = 1.2;
const LOW_END_HORIZONTAL_INTENT_RATIO = 1.45;

interface MessageItemProps {
  msg: Message & { reply_to_id?: string; edited_at?: string };
  isOwn: boolean;
  reactions: Record<string, number>;
  userReactionSet: Set<string>;
  isPinned: boolean;
  showDate: boolean;
  dateLabel: string;
  displayName: string;
  userId: string;
  viewedOnceMessages: Set<string>;
  allChatMedia: { url: string; type: 'image' | 'video' }[];
  messageMap: Map<string, Message & { reply_to_id?: string }>; // O(1) reply lookup
  bubbleGradient: string; // theme-aware own-bubble gradient
  onReact: (msgId: string, emoji: string) => void;
  onLongPress: (msgId: string) => void;
  onOpenActions: (msgId: string) => void;
  onSwipeReply: (msgId: string) => void;
  onMarkViewOnce: (msgId: string) => void;
  onOpenMedia: (url: string) => void;
  onOpenMediaByIndex: (index: number) => void;
  formatMsgTime: (dateStr: string) => string;
  simpleMode?: boolean;
  onViewFullPosts?: () => void;
}

const MessageItem = memo(function MessageItem({
  msg,
  isOwn,
  reactions,
  userReactionSet,
  isPinned,
  showDate,
  dateLabel,
  displayName,
  userId,
  viewedOnceMessages,
  allChatMedia,
  messageMap,
  bubbleGradient,
  onReact,
  onLongPress,
  onOpenActions,
  onSwipeReply,
  onOpenMedia,
  onOpenMediaByIndex,
  onMarkViewOnce,
  formatMsgTime,
  simpleMode = false,
  onViewFullPosts,
}: MessageItemProps) {