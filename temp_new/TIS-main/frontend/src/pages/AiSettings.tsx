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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle, XCircle, Loader2, Eye, EyeOff,
  Zap, Settings2, TestTube, Save, ExternalLink,
  Bot, Cpu, Sparkles, Copy, RefreshCw, Info,
  Check,
} from 'lucide-react';
import type { AiProvider, SaveAiSettingsRequest, AiProviderInfo } from '@/types/aiAnalysis';
import { toast } from 'sonner';

// Provider icon map
const PROVIDER_ICONS: Record<AiProvider, React.ComponentType<{ className?: string }>> = {
  openai: Cpu,
  anthropic: Bot,
  gemini: Sparkles,
};

// Provider colors for thematic styling
const PROVIDER_THEME: Record<AiProvider, { border: string; bg: string; text: string; lightBg: string }> = {
  openai: {
    border: 'border-green-500',
    bg: 'bg-green-500',
    text: 'text-green-700',
    lightBg: 'bg-green-50',
  },
  anthropic: {
    border: 'border-orange-500',
    bg: 'bg-orange-500',
    text: 'text-orange-700',
    lightBg: 'bg-orange-50',
  },
  gemini: {
    border: 'border-blue-500',
    bg: 'bg-blue-500',
    text: 'text-blue-700',
    lightBg: 'bg-blue-50',
  },
};

