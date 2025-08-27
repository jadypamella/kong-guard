import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Scan, RefreshCw, ChevronDown } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { ReasonBadge } from '@/components/ReasonBadge';
import { CopyButton } from '@/components/CopyButton';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { callGatewayTemplate, extractGatewayAnswer, type GatewayResponse } from '@/lib/gateway';

// Local scanner implementation
const scanTextLocal = (text: string) => {
  const reasons: string[] = [];
  const redactions: Record<string, string> = {};
  
  const rules = [
    { name: "Potential password", regex: /(password|passwd|pwd)\s*[:=]\s*["']?[^"'\n]{4,}/i },
    { name: "JWT like token", regex: /\beyJ[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+?\.[a-zA-Z0-9_-]+/ },
    { name: "AWS key id", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "AWS secret", regex: /\b[A-Za-z0-9\/+=]{40}\b/ },
    { name: "Private key block", regex: /BEGIN\s+PRIVATE\s+KEY[\s\S]+END\s+PRIVATE\s+KEY/ }
  ];

  for (const rule of rules) {
    const match = text.match(rule.regex);
    if (match) {
      reasons.push(rule.name);
      redactions[match[0]] = "***redacted***";
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    redactions,
  };
};

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [gatewayResult, setGatewayResult] = useState<GatewayResponse | null>(null);
  const [redactedText, setRedactedText] = useState('');

  const handleScan = async () => {
    if (!text.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setGatewayResult(null);
    setRedactedText('');

    try {
      // Build scan target (text + context secret if enabled)
      const scanTarget = settings.includeContextSecret && settings.contextSecret
        ? `${text} ${settings.contextSecret}`
        : text;

      // Always use local scanner
      const result = scanTextLocal(scanTarget);
      setScanResult(result);

      if (result.ok && settings.gatewayUrl && settings.gatewayPath) {
        // Safe to call gateway with original text
        try {
          const gatewayResponse = await callGatewayTemplate(
            settings.gatewayUrl,
            settings.gatewayPath,
            text
          );
          setGatewayResult(gatewayResponse.data);
          
          if (gatewayResponse.ok) {
            toast({
              title: 'Scan complete',
              description: 'Text analyzed successfully.',
            });
          } else {
            toast({
              title: 'Gateway error',
              description: `Gateway returned ${gatewayResponse.status}`,
              variant: 'destructive',
            });
          }
        } catch (error: any) {
          let message = 'Gateway request failed';
          if (error.message?.includes('CORS') || error.name === 'TypeError') {
            message = 'CORS error - enable CORS plugin in Konnect for this origin';
          }
          
          toast({
            title: 'Gateway error',
            description: message,
            variant: 'destructive',
          });
        }
      }

      // Prepare redacted text for potential use
      if (!result.ok && result.redactions) {
        let redacted = text;
        Object.keys(result.redactions).forEach(key => {
          redacted = redacted.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***redacted***');
        });
        setRedactedText(redacted);
      }
    } catch (error: any) {
      toast({
        title: 'Scan failed',
        description: error.message || 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendRedacted = async () => {
    if (!redactedText || !settings.gatewayUrl || !settings.gatewayPath) return;

    try {
      // Build redacted context secret if needed
      let redactedContextSecret = settings.contextSecret;
      if (scanResult?.redactions && settings.includeContextSecret) {
        Object.keys(scanResult.redactions).forEach(key => {
          redactedContextSecret = redactedContextSecret.replace(
            new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
            '***redacted***'
          );
        });
      }

      const gatewayResponse = await callGatewayTemplate(
        settings.gatewayUrl,
        settings.gatewayPath,
        redactedText
      );
      setGatewayResult(gatewayResponse.data);
      
      if (gatewayResponse.ok) {
        toast({
          title: 'Redacted text sent',
          description: 'Redacted version sent successfully.',
        });
      } else {
        toast({
          title: 'Gateway error',
          description: `Gateway returned ${gatewayResponse.status}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      let message = 'Gateway request failed';
      if (error.message?.includes('CORS') || error.name === 'TypeError') {
        message = 'CORS error - enable CORS plugin in Konnect for this origin';
      }
      
      toast({
        title: 'Gateway error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Scan Card */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Paste your prompt
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your prompt here..."
              className="min-h-32"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Context secret (optional)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={settings.contextSecret}
                onChange={(e) => updateSettings({ contextSecret: e.target.value })}
                placeholder="Enter context secret"
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.includeContextSecret}
                  onCheckedChange={(checked) => updateSettings({ includeContextSecret: checked })}
                />
                <span className="text-sm text-muted-foreground">Include in prompt</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleScan}
            disabled={!text.trim() || isScanning}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-4 w-4" />
                Scan
              </>
            )}
          </Button>

          {scanResult && (
            <div className="space-y-4 pt-4 border-t border-card-border">
              <div className="flex justify-center">
                <StatusPill status={scanResult.ok ? 'safe' : 'blocked'} size="lg">
                  {scanResult.ok ? 'Safe' : 'Blocked'}
                </StatusPill>
              </div>

              {scanResult.reasons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Reasons:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.reasons.map((reason: string, index: number) => (
                      <ReasonBadge key={index} reason={reason} />
                    ))}
                  </div>
                </div>
              )}

              {!scanResult.ok && Object.keys(scanResult.redactions).length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                    <ChevronDown className="h-4 w-4" />
                    Redaction preview
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    <div className="bg-muted p-3 rounded-md text-sm font-mono">
                      {redactedText}
                    </div>
                    <div className="flex gap-2">
                      <CopyButton
                        text={redactedText}
                        language="en"
                      />
                      <Button variant="default" size="sm" onClick={handleSendRedacted}>
                        Send redacted
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {gatewayResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">AI Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <pre className="whitespace-pre-wrap text-sm">
                    {extractGatewayAnswer(gatewayResult)}
                  </pre>
                </div>
                
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                    <ChevronDown className="h-4 w-4" />
                    Raw Gateway Response
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                      {JSON.stringify(gatewayResult, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          )}

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ChevronDown className="h-4 w-4" />
              Example requests
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">cURL</h4>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "system", "content": "You are a mathematician" },
      { "role": "user", "content": "What is 1 + 1?" }
    ]
  }'`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton
                      text={`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" -H "Content-Type: application/json" -d '{"messages":[{"role":"system","content":"You are a mathematician"},{"role":"user","content":"What is 1 + 1?"}]}'`}
                      language="en"
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">JavaScript</h4>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`await fetch('${settings.gatewayUrl}/${settings.gatewayPath}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are a mathematician' },
      { role: 'user', content: 'What is 1 + 1?' }
    ]
  })
}).then(r => r.json())`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton
                      text={`await fetch('${settings.gatewayUrl}/${settings.gatewayPath}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'You are a mathematician' }, { role: 'user', content: 'What is 1 + 1?' }] }) }).then(r => r.json())`}
                      language="en"
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}