import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Scan, RefreshCw, ChevronDown, Copy } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { ReasonBadge } from '@/components/ReasonBadge';
import { CopyButton } from '@/components/CopyButton';
import { useSettings } from '@/hooks/useSettings';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/use-toast';
import { scanText, getLogs, type ScanResponse, type LogEntry } from '@/lib/api';
import { callGateway, extractGatewayAnswer, type GatewayResponse } from '@/lib/gateway';

// Local scanner implementation
const scanTextLocal = (text: string): ScanResponse => {
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
  const { t } = useI18n(settings.language);
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [team, setTeam] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [gatewayResult, setGatewayResult] = useState<GatewayResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Load logs only if backend is configured
  const loadLogs = async () => {
    if (!settings.baseUrl) {
      setLogs([]);
      setIsLoadingLogs(false);
      return;
    }

    try {
      const logData = await getLogs(settings.baseUrl, settings.mock);
      setLogs(logData);
    } catch (error) {
      toast({
        title: t('service_not_reachable'),
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // Poll logs every 5 seconds if backend is configured
    if (settings.baseUrl) {
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [settings.baseUrl, settings.mock]);

  const handleScan = async () => {
    if (!text.trim()) return;

    setIsScanning(true);
    setGatewayResult(null);
    
    try {
      // Build scan target including context secret if enabled
      let scanTarget = text;
      if (settings.includeContextSecret && settings.contextSecret) {
        scanTarget = `${text} ${settings.contextSecret}`;
      }

      // Always use local scanner (no more backend dependency)
      const result = scanTextLocal(scanTarget);
      
      setScanResult(result);
      
      // If scan passes, call gateway with original text
      if (result.ok) {
        try {
          const gatewayResponse = await callGateway(
            settings.gatewayUrl,
            settings.gatewayPath,
            text,
            settings.includeContextSecret,
            settings.contextSecret
          );
          setGatewayResult(gatewayResponse.data);
          
          toast({
            title: 'Scan complete',
          });
        } catch (gatewayError: any) {
          toast({
            title: 'Gateway Error',
            description: gatewayError.message.includes('CORS') 
              ? 'CORS error: Enable CORS plugin on your service in Konnect for this origin, allow POST/OPTIONS methods and Content-Type header.'
              : gatewayError.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Scan complete',
        });
      }
      
      // Reload logs after scan if backend is configured
      if (settings.baseUrl) {
        loadLogs();
      }
    } catch (error) {
      toast({
        title: t('service_not_reachable'),
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendRedacted = async () => {
    if (!scanResult || !scanResult.redactions) return;

    setIsScanning(true);
    try {
      const redactedText = applyRedactions(text, scanResult.redactions);
      const redactedSecret = settings.contextSecret 
        ? applyRedactions(settings.contextSecret, scanResult.redactions)
        : settings.contextSecret;
        
      const gatewayResponse = await callGateway(
        settings.gatewayUrl,
        settings.gatewayPath,
        redactedText,
        settings.includeContextSecret,
        redactedSecret
      );
      setGatewayResult(gatewayResponse.data);
      toast({
        title: 'Redacted text sent successfully',
      });
    } catch (gatewayError: any) {
      toast({
        title: 'Gateway Error',
        description: gatewayError.message.includes('CORS') 
          ? 'CORS error: Enable CORS plugin on your service in Konnect for this origin, allow POST/OPTIONS methods and Content-Type header.'
          : gatewayError.message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  const applyRedactions = (text: string, redactions: Record<string, string>): string => {
    let redactedText = text;
    Object.entries(redactions).forEach(([original, replacement]) => {
      redactedText = redactedText.replace(new RegExp(original, 'gi'), replacement);
    });
    return redactedText;
  };

  const handleTryAgain = () => {
    if (scanResult && scanResult.redactions) {
      const redactedText = applyRedactions(text, scanResult.redactions);
      setText(redactedText);
      setScanResult(null);
    }
  };

  // Calculate stats
  const today = new Date().toDateString();
  const todayLogs = logs.filter(log => new Date(log.ts).toDateString() === today);
  const allowedToday = todayLogs.filter(log => log.ok).length;
  const blockedToday = todayLogs.filter(log => !log.ok).length;

  return (
    <div className="space-y-6">
      {/* Scan Card */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            {t('scan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('paste_prompt')}
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('paste_prompt')}
              className="min-h-32"
            />
          </div>

            <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground">
                {t('team')} (optional)
              </label>
              <Input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder={t('team')}
              />
            </div>
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
                {t('scan')}
              </>
            )}
          </Button>

          {scanResult && (
            <div className="space-y-4 pt-4 border-t border-card-border">
              <div className="flex justify-center">
                <StatusPill status={scanResult.ok ? 'safe' : 'blocked'} size="lg">
                  {scanResult.ok ? t('safe') : t('blocked')}
                </StatusPill>
              </div>

              {scanResult.reasons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('reasons')}:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.reasons.map((reason, index) => (
                      <ReasonBadge key={index} reason={reason} />
                    ))}
                  </div>
                </div>
              )}

              {!scanResult.ok && Object.keys(scanResult.redactions).length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                    <ChevronDown className="h-4 w-4" />
                    {t('redaction_preview')}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    <div className="bg-muted p-3 rounded-md text-sm font-mono">
                      {applyRedactions(text, scanResult.redactions)}
                    </div>
                    <div className="flex gap-2">
                      <CopyButton
                        text={applyRedactions(text, scanResult.redactions)}
                        language={settings.language}
                      />
                      <Button variant="outline" size="sm" onClick={handleTryAgain}>
                        {t('try_again')}
                      </Button>
                      <Button variant="default" size="sm" onClick={handleSendRedacted}>
                        Send redacted
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                  <ChevronDown className="h-4 w-4" />
                  JSON Response
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                    {JSON.stringify(scanResult, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
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
              {t('example_requests')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Gateway - cURL</h4>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      { "role": "system", "content": "You are KongGuard" },
      { "role": "user", "content": "What is 1 + 1?" }
    ]
  }'`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton
                      text={`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" -H "Content-Type: application/json" -d '{"messages":[{"role":"system","content":"You are KongGuard"},{"role":"user","content":"What is 1 + 1?"}]}'`}
                      language={settings.language}
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Gateway - JavaScript</h4>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`fetch('${settings.gatewayUrl}/${settings.gatewayPath}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: 'You are KongGuard' },
      { role: 'user', content: 'What is 1 + 1?' }
    ]
  })
}).then(res => res.json())`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton
                      text={`fetch('${settings.gatewayUrl}/${settings.gatewayPath}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'You are KongGuard' }, { role: 'user', content: 'What is 1 + 1?' }] }) }).then(res => res.json())`}
                      language={settings.language}
                      variant="ghost"
                    />
                  </div>
                </div>
              </div>

              {settings.baseUrl && (
                <>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Backend - cURL</h4>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`curl -X POST ${settings.baseUrl}/scan \\
  -H "Content-Type: application/json" \\
  -d '{"text": "your prompt here", "team": "optional"}'`}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton
                          text={`curl -X POST ${settings.baseUrl}/scan -H "Content-Type: application/json" -d '{"text": "your prompt here", "team": "optional"}'`}
                          language={settings.language}
                          variant="ghost"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Backend - JavaScript</h4>
                    <div className="relative">
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto pr-12">
{`fetch('${settings.baseUrl}/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'your prompt here',
    team: 'optional'
  })
}).then(res => res.json())`}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton
                          text={`fetch('${settings.baseUrl}/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'your prompt here', team: 'optional' }) }).then(res => res.json())`}
                          language={settings.language}
                          variant="ghost"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="shadow-card border-card-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Status</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('allowed_today')}</p>
              <p className="text-2xl font-bold text-success">{allowedToday}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('blocked_today')}</p>
              <p className="text-2xl font-bold text-danger">{blockedToday}</p>
            </div>
          </div>
          
          {/* Mini chart */}
          <div className="mt-4">
            <div className="flex h-8 items-end space-x-1">
              {logs.slice(-20).map((log, index) => (
                <div
                  key={index}
                  className={`flex-1 min-w-1 rounded-t ${
                    log.ok ? 'bg-success' : 'bg-danger'
                  }`}
                  style={{ height: `${Math.max(10, (log.length / 500) * 100)}%` }}
                  title={`${new Date(log.ts).toLocaleString()}: ${log.ok ? 'Safe' : 'Blocked'} (${log.length} chars)`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Card */}
      {settings.baseUrl ? (
        <Card className="shadow-card border-card-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>{t('logs')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadLogs} disabled={isLoadingLogs}>
              <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                No logs available
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-card-border">
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                        {t('time')}
                      </th>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                        {t('status')}
                      </th>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                        {t('reasons')}
                      </th>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                        {t('length')}
                      </th>
                      <th className="text-left p-2 text-sm font-medium text-muted-foreground">
                        {t('team')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => (
                      <tr key={index} className="border-b border-card-border/50">
                        <td className="p-2 text-sm text-muted-foreground">
                          {new Date(log.ts).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <StatusPill status={log.ok ? 'safe' : 'blocked'} size="sm">
                            {log.ok ? t('safe') : t('blocked')}
                          </StatusPill>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {log.reasons.map((reason, reasonIndex) => (
                              <ReasonBadge key={reasonIndex} reason={reason} />
                            ))}
                          </div>
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {log.length}
                        </td>
                        <td className="p-2 text-sm text-muted-foreground">
                          {log.team || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card border-card-border">
          <CardHeader>
            <CardTitle>{t('logs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground p-8">
              <p className="text-sm">Backend not configured</p>
              <p className="text-xs mt-1">Configure a backend URL in Settings to view logs</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}