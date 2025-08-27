import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { HealthBadge } from './HealthBadge';
import { useSettings } from '@/hooks/useSettings';
import { checkGatewayHealth } from '@/lib/gateway';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { settings } = useSettings();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (settings.gatewayUrl && settings.gatewayPath) {
        const online = await checkGatewayHealth(settings.gatewayUrl, settings.gatewayPath);
        setIsOnline(online);
      } else {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [settings.gatewayUrl, settings.gatewayPath]);

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
                  Settings
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <HealthBadge isOnline={isOnline} language="en" />
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