import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, ShieldAlert, Key, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export const TwoFactorAuth: React.FC = () => {
    const [factors, setFactors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [factorId, setFactorId] = useState<string>("");
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);

    const fetchFactors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            setFactors(data.all || []);
        } catch (error: any) {
            console.error("Erro ao listar fatores MFA:", error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFactors();
    }, []);

    const onEnroll = async () => {
        try {
            setVerifying(true);

            // Limpar tentativas anteriores que não foram finalizadas (evita mfa_factor_name_conflict)
            const { data: listData } = await supabase.auth.mfa.listFactors();
            if (listData?.all) {
                const unverifiedFactors = listData.all.filter(f => f.status === 'unverified');
                for (const factor of unverifiedFactors) {
                    await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
            }

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: "Authenticator App",
            });

            if (error) {
                console.error("Supabase MFA Enroll Error:", error);
                throw error;
            }

            setFactorId(data.id);
            // Usar a URI (otpauth://) para gerar o QR Code, pois data.totp.qr_code é um SVG
            const qrCode = await QRCode.toDataURL(data.totp.uri);
            setQrCodeUrl(qrCode);
            setIsEnrolling(true);
        } catch (error: any) {
            toast.error("Erro ao iniciar inscrição MFA: " + error.message);
        } finally {
            setVerifying(false);
        }
    };

    const onVerify = async () => {
        if (otp.length !== 6) return;

        try {
            setVerifying(true);
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId,
            });

            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: otp,
            });

            if (verifyError) throw verifyError;

            toast.success("Autenticação de dois fatores ativada com sucesso!");
            setIsEnrolling(false);
            setQrCodeUrl("");
            setOtp("");
            fetchFactors();
        } catch (error: any) {
            toast.error("Erro ao verificar código: " + error.message);
        } finally {
            setVerifying(false);
        }
    };

    const onUnenroll = async (fId: string) => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.mfa.unenroll({
                factorId: fId,
            });

            if (error) throw error;

            toast.success("Autenticação de dois fatores desativada.");
            fetchFactors();
        } catch (error: any) {
            toast.error("Erro ao desativar MFA: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const activeFactor = factors.find((f) => f.status === "verified");

    if (loading && !isEnrolling) {
        return (
            <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {isEnrolling ? (
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Configurar Aplicativo de Autenticação
                        </CardTitle>
                        <CardDescription>
                            Escaneie o QR Code abaixo com seu app de autenticação (Google Authenticator, Authy, etc.)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                        {qrCodeUrl && (
                            <div className="bg-white p-4 rounded-xl shadow-inner">
                                <img src={qrCodeUrl} alt="QR Code MFA" className="w-48 h-48" />
                            </div>
                        )}

                        <div className="space-y-4 w-full max-w-xs text-center">
                            <p className="text-xs text-muted-foreground">Insira o código de 6 dígitos gerado pelo seu aplicativo:</p>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={setOtp}
                                    disabled={verifying}
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

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setIsEnrolling(false)}
                                    disabled={verifying}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={onVerify}
                                    disabled={otp.length !== 6 || verifying}
                                >
                                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Verificar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : activeFactor ? (
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold flex items-center gap-1.5">
                                2FA Ativo
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            </p>
                            <p className="text-xs text-muted-foreground">Sua conta está protegida por TOTP</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => onUnenroll(activeFactor.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/50 rounded-full text-muted-foreground">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Autenticação de dois fatores</p>
                            <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={onEnroll}>
                        Ativar 2FA
                    </Button>
                </div>
            )}
        </div>
    );
};
