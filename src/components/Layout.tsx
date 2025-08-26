import { Link, useLocation } from 'react-router-dom';
import { Shield, Settings } from 'lucide-react';
import { HealthBadge } from './HealthBadge';
import { useSettings } from '@/hooks/useSettings';
import { useI18n } from '@/hooks/useI18n';
import { checkHealth } from '@/lib/api';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { settings } = useSettings();
  const { t } = useI18n(settings.language);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (settings.mock) {
        setIsOnline(true);
        return;
      }
      const online = await checkHealth(settings.baseUrl);
      setIsOnline(online);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [settings.baseUrl, settings.mock]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-primary">KongGuard</h1>
              </Link>
              
              <nav className="flex space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === '/'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    location.pathname === '/settings'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('settings')}
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {settings.mock && (
                <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                  {t('mock_mode_active')}
                </span>
              )}
              <HealthBadge isOnline={isOnline} language={settings.language} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}