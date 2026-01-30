import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import FloxBeeLogo from "@/components/FloxBeeLogo";
import { Loader2, Mail, Lock, User, ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // MFA states
  const [showMFA, setShowMFA] = useState(false);
  const [mfaOtp, setMfaOtp] = useState("");

  // Forgot password form
  const [resetEmail, setResetEmail] = useState("");

  // New password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowResetPassword(true);
        setCheckingSession(false);
        return;
      }

      if (session && !showResetPassword && !showMFA) {
        // Only navigate if session is fully authenticated or MFA is not required
        checkMFAStatus();
      }
      setCheckingSession(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !showResetPassword) {
        checkMFAStatus();
      }
      setCheckingSession(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, showResetPassword]);

  const checkMFAStatus = async () => {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) {
      console.error("Error checking MFA level:", error);
      return;
    }

    if (data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      setShowMFA(true);
    } else if (data.currentLevel === "aal2" || data.nextLevel === "aal1") {
      navigate("/");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      // Check if MFA is needed
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaData?.nextLevel === "aal2" && mfaData.currentLevel !== "aal2") {
        setShowMFA(true);
        setLoading(false);
      } else {
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso",
        });
        navigate("/");
        // Loading is set to false by navigation or naturally
      }
    }
  };

  const handleMFAVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (mfaOtp.length !== 6) return;

    setLoading(true);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;

      const totpFactor = factors.data.totp[0];
      if (!totpFactor) throw new Error("Nenhum fator MFA encontrado");

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: mfaOtp,
      });

      if (verify.error) throw verify.error;

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Erro na verificação",
        description: error.message,
        variant: "destructive",
      });
      setMfaOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = resetPasswordSchema.safeParse({ email: resetEmail });
    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = newPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword: confirmNewPassword
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi redefinida com sucesso.",
      });
      setShowResetPassword(false);
      setNewPassword("");
      setConfirmNewPassword("");
      navigate("/");
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-whatsapp-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-whatsapp-teal/10 via-whatsapp-bg to-whatsapp-green/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <FloxBeeLogo size={48} />
        </div>

        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl text-whatsapp-dark">
              {showMFA
                ? "Verificação de 2 Fatores"
                : showResetPassword
                  ? "Redefinir Senha"
                  : showForgotPassword
                    ? "Recuperar Senha"
                    : "Acesse o Sistema"}
            </CardTitle>
            <CardDescription>
              {showMFA
                ? "Insira o código gerado pelo seu aplicativo"
                : showResetPassword
                  ? "Digite sua nova senha abaixo"
                  : showForgotPassword
                    ? "Enviaremos um link para seu email"
                    : "CRM e Gestor de Atendimento Omnicanal"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {showMFA ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <div className="p-3 bg-primary/10 rounded-full text-primary">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={mfaOtp}
                      onChange={setMfaOtp}
                      onComplete={() => handleMFAVerify()}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleMFAVerify()}
                    className="w-full"
                    disabled={mfaOtp.length !== 6 || loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar e Entrar
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setShowMFA(false);
                      setMfaOtp("");
                    }}
                    disabled={loading}
                  >
                    Voltar para o login
                  </Button>
                </div>
              </div>
            ) : showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type={showConfirmNewPassword ? "text" : "password"}
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Nova Senha"
                  )}
                </Button>
              </form>
            ) : showForgotPassword ? (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao login
                </Button>
              </form>
            ) : (
              /* Login Form Only */
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer com links para Política de Privacidade e Termos de Uso */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <Link
              to="/termos-de-uso"
              className="text-primary hover:underline font-medium"
            >
              Termos de Uso
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link
              to="/politica-de-privacidade"
              className="text-primary hover:underline font-medium"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Sistema de Fluxo Inteligente de Atendimento
        </p>
      </div>
    </div>
  );
};

export default Auth;
