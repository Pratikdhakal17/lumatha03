import React, { memo, useEffect, useMemo, RefObject, useState, useRef, useCallback } from 'react';
import { Check, CheckCheck, Eye, EyeOff, Forward, Paperclip, Pin, CornerUpLeft, ChevronUp, Loader2, Camera, MapPin, Shield, X as XIcon, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatImageGrid } from '@/components/chat/ChatImageGrid';
import { ChatVideoPlayer } from '@/components/chat/ChatVideoPlayer';
import { LinkPreviewCard, extractUrls } from '@/components/chat/LinkPreviewCard';
import { SharedPostPreview, extractInternalPostId, isSharedPostMessage } from '@/components/chat/SharedPostPreview';
import { PollDisplay } from '@/components/chat/PollDisplay';
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
  const isEdited = !!msg.edited_at;
  const isSensitive = Boolean(msg.content?.includes('[SENSITIVE]'));
  const swipeThresholdPx = simpleMode ? LOW_END_SWIPE_THRESHOLD_PX : DEFAULT_SWIPE_THRESHOLD_PX;
  const horizontalIntentRatio = simpleMode ? LOW_END_HORIZONTAL_INTENT_RATIO : DEFAULT_HORIZONTAL_INTENT_RATIO;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeHandledRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const locationMatch = msg.content?.match(/https:\/\/maps\.google\.com\/\?q=([-0-9.]+),([-0-9.]+)/);
  const locationCoords = locationMatch ? { lat: locationMatch[1], lng: locationMatch[2] } : null;
  const docUrl = msg.media_url
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(msg.media_url)}&embedded=true`
    : '';
  const isSharedPost = Boolean(msg.content && isSharedPostMessage(msg.content));
  const isPollMessage = Boolean(
    msg.content && ((msg.media_type === 'poll') || msg.content.startsWith('[POLL]') || msg.content.startsWith('📊 POLL:'))
  );

  return (
    <div id={`msg-${msg.id}`}>
      {showDate && (
        <div className="flex justify-center py-3">
          <span className="px-3.5 py-1 rounded-full text-[12px]" style={{ background: '#1e293b', color: '#94A3B8' }}>
            {dateLabel}
          </span>
        </div>
      )}
      <div className={cn('flex mb-1 items-start gap-1 group', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'relative group select-none',
            isPollMessage
              ? 'w-[min(92vw,620px)] max-w-[92vw] md:w-[min(80vw,620px)] md:max-w-[620px] xl:w-[min(66vw,680px)] xl:max-w-[680px]'
              : 'max-w-[82%] md:max-w-[72%] xl:max-w-[68%]'
          )}
          onDoubleClick={() => onReact(msg.id, '❤️')}
          onContextMenu={e => {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(30);
            onLongPress(msg.id);
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
            swipeHandledRef.current = false;
            clearLongPressTimer();
            longPressTimerRef.current = setTimeout(() => {
              if (navigator.vibrate) navigator.vibrate(30);
              onLongPress(msg.id);
            }, 500);
          }}
          onTouchMove={(e) => {
            const start = touchStartRef.current;
            if (!start) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = touch.clientY - start.y;

            if (Math.abs(deltaX) > 16 || Math.abs(deltaY) > 16) {
              clearLongPressTimer();
            }

            if (swipeHandledRef.current) return;

            const horizontalIntent = Math.abs(deltaX) > Math.abs(deltaY) * horizontalIntentRatio;
            if (deltaX > swipeThresholdPx && horizontalIntent) {
              swipeHandledRef.current = true;
              clearLongPressTimer();
              if (navigator.vibrate) navigator.vibrate(15);
              onSwipeReply(msg.id);
            }
          }}
          onTouchEnd={(e) => {
            setTimeout(() => {
              clearLongPressTimer();
              touchStartRef.current = null;
              swipeHandledRef.current = false;
            }, 50);
          }}
          onTouchCancel={() => {
            setTimeout(() => {
              clearLongPressTimer();
              touchStartRef.current = null;
              swipeHandledRef.current = false;
            }, 100);
          }}
        >
          <button
            type="button"
            aria-label="Open message actions"
            className={cn(
              'hidden md:flex absolute top-1/2 -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-white/10 hover:text-white',
              isOwn ? 'left-[-2.5rem]' : 'right-[-2.5rem]'
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (navigator.vibrate) navigator.vibrate(15);
              onOpenActions(msg.id);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {msg.is_forwarded && (
            <p className="text-[12px] mb-0.5 flex items-center gap-1 italic" style={{ color: '#94A3B8' }}>
              <Forward className="w-3 h-3" /> Forwarded
            </p>
          )}

          {/* Reply reference */}
          {msg.reply_to_id && (() => {
            const repliedMsg = messageMap.get(msg.reply_to_id);
            if (!repliedMsg) return null;
            const repliedName = repliedMsg.sender_id === userId ? 'You' : (displayName || 'User');
            return (
              <div
                className="mb-1 px-3 py-1.5 rounded-xl text-[12px] cursor-pointer"
                style={{ background: 'rgba(124,58,237,0.1)', borderLeft: '3px solid #7C3AED' }}
                onClick={() => document.getElementById(`msg-${repliedMsg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <p className="font-semibold text-[11px] mb-0.5" style={{ color: '#7C3AED' }}>{repliedName}</p>
                <p className="truncate" style={{ color: '#94A3B8' }}>{repliedMsg.content || (repliedMsg.media_type ? '📎 Media' : '')}</p>
              </div>
            );
          })()}

          <div
            className={cn(
              'relative overflow-hidden',
              (msg.media_url || isSharedPost) ? 'rounded-2xl' : '',
              isPollMessage ? 'rounded-2xl overflow-visible px-0 py-0 bg-transparent' : (msg.media_url || isSharedPost) ? '' : (isOwn ? 'rounded-[18px_18px_4px_18px] px-3.5 py-2.5' : 'rounded-[18px_18px_18px_4px] px-3.5 py-2.5'),
              isPinned && 'ring-1 ring-[#7C3AED]/30',
            )}
            style={
              isPollMessage
                ? { background: 'transparent' }
                : (msg.media_url || isSharedPost)
                ? {}
                : isOwn
                  ? { background: bubbleGradient }
                  : { background: '#1e293b' }
            }
          >
            {/* View Once media */}
            {msg.media_url && (msg.media_type === 'view_once_image' || msg.media_type === 'view_once_video') && (() => {
              const hasViewed = viewedOnceMessages.has(msg.id);
              const isOwnViewOnce = msg.sender_id === userId;
              if (hasViewed) {
                return (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <EyeOff className="w-5 h-5" style={{ color: '#4B5563' }} />
                    <span className="text-[14px] italic" style={{ color: '#4B5563' }}>Opened</span>
                  </div>
                );
              }
              if (isOwnViewOnce) {
                return (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Eye className="w-4 h-4" style={{ color: '#94A3B8' }} />
                    <span className="text-[14px]" style={{ color: '#94A3B8' }}>
                      View once {msg.media_type === 'view_once_video' ? 'video' : 'photo'}
                    </span>
                  </div>
                );
              }
              return (
                <button
                  className="flex items-center gap-2 px-4 py-3 w-full hover:bg-white/10 active:bg-white/20 transition-all active:scale-[0.98] touch-manipulation"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(20);
                    onMarkViewOnce(msg.id);
                    onOpenMedia(msg.media_url!);
                  }}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Eye className="w-5 h-5" style={{ color: '#7C3AED' }} />
                  <span className="text-[14px] font-medium" style={{ color: '#7C3AED' }}>
                    Tap to view {msg.media_type === 'view_once_video' ? 'video' : 'photo'}
                  </span>
                </button>
              );
            })()}

            {/* Capturing Moment */}
            {msg.media_url && msg.media_type === 'capturing_moment' && (() => {
              const hasViewed = viewedOnceMessages.has(msg.id);
              const isOwnCapturingMoment = msg.sender_id === userId;
              if (hasViewed) {
                return (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="relative">
                      <Camera className="w-5 h-5" style={{ color: '#4B5563' }} />
                      <XIcon className="w-4 h-4 absolute -top-1 -right-1" style={{ color: '#4B5563' }} />
                    </div>
                    <span className="text-[14px] italic" style={{ color: '#4B5563' }}>Moment viewed</span>
                  </div>
                );
              }
              if (isOwnCapturingMoment) {
                return (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Camera className="w-4 h-4" style={{ color: '#94A3B8' }} />
                    <span className="text-[14px]" style={{ color: '#94A3B8' }}>
                      Capture Moment
                    </span>
                  </div>
                );
              }
              return (
                <button
                  className="flex items-center gap-2 px-4 py-3 w-full hover:bg-white/10 active:bg-white/20 transition-all active:scale-[0.98] touch-manipulation"
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(20);
                    onMarkViewOnce(msg.id);
                    onOpenMedia(msg.media_url!);
                  }}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Camera className="w-5 h-5" style={{ color: '#7C3AED' }} />
                  <span className="text-[14px] font-medium" style={{ color: '#7C3AED' }}>
                    Tap to view Capture Moment
                  </span>
                </button>
              );
            })()}

            {/* Regular media */}
            {msg.media_url && msg.content?.trim().toLowerCase().startsWith('sketch drawing') && (
              <p className="text-[13px] font-semibold px-3.5 pt-2.5 text-white">Sketch drawing</p>
            )}
            {msg.media_url && (msg.media_type === 'image' || msg.media_type === 'images') && (() => {
              let urls: string[] = [];
              try { urls = msg.media_type === 'images' ? JSON.parse(msg.media_url!) : [msg.media_url!]; } catch { urls = [msg.media_url!]; }
              return (
                <div className={cn('relative', isSensitive && 'cursor-pointer group')} onClick={() => isSensitive && onOpenMedia(urls[0])}>
                  <div className={cn(isSensitive && 'blur-2xl grayscale brightness-50 transition-all group-hover:blur-xl')}>
                    <ChatImageGrid urls={urls} isOwn={isOwn} onImageTap={onOpenMedia} />
                  </div>
                  {isSensitive && (
                    <div className='absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center'>
                      <Shield className='w-8 h-8 mb-2 text-purple-400' />
                      <p className='text-xs font-bold uppercase tracking-wider'>Sensitive Content</p>
                      <p className='text-[10px] opacity-70'>Tap to view</p>
                    </div>
                  )}
                </div>
              );
            })()}
            {msg.media_url && msg.media_type === 'video' && (
              <div className={cn('relative cursor-pointer group', isSensitive && 'overflow-hidden rounded-xl')} onClick={() => onOpenMedia(msg.media_url!)}>
                <div className={cn(isSensitive && 'blur-2xl grayscale brightness-50 transition-all group-hover:blur-xl')}>
                  <ChatVideoPlayer src={msg.media_url} disableTap />
                </div>
                {isSensitive && (
                  <div className='absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center'>
                    <Shield className='w-8 h-8 mb-2 text-purple-400' />
                    <p className='text-xs font-bold uppercase tracking-wider'>Sensitive Content</p>
                    <p className='text-[10px] opacity-70'>Tap to view</p>
                  </div>
                )}
              </div>
            )}
            {false && (
              <div className="cursor-pointer" onClick={() => onOpenMedia(msg.media_url!)}>
                <ChatVideoPlayer src={msg.media_url} />
              </div>
            )}
            {msg.media_url && msg.media_type === 'audio' && (
              <div className="p-2">
                <audio src={msg.media_url} controls className="w-full max-w-[260px]" />
              </div>
            )}
            {msg.media_url && msg.media_type === 'document' && (
              <div className="p-3">
                <a href={docUrl || msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline text-white">
                  <Paperclip className="w-4 h-4" /> Document
                </a>
              </div>
            )}

            {!msg.media_url && locationCoords && (
              <div className="p-2.5">
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <iframe
                    title="Shared location"
                    className="w-full h-36"
                    src={`https://maps.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}&z=15&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <a
                  href={`https://maps.google.com/?q=${locationCoords.lat},${locationCoords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[12px] text-sky-300 underline"
                >
                  <MapPin className="w-3.5 h-3.5" /> Open in Maps
                </a>
              </div>
            )}

            {/* Shared post */}
            {msg.content && isSharedPostMessage(msg.content) && (() => {
              const postId = extractInternalPostId(msg.content);
              return postId ? <SharedPostPreview postId={postId} className="my-0.5" onViewFullPosts={onViewFullPosts} /> : null;
            })()}

            {/* Poll Display */}
            {msg.content && (msg.media_type === 'poll' || msg.content.startsWith('📊 POLL:')) && (
              <PollDisplay content={msg.content} isOwn={isOwn} />
            )}

            {/* Text */}
            {msg.content && !locationCoords && !msg.content.startsWith('📎 ') && msg.content !== '🎤 Voice message' && msg.content.trim() !== '' && msg.content.trim() !== ' ' && !isSharedPostMessage(msg.content) && !msg.content.trim().toLowerCase().startsWith('sketch drawing') && (msg.media_type !== 'poll' && !msg.content.startsWith('📊 POLL:')) && (
              <p className={cn('text-[15px] break-words leading-relaxed text-white', msg.media_url ? 'px-3.5 py-2.5' : '')}>
                {msg.content}
              </p>
            )}

            {/* Link preview */}
            {msg.content && !isSharedPostMessage(msg.content) && extractUrls(msg.content).slice(0, 1).map(url => (
              <LinkPreviewCard key={url} url={url} className="mt-1 mx-1 mb-1" />
            ))}
          </div>

          {/* Reactions */}
          {Object.keys(reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
              {Object.entries(reactions).filter(([, count]) => count > 0).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[13px] transition-transform active:scale-110"
                  style={{
                    background: userReactionSet.has(emoji) ? 'rgba(124,58,237,0.2)' : '#111827',
                    border: userReactionSet.has(emoji) ? '1px solid #7C3AED' : '1px solid #1f2937',
                  }}
                  onClick={() => onReact(msg.id, emoji)}
                >
                  {emoji}{count > 1 && <span className="text-[11px] font-medium" style={{ color: userReactionSet.has(emoji) ? '#A78BFA' : '#94A3B8' }}>{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Meta (owner for media, time/read for text) */}
          {msg.media_url ? (
            <div className={cn('flex items-center mt-0.5 px-0.5', isOwn ? 'justify-end' : 'justify-start')}>
              <span className="text-[11px]" style={{ color: '#64748B' }}>
                {isOwn ? 'You' : displayName || 'User'}
              </span>
            </div>
          ) : (
            <div className={cn('flex items-center gap-1 mt-0.5 px-0.5', isOwn ? 'justify-end' : 'justify-start')}>
              <span className="text-[11px]" style={{ color: '#4B5563' }}>
                {formatMsgTime(msg.created_at || '')}
              </span>
              {isEdited && <span className="text-[10px] italic" style={{ color: '#4B5563' }}>edited</span>}
              {isOwn && (
                msg.is_read
                  ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                  : <Check className="w-3.5 h-3.5" style={{ color: '#4B5563' }} />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
});

interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  visibleMessages: Array<Message & { reply_to_id?: string; edited_at?: string }>;
  userId: string;
  messageReactions: Record<string, Record<string, number>>;
  userReactions: Record<string, Set<string>>;
  pinnedMessages: Set<string>;
  getDateLabel: (dateStr: string) => string;
  displayName: string;
  viewedOnceMessages: Set<string>;
  allChatMedia: { url: string; type: 'image' | 'video' }[];
  messageMap: Map<string, Message & { reply_to_id?: string }>;
  bubbleGradient: string;
  onReact: (msgId: string, emoji: string) => void;
  onLongPress: (msgId: string) => void;
  onOpenActions: (msgId: string) => void;
  onSwipeReply: (msgId: string) => void;
  onMarkViewOnce: (msgId: string) => void;
  onOpenMedia: (url: string) => void;
  onOpenMediaByIndex: (index: number) => void;
  formatMsgTime: (dateStr: string) => string;
  simpleMode?: boolean;
  setSize: (index: number, size: number) => void;
  onViewFullPosts?: () => void;
}

const MessageRow = memo(function MessageRow({
  index,
  style,
  visibleMessages,
  userId,
  messageReactions,
  userReactions,
  pinnedMessages,
  getDateLabel,
  displayName,
  viewedOnceMessages,
  allChatMedia,
  messageMap,
  bubbleGradient,
  onReact,
  onLongPress,
  onOpenActions,
  onSwipeReply,
  onMarkViewOnce,
  onOpenMedia,
  onOpenMediaByIndex,
  formatMsgTime,
  simpleMode = false,
  setSize,
  onViewFullPosts,
}: MessageRowProps) {
  const msg = visibleMessages[index];
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const measure = () => {
      const height = el.getBoundingClientRect().height;
      setSize(index, Math.max(48, Math.round(height)));
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [index, setSize]);

  const isOwn = msg.sender_id === userId;
  const isSensitive = msg.content?.includes('[SENSITIVE]');
  const reactions = messageReactions[msg.id] || {};
  const userReactionSet = userReactions[msg.id] || new Set<string>();
  const isPinned = pinnedMessages.has(msg.id);
  const dateLabel = getDateLabel(msg.created_at || '');
  const prevMsg = visibleMessages[index - 1];
  const showDate = index === 0 || dateLabel !== getDateLabel(prevMsg?.created_at || '');

  return (
    <div style={style}>
      <div ref={rowRef}>
        <MessageItem
          key={msg.id}
          msg={msg}
          isOwn={isOwn}
          reactions={reactions}
          userReactionSet={userReactionSet}
          isPinned={isPinned}
          showDate={showDate}
          dateLabel={dateLabel}
          displayName={displayName}
          userId={userId}
          viewedOnceMessages={viewedOnceMessages}
          allChatMedia={allChatMedia}
          messageMap={messageMap}
          bubbleGradient={bubbleGradient}
          onReact={onReact}
          onLongPress={onLongPress}
          onOpenActions={onOpenActions}
          onSwipeReply={onSwipeReply}
          onMarkViewOnce={onMarkViewOnce}
          onOpenMedia={onOpenMedia}
          onOpenMediaByIndex={onOpenMediaByIndex}
          formatMsgTime={formatMsgTime}
          simpleMode={simpleMode}
          onViewFullPosts={onViewFullPosts}
        />
      </div>
    </div>
  );
});

interface MessageListProps {
  messages: (Message & { reply_to_id?: string; edited_at?: string })[];
  userId: string;
  displayName: string;
  messageReactions: Record<string, Record<string, number>>;
  userReactions: Record<string, Set<string>>;
  pinnedMessages: Set<string>;
  viewedOnceMessages: Set<string>;
  allChatMedia: { url: string; type: 'image' | 'video' }[];
  messagesEndRef: RefObject<HTMLDivElement>;
  scrollContainerRef?: RefObject<HTMLDivElement>;
  hasMore?: boolean;
  loadingMore?: boolean;
  bubbleGradient?: string;
  onLoadMore?: () => void;
  onReact: (msgId: string, emoji: string) => void;
  onLongPress: (msgId: string) => void;
  onOpenActions: (msgId: string) => void;
  onSwipeReply: (msgId: string) => void;
  onMarkViewOnce: (msgId: string) => void;
  onOpenMedia: (url: string) => void;
  onOpenMediaByIndex: (index: number) => void;
  formatMsgTime: (dateStr: string) => string;
  getDateLabel: (dateStr: string) => string;
  simpleMode?: boolean;
  onViewFullPosts?: () => void;
}

export const MessageList = memo(function MessageList({
  messages,
  userId,
  displayName,
  messageReactions,
  userReactions,
  pinnedMessages,
  viewedOnceMessages,
  allChatMedia,
  messagesEndRef,
  hasMore = false,
  loadingMore = false,
  bubbleGradient = 'linear-gradient(135deg, #7C3AED, #6D28D9)',
  onLoadMore,
  onReact,
  onLongPress,
  onOpenActions,
  onSwipeReply,
  onMarkViewOnce,
  onOpenMedia,
  onOpenMediaByIndex,
  formatMsgTime,
  getDateLabel,
  scrollContainerRef,
  simpleMode = false,
  onViewFullPosts,
}: MessageListProps) {
  const INITIAL_WINDOW_SIZE = 140;
  const WINDOW_STEP = 80;

  const messageMap = useMemo(
    () => new Map(messages.map(m => [m.id, m])),
    [messages]
  );

  const [renderStartIndex, setRenderStartIndex] = useState(() => Math.max(0, messages.length - INITIAL_WINDOW_SIZE));
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const swipeThresholdPx = simpleMode ? LOW_END_SWIPE_THRESHOLD_PX : DEFAULT_SWIPE_THRESHOLD_PX;
  const horizontalIntentRatio = simpleMode ? LOW_END_HORIZONTAL_INTENT_RATIO : DEFAULT_HORIZONTAL_INTENT_RATIO;
  
  useEffect(() => {
    setRenderStartIndex((prev) => {
      if (messages.length <= INITIAL_WINDOW_SIZE) return 0;
      const tailStart = Math.max(0, messages.length - INITIAL_WINDOW_SIZE);
      if (prev >= tailStart - WINDOW_STEP) return tailStart;
      return Math.min(prev, messages.length - 1);
    });
  }, [messages.length]);

  // Optimized scroll-to-bottom: use 'auto' for initial load/instant feel, 'smooth' for new incoming messages if near bottom
  useEffect(() => {
    if (!shouldScrollToBottom || !messagesEndRef.current) return;
    
    const isInitialLoad = messages.length > 0 && messages.length <= INITIAL_WINDOW_SIZE;
    
    if (isInitialLoad) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    } else {
      // Use smooth only for subsequent new messages to maintain context
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  const visibleMessages = useMemo(() => messages.slice(renderStartIndex), [messages, renderStartIndex]);
  const hiddenLoadedCount = renderStartIndex;

  useEffect(() => {
    if (simpleMode) return;
    if (!listRef.current) return;
    if (visibleMessages.length === 0) return;

    const lastIndex = visibleMessages.length - 1;
    requestAnimationFrame(() => {
      listRef.current?.scrollToItem(lastIndex, 'end');
    });
  }, [visibleMessages.length, simpleMode]);

  const sizeMap = useRef<Map<number, number>>(new Map());
  const listRef = useRef<any>(null);
  const setSize = useCallback((index: number, size: number) => {
    const prev = sizeMap.current.get(index) || 0;
    if (prev !== size) {
      sizeMap.current.set(index, size);
      if (listRef.current) listRef.current.resetAfterIndex(index);
    }
  }, []);

  const getSize = (index: number) => sizeMap.current.get(index) || DEFAULT_ROW_HEIGHT;

  const [listHeight, setListHeight] = useState<number>(() => 600);
  useEffect(() => {
    const compute = () => {
      const c = scrollContainerRef?.current;
      const h = c?.clientHeight ?? Math.max(400, Math.min(window.innerHeight - 200, 800));
      setListHeight(h);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [scrollContainerRef]);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <MessageRow
      index={index}
      style={style}
      visibleMessages={visibleMessages}
      userId={userId}
      messageReactions={messageReactions}
      userReactions={userReactions}
      pinnedMessages={pinnedMessages}
      getDateLabel={getDateLabel}
      displayName={displayName}
      viewedOnceMessages={viewedOnceMessages}
      allChatMedia={allChatMedia}
      messageMap={messageMap}
      bubbleGradient={bubbleGradient}
      onReact={onReact}
      onLongPress={onLongPress}
      onOpenActions={onOpenActions}
      onSwipeReply={onSwipeReply}
      onMarkViewOnce={onMarkViewOnce}
      onOpenMedia={onOpenMedia}
      onOpenMediaByIndex={onOpenMediaByIndex}
      formatMsgTime={formatMsgTime}
      simpleMode={simpleMode}
      setSize={setSize}
      onViewFullPosts={onViewFullPosts}
    />
  );

  return (
    <div className="w-full">
      {hiddenLoadedCount > 0 && (
        <div className="flex justify-center py-2">
          <button
            onClick={() => setRenderStartIndex((prev) => Math.max(0, prev - WINDOW_STEP))}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-all active:scale-95"
            style={{ background: '#0f172a', color: '#94A3B8', border: '1px solid #334155' }}
          >
            Show older loaded messages ({hiddenLoadedCount} hidden)
          </button>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center py-3">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 disabled:opacity-60"
            style={{ background: '#1e293b', color: '#94A3B8', border: '1px solid #374151' }}
          >
            {loadingMore ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
            ) : (
              <><ChevronUp className="w-3.5 h-3.5" /> Load older messages</>
            )}
          </button>
        </div>
      )}

      {simpleMode ? (
        <div className="w-full">
          {visibleMessages.map((msg, index) => {
            const isOwn = msg.sender_id === userId;
          const isSensitive = msg.content?.includes('[SENSITIVE]');
          const cleanContent = msg.content?.replace('[SENSITIVE] ', '').replace('[SENSITIVE]', '');
             const reactions = messageReactions[msg.id] || {};
             const userReactionSet = userReactions[msg.id] || new Set<string>();
             const isPinned = pinnedMessages.has(msg.id);
             const dateLabel = getDateLabel(msg.created_at || '');
             const prevMsg = visibleMessages[index - 1];
             const showDate = index === 0 || dateLabel !== getDateLabel(prevMsg?.created_at || '');

            return (
              <MessageItem
                key={msg.id}
                msg={msg}
                isOwn={isOwn}
                reactions={reactions}
                userReactionSet={userReactionSet}
                isPinned={isPinned}
                showDate={showDate}
                dateLabel={dateLabel}
                displayName={displayName}
                userId={userId}
                viewedOnceMessages={viewedOnceMessages}
                allChatMedia={allChatMedia}
                messageMap={messageMap}
                bubbleGradient={bubbleGradient}
                onReact={onReact}
                onLongPress={onLongPress}
                onOpenActions={onOpenActions}
                onSwipeReply={onSwipeReply}
                onMarkViewOnce={onMarkViewOnce}
                onOpenMedia={onOpenMedia}
                onOpenMediaByIndex={onOpenMediaByIndex}
                formatMsgTime={formatMsgTime}
                simpleMode={simpleMode}
                onViewFullPosts={onViewFullPosts}
              />
            );
          })}
        </div>
      ) : (
        <List
          height={listHeight}
          itemCount={visibleMessages.length}
          itemSize={getSize}
          width={'100%'}
          ref={listRef}
          overscanCount={8}
          className="no-scrollbar"
        >
          {Row}
        </List>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});
