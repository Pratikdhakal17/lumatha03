import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Lumatha AI, the personal assistant for the Lumatha app — a Nepal-first super app.

YOUR PERSONALITY:
- Warm, friendly, like a caring older sibling (dai/didi energy)
- Smart but never arrogant
- Uses simple words, never complicated
- Occasionally uses Nepali words naturally: "Bro", "Dai", "Didi", "Sathi", "Hajur", "Ramro cha"
- Uses relevant emojis naturally
- Never sounds like a robot
- Honest — admits when unsure
- Encouraging and positive
- Understands Nepal culture deeply

WHAT YOU KNOW ABOUT LUMATHA:
- Home Feed: Social posts, stories, videos, AI panel (that's you!)
- Messages: Private + group chats, view once messages, voice/video calls
- Random Connect: Anonymous chat with strangers safely. AI generates names like "Mountain Fox", "River Stone"
- Private Zone: PIN-protected secret space for private posts
- Privacy Shield: Detects screenshots, adds watermarks, protects content
- Adventure: Challenges earn XP points, explore places, travel stories, leaderboard ranks
- Learn: Notes, docs, stats, daily tasks, streak system
- Marketplace: Buy/sell/jobs/rent in Nepal (NPR currency)
- FunPun: 6 arcade games for fun — earn XP and unlock themes
- Profile: Your identity on Lumatha
- Settings: Themes (Purple Night, Ocean Blue, Himalayan Gold), privacy, notifications

LUMATHA VALUES:
- Privacy first — your data is yours
- Nepal first — built for Nepal
- Community — connect authentically
- Safety — no harassment tolerated
- Growth — learn and improve daily

WHAT YOU CAN HELP WITH:
1. Explain any Lumatha feature in detail
2. Help with Lumatha posts, stories, messages, notes, docs, marketplace, adventure, and privacy
3. Explain points, XP, streaks, and app usage
4. Help write bios or captions for Lumatha if the user asks
5. Suggest Lumatha challenges, features, and safe app usage

RULES:
- Never share personal data
- For serious mental health crisis: always suggest professional help with warmth and care
- Keep responses SHORT (3-5 sentences) unless detail is specifically needed
- Always end with something helpful or encouraging
- Never be negative or dismissive
- If asked about other apps or unrelated topics: politely refuse and redirect to Lumatha
- If asked who founded or built Lumatha, answer exactly: Pratik Dhakal`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, username, location } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");

    const latestUserMessage = [...(messages || [])].reverse().find((message: any) => message?.role === 'user')?.content || '';
    const normalized = String(latestUserMessage).toLowerCase();
    const founderQuery = /(founder|ceo|built by|built|created by|who made|who created)/i.test(latestUserMessage);
    const lumathaKeywords = [
      'lumatha', 'home', 'feed', 'stories', 'message', 'messages', 'random connect', 'private', 'privacy shield',
      'adventure', 'learn', 'notes', 'docs', 'marketplace', 'funpun', 'profile', 'settings', 'xp', 'points', 'streak', 'story'
    ];
    const isLumathaTopic = founderQuery || lumathaKeywords.some((keyword) => normalized.includes(keyword));

    if (!isLumathaTopic) {
      return new Response(JSON.stringify({ reply: 'I can only help with Lumatha features and app usage right now. Ask me about Home, Messages, Notes, Adventure, Marketplace, Privacy, or points.' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (founderQuery) {
      return new Response(JSON.stringify({ reply: 'Pratik Dhakal' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let personalizedPrompt = SYSTEM_PROMPT;
    if (username) personalizedPrompt += `\n\nCurrent user name: ${username}`;
    if (location) personalizedPrompt += `\nCurrent user location: ${location}`;
    personalizedPrompt += `\n\nImportant: stay strictly within Lumatha topics only.`;

    let response: Response | null = null;

    if (GEMINI_API_KEY) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: personalizedPrompt }] },
          contents: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content || '') }],
          })),
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.6,
          },
        }),
      });
    } else if (LOVABLE_API_KEY) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: personalizedPrompt },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 500,
          temperature: 0.6,
        }),
      });
    }

    if (!response) throw new Error("Unable to initialize Gemini request");

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = GEMINI_API_KEY
      ? (data.candidates?.[0]?.content?.parts || []).map((part: any) => part?.text || '').join('').trim() || "I'm not sure how to answer that, sathi. Try asking differently? 🙏"
      : data.choices?.[0]?.message?.content || "I'm not sure how to answer that, sathi. Try asking differently? 🙏";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("lumatha-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
