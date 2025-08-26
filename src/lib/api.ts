export interface ScanRequest {
  text: string;
  team?: string;
}

export interface ScanResponse {
  ok: boolean;
  reasons: string[];
  redactions: Record<string, string>;
}

export interface LogEntry {
  ts: string;
  ok: boolean;
  reasons: string[];
  length: number;
  team?: string;
}

// Mock data generator
const mockLogEntries: LogEntry[] = [
  {
    ts: new Date(Date.now() - 3600000).toISOString(),
    ok: true,
    reasons: [],
    length: 245,
    team: 'engineering',
  },
  {
    ts: new Date(Date.now() - 7200000).toISOString(),
    ok: false,
    reasons: ['password_detected'],
    length: 180,
    team: 'security',
  },
  {
    ts: new Date(Date.now() - 10800000).toISOString(),
    ok: true,
    reasons: [],
    length: 320,
  },
  {
    ts: new Date(Date.now() - 14400000).toISOString(),
    ok: false,
    reasons: ['aws_key_detected', 'private_key_detected'],
    length: 520,
    team: 'devops',
  },
  {
    ts: new Date(Date.now() - 18000000).toISOString(),
    ok: true,
    reasons: [],
    length: 95,
    team: 'marketing',
  },
];

export async function scanText(
  baseUrl: string,
  request: ScanRequest,
  mock: boolean
): Promise<ScanResponse> {
  if (mock) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const text = request.text.toLowerCase();
    const reasons: string[] = [];
    const redactions: Record<string, string> = {};
    
    if (text.includes('password')) {
      reasons.push('password_detected');
      redactions['password'] = '***redacted***';
    }
    if (text.includes('akia')) {
      reasons.push('aws_key_detected');
      redactions['AKIA'] = '***redacted***';
    }
    if (text.includes('begin private key')) {
      reasons.push('private_key_detected');
      redactions['BEGIN PRIVATE KEY'] = '***redacted***';
    }
    
    return {
      ok: reasons.length === 0,
      reasons,
      redactions,
    };
  }

  const response = await fetch(`${baseUrl}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Network error');
  }

  return response.json();
}

export async function getLogs(baseUrl: string, mock: boolean): Promise<LogEntry[]> {
  if (mock) {
    return mockLogEntries;
  }

  const response = await fetch(`${baseUrl}/logs`);
  
  if (!response.ok) {
    throw new Error('Network error');
  }

  return response.json();
}

export async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/logs`);
    return response.ok;
  } catch {
    return false;
  }
}