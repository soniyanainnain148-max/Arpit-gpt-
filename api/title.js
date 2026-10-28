export const config = { runtime: 'edge' };

const UPSTREAM = 'https://api.abliteration.ai/v1/chat/completions';

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const key = process.env.ABLITERATION_API_KEY;
  if (!key) return new Response('Missing key', { status: 500 });

  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const firstMsg = String(body.message || '').slice(0, 500);

  const res = await fetch(UPSTREAM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: process.env.MODEL_NAME || 'abliterated-model',
      messages: [
        { role: 'system', content: 'Generate a 3-5 word title for this chat. Return ONLY the title, no quotes, no punctuation at end.' },
        { role: 'user', content: firstMsg }
      ],
      temperature: 0.5,
      max_tokens: 20,
      stream: false
    })
  });

  const data = await res.json();
  const title = (data.choices?.[0]?.message?.content || 'New Chat')
    .trim().replace(/^["']|["']$/g, '').slice(0, 50);

  return new Response(JSON.stringify({ title }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
