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

  // Allow messages with text OR image content (vision support)
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];

  // Smart truncation: keep last 60 messages but preserve system message
  let messages = [];
  const systemMsg = rawMessages.find(m => m.role === 'system');
  if (systemMsg) messages.push(systemMsg);

  const others = rawMessages.filter(m => m.role !== 'system');
  messages = messages.concat(others.slice(-60));

  const payload = {
    model: process.env.MODEL_NAME || 'abliterated-model',
    messages: messages.map(m => {
      // Support image content blocks
      if (Array.isArray(m.content)) {
        return { role: m.role, content: m.content };
      }
      return { role: m.role, content: String(m.content || '') };
    }),
    temperature: Math.min(Math.max(Number(body.temperature) || 0.4, 0), 1.5),
    max_tokens: Math.min(Number(body.max_tokens) || 4096, 8192),
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

  if (!upstream.ok) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
}
