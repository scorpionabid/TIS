import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/auth/LoginForm";

interface ErrorInfo {
  message: string;
  canRetry: boolean;
  isNetwork: boolean;
  code?: string;
  retryAfter?: number;
}

const categorizeError = (error: unknown): ErrorInfo => {
  const errorMessage =
    error instanceof Error ? error.message : "Giriş xətası";
  const errorData =
    typeof error === "object" && error !== null ? (error as Record<string, unknown>) : {};
  const derivedCode =
    (errorData.code as string | undefined) ??
    ((errorData as { errors?: { code?: string[] } }).errors?.code?.[0]);
  const rawRetryAfter =
    (errorData.retryAfter as number | string | undefined) ??
    (errorData.retry_after as number | string | undefined) ??
    ((errorData as { errors?: { retry_after?: string[] } }).errors?.retry_after?.[0]);
  const retryAfter =
    typeof rawRetryAfter === "number"
      ? rawRetryAfter
      : rawRetryAfter
        ? Number(rawRetryAfter)
        : undefined;

  if (derivedCode === "RATE_LIMITED") {
    return {
      message: retryAfter
        ? `Çox sayda cəhd. ${retryAfter} saniyə sonra yenidən cəhd edin.`
        : "Çox sayda cəhd. Zəhmət olmasa bir az sonra yenidən cəhd edin.",
      canRetry: false,
      isNetwork: false,
      code: derivedCode,
      retryAfter,
    };
  }
  if (derivedCode === "BAD_CREDENTIALS") {
    return {
      message: "İstifadəçi adı və ya şifrə yanlışdır.",
      canRetry: false,
      isNetwork: false,
      code: derivedCode,
    };
  }
  if (derivedCode === "ACCOUNT_INACTIVE") {
    return {
      message: errorMessage || "Hesabınız deaktiv edilib.",
      canRetry: false,
      isNetwork: false,
      code: derivedCode,
    };
  }
  if (derivedCode === "PASSWORD_RESET_REQUIRED") {
    return {
      message: "Şifrənizi yeniləməlisiniz. Zəhmət olmasa davam edin.",
      canRetry: false,
      isNetwork: false,
      code: derivedCode,
    };
  }

  // Network/Connection errors (retriable)
  if (
    errorMessage.includes("fetch") ||
    errorMessage.includes("NetworkError") ||
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("timeout") ||
    errorMessage.includes("Unable to initialize authentication")
  ) {
    return {
      message: "Şəbəkə əlaqəsi problemi. Zəhmət olmasa bir az sonra cəhd edin.",
      canRetry: true,
      isNetwork: true,
    };
  }

  // Authentication errors (not retriable)
  if (
    errorMessage.includes("credentials") ||
    errorMessage.includes("yanlışdır") ||
    errorMessage.includes("401")
  ) {
    return {
      message: "İstifadəçi adı və ya şifrə yanlışdır.",
      canRetry: false,
      isNetwork: false,
    };
  }

  // Server errors (partially retriable)
  if (errorMessage.includes("500") || errorMessage.includes("server")) {
    return {
      message: "Server xətası baş verdi. Zəhmət olmasa bir az sonra cəhd edin.",
      canRetry: true,
      isNetwork: false,
    };
  }

  return {
    message: errorMessage,
    canRetry: false,
    isNetwork: false,
    code: derivedCode,
    retryAfter,
  };
};

const LoginPage = () => {
  const { login, loading, isAuthenticated } = useAuth();
  const [loginError, setLoginError] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [forceForgotPassword, setForceForgotPassword] = useState(false);
  const location = useLocation();

  if (isAuthenticated) {
    const intendedUrl = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";
    return <Navigate to={intendedUrl} replace />;
  }

  // Smart retry logic with exponential backoff
  const handleRetry = async (
    email: string,
    password: string,
    remember: boolean,
    attemptNumber: number = 1,
  ): Promise<boolean> => {
    const maxRetries = 3;
    const baseDelay = 1000;

    if (attemptNumber > maxRetries) {
      setLoginError("Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin.");
      return false;
    }

    try {
      if (attemptNumber > 1) {
        setIsRetrying(true);
        const delay = baseDelay * Math.pow(2, attemptNumber - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        setIsRetrying(false);
      }

      await login({ email, password, remember });
      setRetryCount(0);
      return true;
    } catch (error) {
      const { message, canRetry, isNetwork, code } = categorizeError(error);

      if (canRetry && isNetwork && attemptNumber < maxRetries) {
        setRetryCount(attemptNumber);
        return handleRetry(email, password, remember, attemptNumber + 1);
      } else {
        setLoginError(message);
        if (code === "PASSWORD_RESET_REQUIRED") {
          setForceForgotPassword(true);
        }
        setRetryCount(0);
        return false;
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleLogin = async (
    email: string,
    password: string,
    remember: boolean,
  ) => {
    try {
      setLoginError(undefined);
      setRetryCount(0);
      setForceForgotPassword(false);
      await handleRetry(email, password, remember, 1);
    } catch (error) {
      const { message, code } = categorizeError(error);
      setLoginError(message);
      if (code === "PASSWORD_RESET_REQUIRED") {
        setForceForgotPassword(true);
      }
    }
  };

  const getLoadingMessage = () => {
    if (isRetrying && retryCount > 0) {
      return `Yenidən cəhd edilir... (${retryCount}/3)`;
    }
    if (loading) {
      return "Məlumatlar yoxlanılır...";
    }
    return undefined;
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      isLoading={loading || isRetrying}
      error={loginError}
      loadingMessage={getLoadingMessage()}
      onErrorDismiss={() => setLoginError(undefined)}
      retryCount={retryCount}
      showHelpfulHints={true}
      forceForgotPassword={forceForgotPassword}
      onForgotPasswordAutoOpen={() => setForceForgotPassword(false)}
    />
  );
};

export default LoginPage;
