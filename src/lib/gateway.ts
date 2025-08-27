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

export async function callGatewayTemplate(
  gatewayUrl: string,
  gatewayPath: string,
  codeText: string
) {
  const payload = {
    messages: "{template://CodeStanderdRule}",
    properties: { code: codeText }
  };

  const res = await fetch(`${gatewayUrl}/${gatewayPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({} as any));
  return { ok: res.ok, status: res.status, data };
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