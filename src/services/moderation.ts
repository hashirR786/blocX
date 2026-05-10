export interface ModerationResult {
  isFlagged: boolean;
  reason?: string;
}

// Fallback basic list of toxic words
const BASIC_BANNED_WORDS = [
  'hate', 'kill', 'murder', 'terror', 'bomb', 'racist', 'nazi'
];

export async function moderateContent(text: string, imageFile?: File | null): Promise<ModerationResult> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if ((!text || text.trim() === '') && !imageFile) {
    return { isFlagged: false };
  }

  // 1. If Groq API key is provided, use Llama 3.3
  if (apiKey && apiKey !== '' && !apiKey.includes('your_groq_api_key_here')) {
    try {
      const contentArray: any[] = [];
      
      if (text && text.trim() !== '') {
        contentArray.push({ type: 'text', text: `Content to evaluate: "${text}"` });
      }

      // NOTE: Groq has temporarily removed all Vision models, so we can only moderate text right now.
      if (imageFile && (!text || text.trim() === '')) {
        // If it's an image-only post, we just allow it since we can't scan it right now.
        return { isFlagged: false };
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are a strict content moderator for a Web3 social network. Evaluate the user post/comment.
Allow positive slang like "you killed it", "this is sick", "dope", etc. 
Flag actual hate speech, credible threats of violence, self-harm, harassment, explicit sexual content, or illegal acts.

Return EXACTLY a JSON object and nothing else. Do not use markdown formatting.
Format:
{
  "isFlagged": boolean,
  "reason": "If flagged, a short specific reason. If not flagged, leave empty string."
}`
            },
            {
              role: 'user',
              content: contentArray
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const responseText = data.choices[0].message.content;
        
        try {
          // Clean up in case Llama outputs markdown formatting despite instructions
          const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const result = JSON.parse(cleanJson);
          return {
            isFlagged: result.isFlagged,
            reason: result.isFlagged ? `Flagged: ${result.reason}` : undefined
          };
        } catch (e) {
          console.error('[BlocX] Failed to parse Llama 3 response:', responseText);
          return { isFlagged: false }; // Fail open if parsing fails
        }
      } else {
        const errorData = await response.json();
        console.error('[BlocX] Groq API Error:', errorData);
        return { isFlagged: true, reason: `Groq API Error: ${errorData.error?.message || response.statusText}` };
      }
    } catch (error: any) {
      console.error('[BlocX] Groq API fetch failed, falling back to keyword filter:', error);
      // Fail open — don't block the user if the API is unreachable
      // Fall through to keyword filter below
    }
  }

  // 2. Fallback: Basic keyword filtering if no API key is set
  if (text) {
    const lowerText = text.toLowerCase();
    for (const word of BASIC_BANNED_WORDS) {
      // Use word boundaries so "killed" doesn't trigger "kill"
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return { 
          isFlagged: true, 
          reason: `Flagged as inappropriate (prohibited language: ${word})` 
        };
      }
    }
  }

  return { isFlagged: false };
}
