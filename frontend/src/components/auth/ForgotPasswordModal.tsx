import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Mail } from 'lucide-react';
import { authService } from '@/services/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const validateEmail = (email: string): string => {
    if (!email.trim()) {
      return 'Email ünvanını daxil edin';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Keçərli email ünvanı daxil edin';
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Password reset request failed:', error);

      if (error?.response?.status === 429) {
        const retryAfter = error?.response?.data?.retry_after || 60;
        setRetryAfter(retryAfter);
        setError(`Çox sayda cəhd. ${Math.ceil(retryAfter / 60)} dəqiqə sonra cəhd edin.`);
      } else if (error?.response?.status === 422) {
        const validationErrors = error?.response?.data?.errors;
        if (validationErrors?.email) {
          setError(validationErrors.email[0]);
        } else {
          setError('Email ünvanı mövcud deyil.');
        }
      } else {
        setError('Xəta baş verdi. Yenidən cəhd edin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setIsSuccess(false);
    setRetryAfter(null);
    onClose();
  };

  const handleTryAgain = () => {
    setIsSuccess(false);
    setError('');
    setEmail('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Şifrəni Unutmusunuz?</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Email ünvanınızı daxil edin və şifrə sıfırlama linkini göndərəcəyik
        </p>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Email Göndərildi!
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>{email}</strong> ünvanına şifrə sıfırlama linki göndərildi.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Növbəti addımlar:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Email qutunuzu yoxlayın (spam folder daxil olmaqla)</li>
                        <li>• Linkə tıklayın və yeni şifrə təyin edin</li>
                        <li>• Link 60 dəqiqə ərzində keçərlidir</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleClose} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Girişə Qayıt
              </Button>
              <Button
                variant="outline"
                onClick={handleTryAgain}
                className="flex-1"
              >
                Başqa Email
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Ünvanı *</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="admin@edu.gov.az"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(''); // Clear error on typing
                }}
                required
                disabled={isLoading}
                className="focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                Qeydiyyat zamanı istifadə etdiyiniz email ünvanını daxil edin
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {retryAfter && (
                    <div className="mt-2 text-xs">
                      Rate limiting səbəbindən müvəqqəti məhdudiyyət tətbiq edilib.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ləğv et
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Göndərilir...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Link Göndər
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};