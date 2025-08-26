import { StatusPill } from './StatusPill';
import { useI18n } from '@/hooks/useI18n';

interface HealthBadgeProps {
  isOnline: boolean;
  language: 'en' | 'sv';
}

export function HealthBadge({ isOnline, language }: HealthBadgeProps) {
  const { t } = useI18n(language);

  return (
    <StatusPill status={isOnline ? 'safe' : 'blocked'} size="sm">
      {isOnline ? t('online') : t('offline')}
    </StatusPill>
  );
}