import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

export default function Home() {
  const { settings } = useSettings();
  const { t } = useI18n(settings.language);
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [team, setTeam] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Load logs
  const loadLogs = async () => {
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
    // Poll logs every 5 seconds
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [settings.baseUrl, settings.mock]);

  const handleScan = async () => {
    if (!text.trim()) return;

    setIsScanning(true);
    try {
      const result = await scanText(settings.baseUrl, { text, team: team || undefined }, settings.mock);
      setScanResult(result);
      toast({
        title: t('scan_complete'),
      });
      // Reload logs after scan
      loadLogs();
    } catch (error) {
      toast({
        title: t('service_not_reachable'),
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

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ChevronDown className="h-4 w-4" />
              {t('example_requests')}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-3">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">cURL</h4>
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
                <h4 className="text-sm font-medium">JavaScript</h4>
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
      <Card className="shadow-card border-card-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>{t('logs')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}