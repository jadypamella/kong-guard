import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { HealthBadge } from '@/components/HealthBadge';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { checkGatewayHealth } from '@/lib/gateway';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();

  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayPath, setGatewayPath] = useState(settings.gatewayPath);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);
  const [includeContextSecret, setIncludeContextSecret] = useState(settings.includeContextSecret);
  const [contextSecret, setContextSecret] = useState(settings.contextSecret);
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gatewayHealthError, setGatewayHealthError] = useState<string | null>(null);

  const checkGatewayServiceHealth = async () => {
    try {
      const online = await checkGatewayHealth(gatewayUrl, gatewayPath);
      setIsGatewayOnline(online);
      setGatewayHealthError(online ? null : 'Connection failed');
    } catch (error: any) {
      setIsGatewayOnline(false);
      if (error.message?.includes('CORS') || error.name === 'TypeError') {
        setGatewayHealthError('CORS');
      } else {
        setGatewayHealthError('Connection failed');
      }
    }
  };

  useEffect(() => {
    checkGatewayServiceHealth();
    const interval = setInterval(checkGatewayServiceHealth, 10000);
    return () => clearInterval(interval);
  }, [gatewayUrl, gatewayPath]);

  const handleSave = async () => {
    setIsSaving(true);
    updateSettings({
      gatewayUrl,
      gatewayPath,
      systemPrompt,
      includeContextSecret,
      contextSecret,
    });
    
    // Re-run health check
    await checkGatewayServiceHealth();
    
    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated.',
    });
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Gateway Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="gatewayUrl">Gateway URL</Label>
              <Input
                id="gatewayUrl"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="https://kong-f156c191deeusgnly.kongcloud.dev"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gatewayPath">Gateway Path</Label>
              <Input
                id="gatewayPath"
                value={gatewayPath}
                onChange={(e) => setGatewayPath(e.target.value)}
                placeholder="validate-code"
              />
              <p className="text-sm text-muted-foreground">
                Path without leading slash
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Input
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are KongGuard"
              />
              <p className="text-sm text-muted-foreground">
                Default system prompt for AI responses
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="includeContextSecret">Include Context Secret</Label>
                <p className="text-sm text-muted-foreground">
                  Add context secret to AI prompts
                </p>
              </div>
              <Switch
                id="includeContextSecret"
                checked={includeContextSecret}
                onCheckedChange={setIncludeContextSecret}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contextSecret">Context Secret</Label>
              <Input
                id="contextSecret"
                type="password"
                value={contextSecret}
                onChange={(e) => setContextSecret(e.target.value)}
                placeholder="Enter context secret (optional)"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-card-border">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Gateway Status</p>
                <p className="text-sm text-muted-foreground">
                  Current AI gateway connectivity
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <HealthBadge isOnline={isGatewayOnline} language="en" />
                {!isGatewayOnline && gatewayHealthError === 'CORS' && (
                  <p className="text-xs text-muted-foreground text-right max-w-xs">
                    Please enable the CORS plugin for this service in Konnect and allow origin http://localhost:8081 with methods POST and OPTIONS and header Content-Type.
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Apply Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}