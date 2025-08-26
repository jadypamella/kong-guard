import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';

interface CopyButtonProps {
  text: string;
  language: 'en' | 'sv';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}

export function CopyButton({ text, language, variant = 'outline', size = 'sm', children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n(language);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className="flex items-center gap-2"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {children || (copied ? t('copied') : 'Copy')}
    </Button>
  );
}