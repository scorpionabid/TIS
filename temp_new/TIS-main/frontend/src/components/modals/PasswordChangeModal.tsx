import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Lock, 
  Eye, 
  EyeOff,
  Loader2,
  Shield,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { profileService } from '@/services/profile';
import { useToast } from '@/hooks/use-toast';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false
  });

  const { toast } = useToast();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<PasswordFormData>({
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: ''
    }
  });

  const newPassword = watch('new_password');
  const confirmPassword = watch('new_password_confirmation');

  // Password strength validation
  React.useEffect(() => {
    if (!newPassword) {
      setPasswordStrength({ score: 0, feedback: [], isValid: false });
      return;
    }

    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (newPassword.length >= 8) {
      score += 20;
    } else {
      feedback.push('Minimum 8 simvol olmalıdır');
    }

    // Uppercase check
    if (/[A-Z]/.test(newPassword)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 böyük hərf olmalıdır');
    }

    // Lowercase check
    if (/[a-z]/.test(newPassword)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 kiçik hərf olmalıdır');
    }

    // Number check
    if (/[0-9]/.test(newPassword)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 rəqəm olmalıdır');
    }

    // Special character check
    if (/[^A-Za-z0-9]/.test(newPassword)) {
      score += 20;
    } else {
      feedback.push('Minimum 1 xüsusi simvol olmalıdır');
    }

    setPasswordStrength({
      score,
      feedback,
      isValid: score >= 80
    });
  }, [newPassword]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score >= 80) return 'text-green-600';
    if (passwordStrength.score >= 60) return 'text-yellow-600';
    if (passwordStrength.score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score >= 80) return 'Güclü';
    if (passwordStrength.score >= 60) return 'Orta';
    if (passwordStrength.score >= 40) return 'Zəif';
    return 'Çox zəif';
  };

  const onSubmit = async (data: PasswordFormData) => {
    if (data.new_password !== data.new_password_confirmation) {
      toast({
        title: 'Xəta',
        description: 'Yeni şifrə və təsdiqləmə şifrəsi uyğun gəlmir',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordStrength.isValid) {
      toast({
        title: 'Xəta',
        description: 'Şifrə tələbləri qarşılanmır',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      await profileService.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation
      });
      
      toast({
        title: 'Uğurlu',
        description: 'Şifrə uğurla dəyişdirildi',
      });
      
      reset();
      onClose();
      
    } catch (error: any) {
      console.error('Şifrə dəyişdirilərkən xəta:', error);
      
      let errorMessage = 'Şifrə dəyişdirilə bilmədi. Yenidən cəhd edin.';
      if (error.message.includes('current password')) {
        errorMessage = 'Mövcud şifrə yanlışdır';
      }
      
      toast({
        title: 'Xəta',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Şifrəni Dəyişdir</span>
          </DialogTitle>
          <DialogDescription>
            Təhlükəsizlik üçün güclü şifrə seçin və onu başqası ilə paylaşmayın.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current_password">Mövcud Şifrə *</Label>
            <div className="relative">
              <Input
                id="current_password"
                type={showCurrentPassword ? 'text' : 'password'}
                {...register('current_password', { required: 'Mövcud şifrəni daxil edin' })}
                placeholder="Mövcud şifrənizi daxil edin"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-0 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.current_password && (
              <p className="text-sm text-destructive">{errors.current_password.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new_password">Yeni Şifrə *</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                {...register('new_password', { 
                  required: 'Yeni şifrəni daxil edin',
                  minLength: {
                    value: 8,
                    message: 'Şifrə minimum 8 simvol olmalıdır'
                  }
                })}
                placeholder="Yeni şifrənizi daxil edin"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-0 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {newPassword && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.score >= 80 ? 'bg-green-500' :
                        passwordStrength.score >= 60 ? 'bg-yellow-500' :
                        passwordStrength.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${getPasswordStrengthColor()}`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                
                {passwordStrength.feedback.length > 0 && (
                  <div className="space-y-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{feedback}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {passwordStrength.isValid && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Şifrə tələbləri qarşılanır</span>
                  </div>
                )}
              </div>
            )}
            
            {errors.new_password && (
              <p className="text-sm text-destructive">{errors.new_password.message}</p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="new_password_confirmation">Yeni Şifrəni Təsdiqləyin *</Label>
            <div className="relative">
              <Input
                id="new_password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('new_password_confirmation', { 
                  required: 'Şifrə təsdiqləməsi tələb olunur',
                  validate: (value) => 
                    value === newPassword || 'Şifrələr uyğun gəlmir'
                })}
                placeholder="Yeni şifrənizi təkrar daxil edin"
                className="pr-10"
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
            {confirmPassword && newPassword && (
              <div className="flex items-center space-x-2">
                {confirmPassword === newPassword ? (
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
            
            {errors.new_password_confirmation && (
              <p className="text-sm text-destructive">{errors.new_password_confirmation.message}</p>
            )}
          </div>

          {/* Security Tips */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center">
              <Lock className="h-4 w-4 mr-2" />
              Şifrə təhlükəsizliyi tövsiyələri:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Şifrəni başqa saytlarda istifadə etməyin</li>
              <li>• Şifrəni heç kimlə paylaşmayın</li>
              <li>• Mütəmadi olaraq şifrəni dəyişdirin</li>
              <li>• Güclü və unikal şifrə seçin</li>
            </ul>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !passwordStrength.isValid}
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Dəyişdirilir...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Şifrəni Dəyişdir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};