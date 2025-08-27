export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GatewayRequest {
  messages: GatewayMessage[];
}

export interface GatewayResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  [key: string]: any;
}

export async function callGateway(
  gatewayUrl: string,
  gatewayPath: string,
  systemPrompt: string,
  userText: string,
  includeSecret: boolean,
  contextSecret: string
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const messages: GatewayMessage[] = [
    { role: 'system', content: systemPrompt || 'You are KongGuard' },
    { role: 'user', content: userText },
    ...(includeSecret && contextSecret
      ? [{ role: 'user' as const, content: `context secret: ${contextSecret}` }]
      : []),
  ];

  const resp = await fetch(`${gatewayUrl}/${gatewayPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  const data = await resp.json().catch(() => ({} as any));

  const text =
    data?.choices?.[0]?.message?.content ??
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ??
    JSON.stringify(data);

  return { ok: resp.ok, status: resp.status, data, text };
}

export async function checkGatewayHealth(gatewayUrl: string, gatewayPath: string): Promise<boolean> {
  try {
    const r = await fetch(`${gatewayUrl}/${gatewayPath}`, { method: 'OPTIONS' });
    return r.ok || r.status === 204 || r.status === 405;
  } catch {
    return false;
  }
}

export function extractGatewayAnswer(data: GatewayResponse): string {
  // Try OpenAI format first
  if (data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  
  // Try Google format
  if (data.candidates?.[0]?.content?.parts) {
    return data.candidates[0].content.parts
      .map(part => part.text || '')
      .join(' ');
  }
  
  // Fallback to full JSON
  return JSON.stringify(data, null, 2);
}