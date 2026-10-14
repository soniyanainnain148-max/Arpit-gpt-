export const config = { runtime: 'edge' };

const UPSTREAM = 'https://api.abliteration.ai/v1/chat/completions';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const key = process.env.ABLITERATION_API_KEY;
  if (!key) {
    return new Response('Server is missing ABLITERATION_API_KEY', { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  // Only forward the fields we allow, so the key can't be abused for other things
  const payload = {
    model: process.env.MODEL_NAME || 'abliterated-model',
    messages: Array.isArray(body.messages) ? body.messages.slice(-40) : [],
    temperature: Math.min(Math.max(Number(body.temperature) || 0.4, 0), 1.5),
    stream: true
  };

  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify(payload)
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  });
}
