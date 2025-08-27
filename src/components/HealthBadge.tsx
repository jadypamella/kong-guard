import { StatusPill } from './StatusPill';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HealthBadgeProps {
  isOnline: boolean;
  language: 'en' | 'sv';
}

export function HealthBadge({ isOnline, language }: HealthBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <StatusPill status="safe" size="sm">
        Online
      </StatusPill>
      {!isOnline && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Health check failed. Verify CORS in Konnect.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}