import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, ChevronDown, Lightbulb, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '@/hooks/use-toast';
import { extractGatewayAnswer, type GatewayResponse } from '@/lib/gateway';

interface KongGuardResponseProps {
  gatewayResult: GatewayResponse | null;
  isEmpty: boolean;
}

export function KongGuardResponse({ gatewayResult, isEmpty }: KongGuardResponseProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (text: string, description: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description,
    });
  };

  if (isEmpty) {
    return (
      <Card className="mt-4 border-muted">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No code to review yet. Paste a snippet above and press Scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!gatewayResult) return null;

  const responseText = extractGatewayAnswer(gatewayResult);
  
  // Parse response for analysis
  const lines = responseText.split('\n').filter(line => line.trim());
  const bulletPoints = lines.filter(line => 
    line.trim().startsWith('*') || line.trim().startsWith('- ')
  );
  
  // Determine severity based on keywords
  const getSeverity = () => {
    const lowercaseText = responseText.toLowerCase();
    if (lowercaseText.includes('high risk') || lowercaseText.includes('critical') || 
        lowercaseText.includes('security vulnerability') || lowercaseText.includes('exposed')) {
      return 'high';
    }
    if (lowercaseText.includes('medium risk') || lowercaseText.includes('warning') || 
        lowercaseText.includes('suggestion') || lowercaseText.includes('consider')) {
      return 'medium';
    }
    if (lowercaseText.includes('no issues') || lowercaseText.includes('looks good') || 
        lowercaseText.includes('no problems') || bulletPoints.length === 0) {
      return 'low';
    }
    return bulletPoints.length > 0 ? 'medium' : 'low';
  };

  const severity = getSeverity();

  const getSummaryConfig = () => {
    switch (severity) {
      case 'high':
        return {
          icon: <XCircle className="h-5 w-5" />,
          title: 'Security Issues Found',
          className: 'text-red-600 bg-red-50 border-red-200',
          iconColor: 'text-red-600'
        };
      case 'medium':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          title: 'Suggestions Available',
          className: 'text-yellow-700 bg-yellow-50 border-yellow-200',
          iconColor: 'text-yellow-700'
        };
      default:
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          title: 'Code Looks Good',
          className: 'text-green-700 bg-green-50 border-green-200',
          iconColor: 'text-green-700'
        };
    }
  };

  const summaryConfig = getSummaryConfig();

  // Extract code blocks
  const codeBlockMatch = responseText.match(/```(\w+)?\n([\s\S]*?)```/);
  const hasCodeBlock = !!codeBlockMatch;
  const codeLanguage = codeBlockMatch?.[1] || 'text';
  const codeContent = codeBlockMatch?.[2] || '';

  const getLanguageForHighlighter = (lang: string) => {
    const langMap: { [key: string]: string } = {
      'csharp': 'csharp',
      'c#': 'csharp',
      'python': 'python',
      'json': 'json',
      'javascript': 'javascript',
      'js': 'javascript'
    };
    return langMap[lang.toLowerCase()] || 'text';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">KongGuard Response</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Bar */}
        <div className={`p-4 rounded-lg border ${summaryConfig.className}`}>
          <div className="flex items-center gap-3">
            <span className={summaryConfig.iconColor}>{summaryConfig.icon}</span>
            <span className="font-bold">{summaryConfig.title}</span>
          </div>
        </div>

        {/* Bullet Points Checklist */}
        {bulletPoints.length > 0 && (
          <div className="space-y-3">
            {bulletPoints.map((point, index) => {
              const cleanPoint = point.replace(/^[\s*-]+/, '').trim();
              const isHighRisk = cleanPoint.toLowerCase().includes('high risk') || 
                               cleanPoint.toLowerCase().includes('critical') ||
                               cleanPoint.toLowerCase().includes('security');
              const isMediumRisk = cleanPoint.toLowerCase().includes('consider') || 
                                 cleanPoint.toLowerCase().includes('suggestion') ||
                                 cleanPoint.toLowerCase().includes('warning');
              
              const getBadgeVariant = () => {
                if (isHighRisk) return 'destructive';
                if (isMediumRisk) return 'secondary';
                return 'outline';
              };

              // Split long sentences
              const parts = cleanPoint.split(/[.!?]+/);
              const mainPart = parts[0] + (parts.length > 1 ? '.' : '');
              const secondaryPart = parts.slice(1).join('.').trim();

              return (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-md">
                  <Badge variant={getBadgeVariant()} className="mt-0.5 text-xs">
                    {isHighRisk ? 'HIGH' : isMediumRisk ? 'MED' : 'LOW'}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{mainPart}</p>
                    {secondaryPart && (
                      <p className="text-xs text-muted-foreground mt-1">{secondaryPart}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Code Block */}
        {hasCodeBlock && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Fixed Code</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(codeContent, 'Code copied to clipboard')}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={getLanguageForHighlighter(codeLanguage)}
                style={oneDark}
                showLineNumbers
                className="rounded-md text-sm"
                customStyle={{
                  margin: 0,
                  borderRadius: '0.375rem',
                }}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          </div>
        )}

        {/* Response without code blocks for cases where there's no code */}
        {!hasCodeBlock && bulletPoints.length === 0 && (
          <div className="bg-muted p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm">{responseText}</pre>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2 pt-2 border-t border-muted">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const summary = `${summaryConfig.title}\n\n${bulletPoints.map(p => 
                p.replace(/^[\s*-]+/, '• ')
              ).join('\n')}`;
              handleCopy(summary, 'Summary copied to clipboard');
            }}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy Summary
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCopy(JSON.stringify(gatewayResult, null, 2), 'Raw JSON copied to clipboard')}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy Raw JSON
          </Button>

          <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showRawJson ? 'rotate-180' : ''}`} />
                Raw JSON
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                {JSON.stringify(gatewayResult, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}