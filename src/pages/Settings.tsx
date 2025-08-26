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

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useI18n(settings.language);
  const { toast } = useToast();

  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [mock, setMock] = useState(settings.mock);
  const [language, setLanguage] = useState(settings.language);
  const [isOnline, setIsOnline] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

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

  useEffect(() => {
    checkServiceHealth();
  }, [baseUrl, mock]);

  const handleSave = () => {
    updateSettings({
      baseUrl,
      mock,
      language,
    });
    
    toast({
      title: 'Settings saved',
      description: 'Your settings have been updated.',
    });
  };

  const hasChanges = 
    baseUrl !== settings.baseUrl ||
    mock !== settings.mock ||
    language !== settings.language;

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

          <div className="flex items-center justify-between pt-4 border-t border-card-border">
            <div className="space-y-1">
              <p className="text-sm font-medium">Service Status</p>
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

          {hasChanges && (
            <Button onClick={handleSave} className="w-full">
              Apply Changes
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}