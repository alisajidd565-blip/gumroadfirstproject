import type { Channel, BrandVoice } from '@/types';

// ─── Voice instruction map ────────────────────────────────────────────────────

const VOICE_INSTRUCTIONS: Record<BrandVoice, string> = {
  professional:
    'Use a polished, formal, expert tone. Write as a credible industry authority. Avoid slang.',
  casual:
    'Use a friendly, conversational tone. Write like you are talking to a friend. Be approachable and warm.',
  witty:
    'Use clever wordplay, light humor, and memorable phrasing. Be entertaining while still delivering value.',
  authoritative:
    'Use a bold, confident, decisive tone. Make strong statements. Project expertise and leadership.',
  inspirational:
    'Use an uplifting, motivating tone. Connect with emotions. Inspire the reader to act or think differently.',
  educational:
    'Use a clear, instructive tone. Break down complex ideas simply. Prioritize clarity and understanding.',
};

// ─── Channel prompt builders ──────────────────────────────────────────────────

/**
 * Twitter/X — Short-form hook + thread potential.
 * Hard limit: 280 chars per tweet. We generate one high-impact tweet.
 */
function buildTwitterPrompt(sourceText: string, voice: BrandVoice): string {
  return `You are an expert social media copywriter specializing in Twitter/X.

BRAND VOICE: ${VOICE_INSTRUCTIONS[voice]}

SOURCE CONTENT:
"""
${sourceText.slice(0, 6000)}
"""

YOUR TASK:
Write a single, high-impact Twitter/X post based on the source content above.

RULES:
- Maximum 280 characters (hard limit — count every character)
- Open with a powerful hook that stops the scroll
- Distill the single most valuable insight from the content
- End with a clear call to action or thought-provoking question
- No hashtags unless they fit naturally within the character count
- No filler phrases like "In this post..." or "Thread below"
- Do NOT use emojis unless the voice is casual or witty
- Return ONLY the tweet text. No labels, no explanation.`;
}

/**
 * LinkedIn — Professional long-form post with structure and hooks.
 */
function buildLinkedInPrompt(sourceText: string, voice: BrandVoice): string {
  return `You are an expert LinkedIn content strategist.

BRAND VOICE: ${VOICE_INSTRUCTIONS[voice]}

SOURCE CONTENT:
"""
${sourceText.slice(0, 6000)}
"""

YOUR TASK:
Write a high-performing LinkedIn post based on the source content.

STRUCTURE TO FOLLOW:
1. HOOK (lines 1-2): A bold, curiosity-driving opening that forces the reader to click "see more". No generic openers like "Today I want to share...".
2. CONTEXT (2-3 sentences): Why this matters. The problem or opportunity.
3. BODY (3-5 key points or a short story): The core value. Use line breaks for readability. Bullet points or numbered lists work well here.
4. TAKEAWAY (1-2 sentences): The key lesson or action item.
5. CTA (1 sentence): Invite engagement (comment, share, or reflect).

RULES:
- Total length: 1,200 to 1,800 characters
- Use short paragraphs (1-3 sentences max per paragraph) for LinkedIn readability
- Use relevant emojis sparingly (1-3 total) unless voice is professional
- End with 3-5 relevant hashtags on a new line
- Do NOT write a generic post — make it feel personal and specific to the content
- Return ONLY the post text. No labels, no explanation.`;
}

/**
 * Instagram — Visual-first caption with emojis and hashtags.
 */
function buildInstagramPrompt(sourceText: string, voice: BrandVoice): string {
  return `You are an expert Instagram content creator.

BRAND VOICE: ${VOICE_INSTRUCTIONS[voice]}

SOURCE CONTENT:
"""
${sourceText.slice(0, 6000)}
"""

YOUR TASK:
Write a compelling Instagram caption based on the source content.

STRUCTURE:
1. OPENING LINE: A single punchy line that hooks immediately (shows before "more"). Use emojis strategically.
2. BODY: 3-5 sentences expanding on the core message. Conversational and engaging. Use line breaks.
3. CALL TO ACTION: Ask a question or invite the reader to tag someone, comment, or save the post.
4. HASHTAGS: A curated block of 15-20 highly relevant hashtags at the end (mix popular and niche).

RULES:
- Caption length: 150-300 words (excluding hashtags)
- Use emojis naturally throughout — they should enhance, not overwhelm
- The caption should complement a visual (assume the visual shows the topic)
- Hashtags must be on separate lines after 2-3 blank lines from the caption
- Return ONLY the caption text with hashtags. No labels, no explanation.`;
}

/**
 * Email Newsletter — Full subject line + structured email body.
 */
function buildEmailPrompt(sourceText: string, voice: BrandVoice): string {
  return `You are an expert email copywriter and newsletter strategist.

BRAND VOICE: ${VOICE_INSTRUCTIONS[voice]}

SOURCE CONTENT:
"""
${sourceText.slice(0, 6000)}
"""

YOUR TASK:
Write a complete email newsletter based on the source content. Include both the subject line and full body.

FORMAT YOUR RESPONSE EXACTLY AS:
SUBJECT: [your subject line here]

PREVIEW: [email preview text, 90-110 characters]

---

[Full email body below]

STRUCTURE OF THE EMAIL BODY:
1. GREETING: Brief, warm, personal opener (1 sentence).
2. HOOK (1 paragraph): The main idea stated compellingly. Why should they keep reading?
3. SECTION 1 — The Core Insight: 2-3 paragraphs with the main value from the source content.
4. SECTION 2 — Key Takeaways or Action Steps: A short numbered list (3-5 items).
5. CLOSING: A personal sign-off and clear CTA (visit a link, reply, share).

RULES:
- Subject line: 40-55 characters, curiosity-driven, avoid spam trigger words (FREE, CLICK HERE, etc.)
- Total body length: 400-650 words
- Use short paragraphs (2-4 sentences each)
- Write in first-person singular as if from a real person
- Do NOT include placeholder text like [Your Name] — write the full email as-is
- Return ONLY the formatted email. No extra explanation.`;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function buildPrompt(
  channel: Channel,
  sourceText: string,
  voice: BrandVoice
): string {
  switch (channel) {
    case 'twitter':   return buildTwitterPrompt(sourceText, voice);
    case 'linkedin':  return buildLinkedInPrompt(sourceText, voice);
    case 'instagram': return buildInstagramPrompt(sourceText, voice);
    case 'email':     return buildEmailPrompt(sourceText, voice);
    default:
      throw new Error(`Unknown channel: ${channel}`);
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT =
  'You are ContentRepurposer AI — a world-class content strategist and copywriter. ' +
  'You transform raw source material into platform-optimized, high-performing content. ' +
  'You always follow instructions precisely, never add commentary, and return only the requested content. ' +
  'Your writing is specific, non-generic, and tailored to the given brand voice.';
