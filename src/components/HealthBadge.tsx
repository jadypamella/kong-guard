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
    </div>
  );
}