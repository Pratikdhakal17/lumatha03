import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRandomConnect } from '@/hooks/useRandomConnect';
import { useRandomConnectMemories } from '@/hooks/useRandomConnectMemories';
import { ModeSelector } from '@/components/randomconnect/ModeSelector';
import { SearchingView } from '@/components/randomconnect/SearchingView';
import { AudioConnect } from '@/components/randomconnect/AudioConnect';
import { VideoConnect } from '@/components/randomconnect/VideoConnect';
import { TextConnectV2 } from '@/components/randomconnect/TextConnectV2';
import { SavedMemories } from '@/components/randomconnect/SavedMemories';
import { Heart, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const RandomConnect: React.FC = () => {
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(0);
  const [showMemories, setShowMemories] = useState(false);
  const prevStatusRef = useRef<string>('idle');

  const {
    status, mode, setMode, language, setLanguage, region, setRegion,
    interests, setInterests, matchedInterests,
    myPseudoName, partnerPseudoName, session, messages,
    conversationStarter, textMemory, isBanned,
    startSearching, cancelSearch, skipToNext, sendMessage,
    recordViolation, clearTextMemory
  } = useRandomConnect();

  const {
    memories, saveMemory, clearMemory, clearAllMemories,
    sendReconnectRequest, respondToReconnect
  } = useRandomConnectMemories();

  useEffect(() => {
    if (status === 'connected') sessionStartRef.current = Date.now();
  }, [status]);

  // "Connect Again" toast when returning to idle from connected
  useEffect(() => {
    if (prevStatusRef.current === 'connected' && status === 'idle') {
      toast('Session ended', {
        description: 'Want to connect with someone new?',
        action: {
          label: '💜 Connect Again',
          onClick: () => startSearching(),
        },
        duration: 6000,
      });
    }
    prevStatusRef.current = status;
  }, [status, startSearching]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('reconnect-sessions')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'random_connect_sessions',
        filter: `user2_id=eq.${user.id}`
      }, (payload) => {
        const s = payload.new as any;
        if (s.conversation_starter?.includes('reconnect')) {
          toast.success('Reconnect session ready!');
          setShowMemories(false);
        }
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  const handleSkip = useCallback(() => {
    if (session && partnerPseudoName) {
      const dur = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      saveMemory(session.id, partnerPseudoName, mode, dur);
    }
    skipToNext();
  }, [session, partnerPseudoName, mode, skipToNext, saveMemory]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center" style={{ background: 'hsl(220,60%,8%)' }}>
        <Heart className="w-16 h-16 text-[hsl(270,70%,50%)] mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Random Connect</h2>
        <p className="text-muted-foreground">Please sign in to connect with others.</p>
      </div>
    );
  }

  if (showMemories) {
    return (
      <div className="min-h-screen pb-20" style={{ background: 'hsl(220,60%,8%)' }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/30">
          <button onClick={() => setShowMemories(false)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Memories
          </h2>
        </div>
        <div className="h-[calc(100vh-80px)]">
          <SavedMemories
            memories={memories}
            onClearMemory={clearMemory}
            onClearAll={clearAllMemories}
            onSendReconnect={sendReconnectRequest}
            onRespondReconnect={respondToReconnect}
          />
        </div>
      </div>
    );
  }

  const partnerId = session?.user1_id === user.id ? session?.user2_id : session?.user1_id;

  return (
    <div className="h-screen overflow-y-auto pb-20" style={{ background: 'hsl(220,60%,8%)' }}>
      {status === 'idle' && (
        <ModeSelector
          mode={mode} setMode={setMode}
          language={language} setLanguage={setLanguage}
          region={region} setRegion={setRegion}
          interests={interests} setInterests={setInterests}
          onStart={startSearching} isBanned={isBanned}
          onOpenMemories={() => setShowMemories(true)}
        />
      )}

      {status === 'searching' && (
        <SearchingView mode={mode} myPseudoName={myPseudoName} onCancel={cancelSearch} />
      )}

      {status === 'connected' && mode === 'audio' && (
        <AudioConnect myPseudoName={myPseudoName} partnerPseudoName={partnerPseudoName}
          conversationStarter={conversationStarter} onSkip={handleSkip}
          onViolation={recordViolation} sessionId={session?.id} partnerId={partnerId} />
      )}

      {status === 'connected' && mode === 'video' && (
        <VideoConnect myPseudoName={myPseudoName} partnerPseudoName={partnerPseudoName}
          conversationStarter={conversationStarter} onSkip={handleSkip}
          onViolation={recordViolation} sessionId={session?.id} partnerId={partnerId} />
      )}

      {status === 'connected' && mode === 'text' && (
        <TextConnectV2 myPseudoName={myPseudoName} partnerPseudoName={partnerPseudoName}
          conversationStarter={conversationStarter} messages={messages as any}
          sessionId={session?.id || null} textMemory={textMemory}
          onSendMessage={sendMessage} onSkip={handleSkip}
          onViolation={recordViolation} onClearMemory={clearTextMemory} partnerId={partnerId}
          matchedInterests={matchedInterests} />
      )}
    </div>
  );
};

export default RandomConnect;
