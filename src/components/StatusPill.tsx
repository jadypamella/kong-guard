import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: 'safe' | 'blocked' | 'neutral' | 'error';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function StatusPill({ status, size = 'md', children }: StatusPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full',
        {
          'px-3 py-1 text-sm': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        {
          'bg-success text-success-foreground': status === 'safe',
          'bg-danger text-danger-foreground': status === 'blocked',
          'bg-muted text-muted-foreground': status === 'neutral',
          'bg-red-600 text-white': status === 'error',
        }
      )}
      aria-label={status === 'safe' ? 'Safe' : status === 'blocked' ? 'Blocked' : status === 'error' ? 'Error' : 'Neutral'}
    >
      {children}
    </div>
  );
}