export default function AiSettings() {
  const { currentUser: _currentUser } = useAuth();
  void _currentUser;

  const queryClient = useQueryClient();

  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => aiSettingsService.getSettings(),
  });

  // Reset model on provider change
  const handleProviderChange = (provider: AiProvider) => {
    setSelectedProvider(provider);
    setSelectedModel('');
    setTestResult(null);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: SaveAiSettingsRequest) => aiSettingsService.saveSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setApiKey('');
      setTestResult(null);
      toast.success('Konfiqurasiya uğurla yadda saxlandı');
    },
    onError: (error: any) => {
      toast.error('Xəta baş verdi: ' + (error.message || 'Naməlum xəta'));
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      // If API key is changed but not saved, we should warn or save first.
      // Logic from existing file: save then test.
      if (apiKey.trim()) {
        await aiSettingsService.saveSettings({
          provider: selectedProvider,
          api_key: apiKey.trim(),
          model: selectedModel || null,
        });
      }
      return aiSettingsService.testConnection();
    },
    onSuccess: (result) => {
      setTestResult({ success: result.success, message: result.message });
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      if (result.success) {
        toast.success('Bağlantı uğurludur!');
      } else {
        toast.error('Bağlantı xətası: ' + result.message);
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast.error('Test zamanı xəta: ' + error.message);
    },
  });

  const handleSave = () => {
    const isCurrentProvider = settings?.current_settings?.provider === selectedProvider;
    if (!apiKey.trim() && (!settings?.current_settings?.has_api_key || !isCurrentProvider)) {
      toast.error('API açarı daxil edilməlidir');
      return;
    }
    
    saveMutation.mutate({
      provider: selectedProvider,
      api_key: apiKey.trim(),
      model: selectedModel || undefined,
    });
  };

  const handleTest = () => {
    const isCurrentProvider = settings?.current_settings?.provider === selectedProvider;
    if (!apiKey.trim() && (!settings?.current_settings?.has_api_key || !isCurrentProvider)) {
      toast.error('Test etmək üçün API açarı daxil edilməlidir');
      return;
    }
    testMutation.mutate();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.info('Model adı kopyalandı');
  };

  const handleResetToDefault = () => {
    setSelectedModel('');
    toast.info('Tövsiyə olunan model seçildi');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Konfiqurasiya yüklənir...</p>
      </div>
    );
  }

  const providers: AiProviderInfo[] = settings?.available_providers ?? [];
  const current = settings?.current_settings;
  const currentProviderInfo = providers.find((p) => p.id === selectedProvider);

  const providerDisplayName = (id: AiProvider): string => {
    const found = providers.find(p => p.id === id);
    return found ? found.name : id;
  };

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-4xl mx-auto p-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 shadow-inner">
              <Settings2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">AI İdarəetmə</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                Sistem üzrə LLM (Large Language Model) provayderlərinin konfiqurasiyası
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Bu tənzimləmələr AI Analiz və Digər AI funksiyaları üçün əsas model parametrlərini müəyyən edir.
                  </TooltipContent>
                </Tooltip>
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className={[
            "py-1.5 px-3 text-sm h-fit self-start md:self-center",
            settings?.is_configured 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
          ].join(" ")}>
            {settings?.is_configured ? (
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Aktivləşdirilib</span>
            ) : (
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Konfiqurasiya Lazımdır</span>
            )}
          </Badge>
        </div>

        {/* Current Config Alert */}
        {current && (
          <Alert className={`border-none shadow-sm ${PROVIDER_THEME[current.provider].lightBg} transform transition-all hover:scale-[1.01]`}>
            <CheckCircle className={`h-5 w-5 ${PROVIDER_THEME[current.provider].text}`} />
            <AlertDescription className={`${PROVIDER_THEME[current.provider].text} text-[15px]`}>
              Hazırda <span className="font-bold underline decoration-2 underline-offset-4">{providerDisplayName(current.provider)}</span> aktivdir. 
              İşlək model: <code className="bg-white/60 px-2 py-0.5 rounded font-mono text-xs ml-1 border border-black/5">{current.effective_model}</code>
              {current.updated_at && (
                <span className="text-xs ml-3 opacity-80 inline-flex items-center gap-1">
                  • Son yenilənmə: {new Date(current.updated_at).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Provider Selection (Left/Top) */}
          <div className="lg:col-span-12">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" /> Provayder Seçimi
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {providers.map((provider) => {
                const Icon = PROVIDER_ICONS[provider.id] ?? Cpu;
                const isSelected = selectedProvider === provider.id;
                const isActive = current?.provider === provider.id;
                const theme = PROVIDER_THEME[provider.id];

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleProviderChange(provider.id)}
                    className={[
                      'group relative flex flex-col items-start p-6 rounded-2xl border-2 text-left transition-all duration-300',
                      'hover:shadow-xl hover:translate-y-[-2px] overflow-hidden',
                      isSelected
                        ? `${theme.border} ${theme.lightBg} ring-4 ring-offset-2 ring-transparent`
                        : 'border-border bg-card hover:border-primary/30',
                    ].join(' ')}
                  >
                    {isActive && (
                      <Badge className="absolute top-2 right-2 bg-primary hover:bg-primary pointer-events-none scale-75 md:scale-90">
                        Aktiv
                      </Badge>
                    )}
                    
                    <div className={[
                      'p-3 rounded-xl mb-4 transition-colors',
                      isSelected ? theme.bg : 'bg-muted group-hover:bg-primary/10'
                    ].join(' ')}>
                       <Icon className={isSelected ? 'h-6 w-6 text-white' : 'h-6 w-6 text-muted-foreground group-hover:text-primary'} />
                    </div>

                    <span className="font-bold text-lg mb-1">{provider.name}</span>
                    <span className="text-sm text-muted-foreground leading-snug h-8 overflow-hidden line-clamp-2">
                      {provider.description}
                    </span>
                    
                    <div className="mt-6 flex items-center justify-between w-full">
                       <a
                        href={provider.docs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        API açarı al <ExternalLink className="h-3 w-3" />
                      </a>
                      
                      {isSelected && (
                        <div className={`h-2 w-2 rounded-full ${theme.bg} animate-pulse`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* API Configuration (Main Area) */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm overflow-hidden border">
              <div className={`h-1.5 w-full ${PROVIDER_THEME[selectedProvider].bg}`} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Konfiqurasiya Parametrləri
                </CardTitle>
                <CardDescription>
                  {currentProviderInfo?.name ?? selectedProvider} üçün lazım olan texniki tənzimləmələri qeyd edin.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* API Key */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="api-key" className="text-sm font-semibold">API Açarı</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help flex items-center gap-1">
                          Gizli <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>API açarı bazada şifrələnmiş şəkildə saxlanılır.</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="relative group">
                    <Input
                      id="api-key"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={
                        current?.has_api_key && current?.provider === selectedProvider
                          ? '••••••••••••••••••••••••••••••• (mövcud açar aktivdir)'
                          : `sk-... və ya ${selectedProvider === 'gemini' ? 'AIza' : 'api'}-...`
                      }
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10 font-mono text-sm py-6 bg-background/50 border-input transition-all focus:ring-primary h-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-2 rounded-full transition-colors"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Model Selection */}
                {currentProviderInfo && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">İşlək Model</Label>
                      {selectedModel && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
                          onClick={handleResetToDefault}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Tövsiyə olunana qayıt
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger className="h-12 bg-background/50">
                            <SelectValue placeholder={`Tövsiyə olunan: ${currentProviderInfo.models[0]}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {currentProviderInfo.models.map((model) => (
                              <SelectItem key={model} value={model} textValue={model}>
                                <div className="flex items-center justify-between w-full min-w-[200px]">
                                  <span className="font-mono text-xs">{model}</span>
                                  {model === currentProviderInfo.models[0] && (
                                    <Badge variant="outline" className="ml-2 py-0 h-4 text-[10px] bg-primary/5 text-primary border-primary/20">Tövsiyə</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedModel && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 flex-shrink-0"
                          onClick={() => copyToClipboard(selectedModel)}
                        >
                          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground px-1">
                      Sistem avtomatik olaraq seçilmiş provayder üçün ən optimal modeli təyin edir.
                    </p>
                  </div>
                )}

                {/* Status Result */}
                {testResult && (
                  <Alert
                    className={[
                      'border-none animate-in slide-in-from-top-2 duration-300',
                      testResult.success
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    ].join(' ')}
                  >
                    <div className="flex gap-3">
                      {testResult.success ? (
                        <div className="bg-green-100 p-1 rounded-full h-fit"><CheckCircle className="h-4 w-4 text-green-600" /></div>
                      ) : (
                        <div className="bg-red-100 p-1 rounded-full h-fit"><XCircle className="h-4 w-4 text-red-600" /></div>
                      )}
                      <div>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          {testResult.success ? 'Bağlantı uğurludur' : 'Bağlantı xətası'}
                        </p>
                        <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{testResult.message}</p>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={(!apiKey.trim() && !current?.has_api_key) || testMutation.isPending}
                    className="flex-1 h-12 gap-2 font-semibold hover:bg-background"
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
                      (!apiKey.trim() && (!current?.has_api_key || current?.provider !== selectedProvider)) || saveMutation.isPending
                    }
                    className="flex-1 h-12 gap-2 font-semibold shadow-lg shadow-primary/20"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Yadda Saxla
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tips / Info (Right/Bottom) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-primary/[0.02] border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" /> Professional Məsləhət
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hansı modeli seçməli?</h4>
                  <p className="text-sm text-balance leading-relaxed">
                    Sistem üçün ən optimal və sürətli seçim <strong>Flash</strong> və ya <strong>Turbo</strong> modelleridir.
                    Mürəkkəb analizlər üçün isə Pro/Sonnet modellerini təklif edirik.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-primary/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Təhlükəsizlik</h4>
                  <p className="text-sm leading-relaxed">
                    API açarlarınız heç vaxt açıq şəkildə bazada saxlanılmır və hər bir sorğu təhlükəsiz tunnel vasitəsilə göndərilir.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed bg-transparent">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-2">
                  <Bot className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI xidmətləri üçün hər hansı bir məhdudiyyət və ya limit problemi yaşanarsa, lütfən provider-in rəsmi dashboard-unu yoxlayın.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
