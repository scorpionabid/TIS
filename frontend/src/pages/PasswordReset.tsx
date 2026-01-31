import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Shield,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { authService } from '@/services/auth';

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export const PasswordReset: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    password_confirmation: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false
  });

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Redirect if no token or email
  useEffect(() => {
    if (!token || !email) {
      navigate('/login');
    }
  }, [token, email, navigate]);

  // Password strength validation
  useEffect(() => {
    if (!formData.password) {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
      return;
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (formData.password.length >= 8) {
      score += 20;
    } else {
      feedback.push('Minimum 8 simvol olmalıdır');
    }

    // Uppercase check
    if (/[A-Z]/.test(formData.password)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 böyük hərf (A-Z) olmalıdır');
    }

    // Lowercase check
    if (/[a-z]/.test(formData.password)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 kiçik hərf (a-z) olmalıdır');
    }

    // Number check
    if (/[0-9]/.test(formData.password)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 rəqəm (0-9) olmalıdır');
    }

    // Special character check
    if (/[@$!%*?&]/.test(formData.password)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 xüsusi simvol (@$!%*?&) olmalıdır');
    }

    setPasswordStrength({
      score,
      feedback,
      isValid: score >= 80
    });
  }, [formData.password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score >= 80) return 'bg-green-500';
    if (passwordStrength.score >= 60) return 'bg-yellow-500';
    if (passwordStrength.score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score >= 80) return 'Güclü';
    if (passwordStrength.score >= 60) return 'Orta';
    if (passwordStrength.score >= 40) return 'Zəif';
    return 'Çox zəif';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!passwordStrength.isValid) {
      setError('Şifrə tələbləri qarşılanmır. Bütün şərtləri yerinə yetirin.');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      setError('Şifrələr uyğun gəlmir');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPasswordWithToken({
        token: token!,
        email: email!,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Password reset failed:', error);

      let errorMessage = 'Şifrə yenilənə bilmədi. Yenidən cəhd edin.';

      if (error?.response?.status === 400) {
        errorMessage = 'Keçərsiz və ya vaxtı keçmiş token. Yeni sıfırlama tələbi göndərin.';
      } else if (error?.response?.status === 422) {
        const validationErrors = error?.response?.data?.errors;
        if (validationErrors) {
          errorMessage = Object.values(validationErrors).flat().join(', ');
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError(''); // Clear error on typing
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-green-800">
              Şifrə Uğurla Yeniləndi!
            </h2>
            <p className="text-muted-foreground">
              Artıq yeni şifrənizlə ATİS sistemə daxil ola bilərsiniz.
              Təhlükəsizlik üçün bütün cihazlarda yenidən giriş etməlisiniz.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <strong>Email:</strong> {email}
              </p>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sistemə Daxil Ol
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-primary">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground font-heading">
              Yeni Şifrə Təyin Et
            </h1>
            <p className="text-sm text-muted-foreground">
              {email} üçün güclü şifrə təyin edin
            </p>
          </div>
        </div>

        <Card className="shadow-elevated border-border-light">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Şifrə Yeniləmə
            </CardTitle>
            <CardDescription>
              Təhlükəsizlik üçün güclü şifrə seçin və onu başqası ilə paylaşmayın
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifrə *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange('password')}
                    placeholder="Yeni şifrənizi daxil edin"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score >= 80 ? 'text-green-600' :
                        passwordStrength.score >= 60 ? 'text-yellow-600' :
                        passwordStrength.score >= 40 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-1">
                      {passwordStrength.feedback.map((feedback, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                          <span className="text-xs text-red-600">{feedback}</span>
                        </div>
                      ))}
                      {passwordStrength.isValid && (
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">Şifrə tələbləri qarşılanır</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Şifrəni Təsdiqləyin *</Label>
                <div className="relative">
                  <Input
                    id="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.password_confirmation}
                    onChange={handleInputChange('password_confirmation')}
                    placeholder="Şifrənizi təkrar daxil edin"
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-0 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {/* Password Match Indicator */}
                {formData.password_confirmation && formData.password && (
                  <div className="flex items-center space-x-2">
                    {formData.password_confirmation === formData.password ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600">Şifrələr uyğundur</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-500">Şifrələr uyğun gəlmir</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Security Tips */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium mb-2 flex items-center text-blue-800">
                  <Shield className="h-4 w-4 mr-2" />
                  Şifrə təhlükəsizliyi tövsiyələri:
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Şifrəni başqa sayt və ya tətbiqlərdə istifadə etməyin</li>
                  <li>• Şifrəni heç kimlə paylaşmayın</li>
                  <li>• Mütəmadi olaraq şifrəni yeniləyin</li>
                  <li>• Güclü və unikal şifrə seçin</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !passwordStrength.isValid || formData.password !== formData.password_confirmation}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yenilənir...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Şifrəni Yenilə
                  </>
                )}
              </Button>

              {/* Back to Login */}
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/login')}
                disabled={isLoading}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Girişə Qayıt
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>© Təhsil idarəetmə sistemi</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;