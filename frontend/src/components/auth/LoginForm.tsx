import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EyeIcon, EyeOffIcon, ShieldIcon, AlertTriangle, X } from "lucide-react";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  loadingMessage?: string;
  onErrorDismiss?: () => void;
  retryCount?: number;
  showHelpfulHints?: boolean;
}

export const LoginForm = ({ onLogin, isLoading = false, error, loadingMessage, onErrorDismiss, retryCount = 0, showHelpfulHints = true }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Real-time email validation
  const validateEmail = (email: string) => {
    if (!email) return "";

    // Check if it looks like an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(email);

    // If it contains @ but isn't valid email format
    if (email.includes("@") && !isEmail) {
      return "Email formatı düzgün deyil";
    }

    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  // Generate helpful hints based on retry count and error state
  const getHelpfulHints = () => {
    if (!showHelpfulHints || !error) return [];

    const hints = [];

    // Base hints (always shown)
    hints.push("📧 İstifadəçi adınızı və ya email ünvanınızı yoxlayın");
    hints.push("🔒 Şifrənizi diqqətlə yenidən daxil edin");

    // Progressive hints based on retry count
    if (retryCount >= 1) {
      hints.push("💡 Email formatının düzgün olduğunu yoxlayın (@domain.com)");
    }

    if (retryCount >= 2) {
      hints.push("⚠️ Böyük və kiçik hərflərin düzgün olduğunu yoxlayın");
      if (capsLockOn) {
        hints.push("🔤 Caps Lock açıq görünür!");
      }
    }

    if (retryCount >= 3) {
      hints.push("🔄 'Şifrəni unutmusunuz?' linkindən istifadə etməyi sınayın");
    }

    return hints;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Dismiss error with Escape key
      if (e.key === 'Escape' && error && onErrorDismiss) {
        e.preventDefault();
        onErrorDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [error, onErrorDismiss]);

  // Handle input field navigation
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      // Focus on password field
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      if (passwordInput) {
        passwordInput.focus();
      }
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Caps Lock detection
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }

    if (e.key === 'Enter' && !isLoading && email && password) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Additional Caps Lock detection on password input
  const handlePasswordInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    setPassword(value);

    // Simple caps detection - if typing and all letters are uppercase
    if (value.length > 0) {
      const lastChar = value.slice(-1);
      if (lastChar.match(/[A-Z]/) && e.nativeEvent instanceof InputEvent) {
        setCapsLockOn(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
            <ShieldIcon className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground font-heading">
              ATİS
            </h1>
            <p className="text-sm text-muted-foreground">
              Azərbaycan Təhsil İdarəetmə Sistemi
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-elevated border-border-light">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold">Sistemə giriş</CardTitle>
            <CardDescription>
              Hesabınıza daxil olmaq üçün məlumatlarınızı daxil edin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="space-y-3">
                <Alert variant="destructive" role="alert" aria-live="polite" className="relative">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Giriş Xətası</AlertTitle>
                  <AlertDescription id="login-error">{error}</AlertDescription>
                  {onErrorDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onErrorDismiss}
                      className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-red-100"
                      aria-label="Xətanı bağla"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </Alert>

                {/* Helpful Hints */}
                {getHelpfulHints().length > 0 && (
                  <Alert variant="default" className="border-blue-200 bg-blue-50">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-blue-800">
                        Tövsiyələr:
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {getHelpfulHints().map((hint, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span>{hint}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Alert>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">İstifadəçi adı və ya E-poçt ünvanı</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="superadmin və ya admin@edu.gov.az"
                  value={email}
                  onChange={handleEmailChange}
                  onKeyDown={handleEmailKeyDown}
                  required
                  aria-describedby={error || emailError ? "login-error email-error" : undefined}
                  aria-invalid={!!(error || emailError)}
                  className={`focus:ring-input-focus focus:border-input-focus ${
                    emailError ? 'border-yellow-300 focus:border-yellow-400' : ''
                  }`}
                />
                {emailError && (
                  <p id="email-error" className="text-sm text-yellow-600" role="alert">
                    ⚠️ {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onInput={handlePasswordInput}
                    onKeyDown={handlePasswordKeyDown}
                    required
                    aria-describedby={error ? "login-error" : undefined}
                    aria-invalid={!!error}
                    className="pr-10 focus:ring-input-focus focus:border-input-focus"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <EyeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {capsLockOn && (
                  <p className="text-sm text-yellow-600" role="alert">
                    🔤 Caps Lock açıqdır! Şifrənizi yenidən yoxlayın.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="hero"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (loadingMessage || "Gözləyin...") : "Giriş"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                Şifrəni unutmusunuz?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© 2025 Azərbaycan Respublikası Təhsil Nazirliyi</p>
          <p>Versiya 2.0 Enhanced</p>
        </div>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      </div>
    </div>
  );
};