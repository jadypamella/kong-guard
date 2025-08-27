import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Scan, RefreshCw, ChevronDown } from 'lucide-react';
import { StatusPill } from '@/components/StatusPill';
import { KongGuardResponse } from '@/components/KongGuardResponse';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { callGatewayTemplate, extractGatewayAnswer, type GatewayResponse } from '@/lib/gateway';


export default function Home() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const scanButtonRef = useRef<HTMLButtonElement>(null);

  const [text, setText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [gatewayResult, setGatewayResult] = useState<GatewayResponse | null>(null);

  const handleScan = async () => {
    if (!text.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setGatewayResult(null);

    try {
      if (settings.gatewayUrl && settings.gatewayPath) {
        const gatewayResponse = await callGatewayTemplate(
          settings.gatewayUrl,
          settings.gatewayPath,
          text
        );
        setGatewayResult(gatewayResponse.data);
        setScanResult({ ok: true });
        
        if (gatewayResponse.ok) {
          toast({
            title: 'Scan complete',
            description: 'Text analyzed successfully.',
          });
        } else {
          toast({
            title: 'Gateway error',
            description: `Gateway returned ${gatewayResponse.status}`,
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      let message = 'Gateway request failed';
      if (error.message?.includes('CORS') || error.name === 'TypeError') {
        message = 'CORS error - enable CORS plugin in Konnect for this origin';
      }
      
      toast({
        title: 'Gateway error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };


  const examples = [
    {
      label: 'C#',
      content: `using System;
using System.Collections.Generic;
using System.Linq;

public class Myclass
{
    private string name;
    public int Age;
    public static int CONSTANT_VALUE = 100;

    public void mymethod(string input)
    {
        var result = "Hello, " + input;
        Console.WriteLine(result);
    }
}`
    },
    {
      label: 'Python',
      content: `import os
DB_URL = "postgres://admin:SuperSecretP@ssw0rd@db.example.com:5432/prod"
REDIS_URL = "redis://default:TopSecret123@cache.example.com:6379"
API_KEY = "ghp_FAKE1234567890ABCDEFG"
def connect():
    pass`
    },
    {
      label: '.env',
      content: `# .env from repo
OPENAI_API_KEY=sk_FAKE1234567890
AWS_ACCESS_KEY_ID=AKIAFAKE1234567890
AWS_SECRET_ACCESS_KEY=abcDEF1234567890xyzABC1234567890abcdEF12
DB_PASSWORD=AnotherSecret123`
    }
  ];

  const handleExampleClick = (content: string) => {
    setText(content);
    setTimeout(() => {
      scanButtonRef.current?.focus();
      scanButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getStatusText = () => {
    if (isScanning) return 'Scanning...';
    if (scanResult?.ok) return 'Analyzed';
    return null;
  };

  const getStatusType = () => {
    if (isScanning) return 'neutral';
    if (scanResult?.ok) return 'safe';
    return 'neutral';
  };

  const isAIResponseEmpty = () => {
    if (!gatewayResult) return false;
    const answer = extractGatewayAnswer(gatewayResult);
    return !answer || answer.trim() === '' || answer.includes('No code') || answer.includes('no code');
  };

  return (
    <div className="space-y-6">

      {/* Scan Card */}
      <Card className="shadow-card border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Paste your prompt
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your prompt here..."
              className="min-h-32"
            />
          </div>


          <Button
            ref={scanButtonRef}
            onClick={handleScan}
            disabled={!text.trim() || isScanning}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-4 w-4" />
                Scan
              </>
            )}
          </Button>

          {(scanResult || isScanning) && !isScanning && (
            <div className="space-y-4 pt-4 border-t border-card-border">
              <div className="flex justify-center">
                <StatusPill status={getStatusType()} size="lg">
                  {getStatusText()}
                </StatusPill>
              </div>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4 pt-4 border-t border-card-border">
              <div className="flex justify-center">
                <StatusPill status="neutral" size="lg">
                  Scanning...
                </StatusPill>
              </div>
            </div>
          )}

          <KongGuardResponse 
            gatewayResult={gatewayResult} 
            isEmpty={isAIResponseEmpty()} 
          />

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
              <ChevronDown className="h-4 w-4" />
              Example requests
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-3">
              {examples.map((example, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{example.label}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExampleClick(example.content)}
                    >
                      Use Example
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <pre className="text-xs overflow-auto">{example.content}</pre>
                  </div>
                </div>
              ))}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">cURL</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" -H "Content-Type: application/json" -d '{"messages":"{template://CodeStanderdRule}","properties":{"code":"What is 1 + 1?"}}'`)}
                  >
                    Use Example
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto">
{`curl -X POST "${settings.gatewayUrl}/${settings.gatewayPath}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": "{template://CodeStanderdRule}",
    "properties": {
      "code": "What is 1 + 1?"
    }
  }'`}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">JavaScript</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExampleClick(`await fetch('${settings.gatewayUrl}/${settings.gatewayPath}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: "{template://CodeStanderdRule}", properties: { code: "What is 1 + 1?" } }) }).then(r => r.json())`)}
                  >
                    Use Example
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-auto">
{`await fetch('${settings.gatewayUrl}/${settings.gatewayPath}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: "{template://CodeStanderdRule}",
    properties: { code: "What is 1 + 1?" }
  })
}).then(r => r.json())`}
                  </pre>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}