import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HealthBadge } from '@/components/HealthBadge';
import { Settings as SettingsIcon } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useI18n } from '@/hooks/useI18n';
import { useToast } from '@/hooks/use-toast';
import { checkHealth } from '@/lib/api';
import { checkGatewayHealth } from '@/lib/gateway';

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n(settings.language);
  const { toast } = useToast();

  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [mock, setMock] = useState(settings.mock);
  const [language, setLanguage] = useState(settings.language);
  const [gatewayUrl, setGatewayUrl] = useState(settings.gatewayUrl);
  const [gatewayPath, setGatewayPath] = useState(settings.gatewayPath);
  const [includeContextSecret, setIncludeContextSecret] = useState(settings.includeContextSecret);
  const [contextSecret, setContextSecret] = useState(settings.contextSecret);
  const [isOnline, setIsOnline] = useState(false);
  const [isGatewayOnline, setIsGatewayOnline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [gatewayHealthError, setGatewayHealthError] = useState<string | null>(null);

  const checkServiceHealth = async () => {
    if (mock) {
      setIsOnline(true);
      return;
    }

    setIsCheckingHealth(true);
    try {
      const online = await checkHealth(baseUrl);
      setIsOnline(online);
    } catch {
      setIsOnline(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

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
    checkServiceHealth();
  }, [baseUrl, mock]);

  useEffect(() => {
    checkGatewayServiceHealth();
    const interval = setInterval(checkGatewayServiceHealth, 10000);
    return () => clearInterval(interval);
  }, [gatewayUrl, gatewayPath]);

  const handleSave = async () => {
    setIsSaving(true);
    updateSettings({
      baseUrl,
      mock,
      language,
      gatewayUrl,
      gatewayPath,
      includeContextSecret,
      contextSecret,
    });
    
    // Re-run health checks
    await Promise.all([
      checkServiceHealth(),
      checkGatewayServiceHealth(),
    ]);
    
    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated.',
    });
    setIsSaving(false);
  };

  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            {t('settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">{t('backend_url')}</Label>
            <Input
              id="baseUrl"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <p className="text-sm text-muted-foreground">
              The base URL for the KongGuard backend service
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="mock">{t('mock_mode')}</Label>
              <p className="text-sm text-muted-foreground">
                Use mock responses for testing
              </p>
            </div>
            <Switch
              id="mock"
              checked={mock}
              onCheckedChange={setMock}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t('language')}</Label>
            <Select value={language} onValueChange={(value: 'en' | 'sv') => setLanguage(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sv">Svenska</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pt-4 border-t border-card-border">
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
                <p className="text-sm font-medium">Backend Service Status</p>
                <p className="text-sm text-muted-foreground">
                  Current backend connectivity
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isCheckingHealth && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                <HealthBadge isOnline={isOnline} language={language} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Gateway Status</p>
                <p className="text-sm text-muted-foreground">
                  Current AI gateway connectivity
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <HealthBadge isOnline={isGatewayOnline} language={language} />
                {!isGatewayOnline && gatewayHealthError === 'CORS' && (
                  <p className="text-xs text-muted-foreground text-right max-w-xs">
                    Enable CORS plugin for the service behind this route in Konnect. Allow origin http://localhost:8081 with methods POST and OPTIONS and header Content-Type.
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