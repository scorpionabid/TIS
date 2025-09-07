import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeIcon, EyeOffIcon, ShieldIcon } from "lucide-react";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export const LoginForm = ({ onLogin, isLoading = false, error }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">İstifadəçi adı və ya E-poçt ünvanı</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="superadmin və ya admin@edu.gov.az"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="focus:ring-input-focus focus:border-input-focus"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifrə</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
              </div>
              <Button
                type="submit"
                className="w-full"
                variant="hero"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Gözləyin..." : "Giriş"}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <Button variant="link" className="text-sm text-muted-foreground">
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
      </div>
    </div>
  );
};