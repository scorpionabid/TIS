import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContextOptimized';
import { aiSettingsService } from '@/services/aiSettingsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle, XCircle, Loader2, Eye, EyeOff,
  Zap, Settings2, TestTube, Save, ExternalLink,
  Bot, Cpu, Sparkles,
} from 'lucide-react';
import type { AiProvider, SaveAiSettingsRequest, AiProviderInfo } from '@/types/aiAnalysis';

// Provider icon map
const PROVIDER_ICONS: Record<AiProvider, React.ComponentType<{ className?: string }>> = {
  openai: Cpu,
  anthropic: Bot,
  gemini: Sparkles,
};

// Provider selected border + background colors
const PROVIDER_COLORS: Record<AiProvider, string> = {
  openai: 'border-green-500 bg-green-50',
  anthropic: 'border-orange-500 bg-orange-50',
  gemini: 'border-blue-500 bg-blue-50',
};

export default function AiSettings() {
  // currentUser is used for auth context; destructured but not accessed directly
  // since this page is superadmin-only and routing handles access control
  const { currentUser: _currentUser } = useAuth();
  void _currentUser; // suppress unused warning — kept for future permission checks

  const queryClient = useQueryClient();

  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Mövcud settings-i yüklə
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => aiSettingsService.getSettings(),
  });

  // Provider dəyişdikdə model sıfırla
  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setSelectedModel('');
  };

  // Yadda saxla mutation
  const saveMutation = useMutation({
    mutationFn: (data: SaveAiSettingsRequest) => aiSettingsService.saveSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setApiKey('');
      setTestResult(null);
    },
  });

  // Test mutation — əvvəl saxla, sonra test et
  const testMutation = useMutation({
    mutationFn: async () => {
      await aiSettingsService.saveSettings({
        provider: selectedProvider,
        api_key: apiKey,
        model: selectedModel || null,
      });
      return aiSettingsService.testConnection();
    },
    onSuccess: (result) => {
      setTestResult({ success: result.success, message: result.message });
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
    },
  });

  const handleSave = () => {
    if (!apiKey.trim() && !settings?.current_settings?.has_api_key) return;
    saveMutation.mutate({
      provider: selectedProvider,
      api_key: apiKey.trim(),
      model: selectedModel || undefined,
    });
  };

  const handleTest = () => {
    if (!apiKey.trim()) return;
    testMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const providers: AiProviderInfo[] = settings?.available_providers ?? [];
  const current = settings?.current_settings;
  const currentProviderInfo = providers.find((p) => p.id === selectedProvider);

  const providerDisplayName = (id: AiProvider): string => {
    const names: Record<AiProvider, string> = {
      openai: 'OpenAI GPT',
      anthropic: 'Anthropic Claude',
      gemini: 'Google Gemini',
    };
    return names[id];
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      {/* Başlıq */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">AI İdarəetmə</h1>
          <p className="text-muted-foreground text-sm">
            AI Analiz modulu üçün LLM provider konfiqurasiyası
          </p>
        </div>
      </div>

      {/* Mövcud aktiv konfiqurasiya statusu */}
      {current && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="font-medium">{providerDisplayName(current.provider)}</span> aktiv
            provider kimi konfiqurasiya edilib. Model:{' '}
            <span className="font-mono text-xs bg-green-100 px-1 rounded">
              {current.effective_model}
            </span>
            {current.updated_at && (
              <span className="text-xs ml-2 opacity-70">
                • {new Date(current.updated_at).toLocaleDateString('az-AZ')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!settings?.is_configured && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Zap className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            AI provider hələ konfiqurasiya edilməyib. AI Analiz funksiyasından istifadə etmək
            üçün aşağıda bir provider seçin.
          </AlertDescription>
        </Alert>
      )}

      {/* Provider seçimi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">LLM Provider Seçin</CardTitle>
          <CardDescription>Hansı AI xidmətindən istifadə etmək istəyirsiniz?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {providers.map((provider) => {
              const Icon = PROVIDER_ICONS[provider.id] ?? Cpu;
              const isSelected = selectedProvider === provider.id;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderChange(provider.id)}
                  className={[
                    'relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all',
                    'hover:shadow-md cursor-pointer',
                    isSelected
                      ? PROVIDER_COLORS[provider.id] + ' shadow-sm'
                      : 'border-border bg-card',
                  ].join(' ')}
                >
                  {isSelected && (
                    <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-green-600" />
                  )}
                  <Icon className="h-6 w-6 mb-2 text-muted-foreground" />
                  <span className="font-medium text-sm">{provider.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">{provider.description}</span>
                  <a
                    href={provider.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    API key al <ExternalLink className="h-3 w-3" />
                  </a>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* API Key + Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Açarı</CardTitle>
          <CardDescription>
            {currentProviderInfo?.name ?? selectedProvider} üçün API açarını daxil edin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key sahəsi */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Açarı</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                placeholder={
                  current?.has_api_key && current?.provider === selectedProvider
                    ? '••••••••••••••••••••••••••••••• (mövcud açar)'
                    : 'sk-... və ya apikey-...'
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Model seçimi */}
          {currentProviderInfo && currentProviderInfo.models.length > 0 && (
            <div className="space-y-2">
              <Label>
                Model{' '}
                <span className="text-xs text-muted-foreground font-normal">
                  (əsas model avtomatik seçilir)
                </span>
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder={`Standart: ${currentProviderInfo.models[0]}`} />
                </SelectTrigger>
                <SelectContent>
                  {currentProviderInfo.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      <span className="font-mono text-xs">{model}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Test nəticəsi */}
          {testResult && (
            <Alert
              className={
                testResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={testResult.success ? 'text-green-800' : 'text-red-800'}
              >
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Düymələr */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!apiKey.trim() || testMutation.isPending}
              className="gap-2"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Bağlantını Test Et
            </Button>

            <Button
              onClick={handleSave}
              disabled={
                (!apiKey.trim() && !current?.has_api_key) || saveMutation.isPending
              }
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Yadda Saxla
            </Button>
          </div>

          {saveMutation.isSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Konfiqurasiya yadda saxlandı
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
