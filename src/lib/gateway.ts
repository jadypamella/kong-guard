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
  textContent: string,
  contextSecret?: string,
  includeContextSecret: boolean = false
): Promise<GatewayResponse> {
  const messages: GatewayMessage[] = [
    { role: 'system', content: 'You are KongGuard' },
    { role: 'user', content: textContent }
  ];

  if (includeContextSecret && contextSecret) {
    messages.push({ role: 'user', content: `context secret: ${contextSecret}` });
  }

  const response = await fetch(`${gatewayUrl}/${gatewayPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gateway returned ${response.status}${errorText ? ': ' + errorText.slice(0, 100) : ''}`);
  }

  return response.json();
}

export async function checkGatewayHealth(gatewayUrl: string, gatewayPath: string): Promise<boolean> {
  try {
    const response = await fetch(`${gatewayUrl}/${gatewayPath}`, {
      method: 'OPTIONS',
    });
    return response.status >= 200 && response.status <= 204;
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