import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    generateQRCodeDataURL,
    generateQRCodeSVG,
    downloadQRCodePNG,
    downloadQRCodeSVG,
    generateQRContent,
} from '@/lib/qrCodeGenerator';

interface QRCodeGeneratorProps {
    onGenerate?: (dataUrl: string, tipo: string, dados: any) => void;
    initialTipo?: string;
    initialDados?: any;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    onGenerate,
    initialTipo = 'url',
    initialDados = {},
}) => {
    const { toast } = useToast();
    const [tipo, setTipo] = useState(initialTipo);
    const [qrContent, setQrContent] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [qrSvg, setQrSvg] = useState('');
    const [copied, setCopied] = useState(false);

    // Form fields for different types
    const [url, setUrl] = useState(initialDados.url || '');
    const [whatsappPhone, setWhatsappPhone] = useState(initialDados.phone || '');
    const [whatsappMessage, setWhatsappMessage] = useState(initialDados.message || '');
    const [vcardName, setVcardName] = useState(initialDados.name || '');
    const [vcardPhone, setVcardPhone] = useState(initialDados.phone || '');
    const [vcardEmail, setVcardEmail] = useState(initialDados.email || '');
    const [vcardOrg, setVcardOrg] = useState(initialDados.organization || '');

    // Generate QR code content based on type
    const generateContent = () => {
        let content = '';
        let dados = {};

        switch (tipo) {
            case 'url':
                content = url;
                dados = { url };
                break;
            case 'whatsapp':
                content = generateQRContent.whatsapp(whatsappPhone, whatsappMessage);
                dados = { phone: whatsappPhone, message: whatsappMessage };
                break;
            case 'vcard':
                content = generateQRContent.vcard({
                    name: vcardName,
                    phone: vcardPhone,
                    email: vcardEmail,
                    organization: vcardOrg,
                });
                dados = { name: vcardName, phone: vcardPhone, email: vcardEmail, organization: vcardOrg };
                break;
            case 'landing_page':
                // This will be set from parent component
                content = url;
                dados = { landing_page_slug: url };
                break;
            default:
                content = url;
                dados = { url };
        }

        return { content, dados };
    };

    const handleGenerate = async () => {
        const { content, dados } = generateContent();

        if (!content) {
            toast({
                title: 'Erro',
                description: 'Preencha os campos necessários',
                variant: 'destructive',
            });
            return;
        }

        try {
            const dataUrl = await generateQRCodeDataURL(content, { size: 500 });
            const svg = await generateQRCodeSVG(content, { size: 500 });

            setQrContent(content);
            setQrDataUrl(dataUrl);
            setQrSvg(svg);

            if (onGenerate) {
                onGenerate(dataUrl, tipo, dados);
            }

            toast({
                title: 'QR Code gerado!',
                description: 'Seu QR Code foi gerado com sucesso.',
            });
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível gerar o QR Code.',
                variant: 'destructive',
            });
        }
    };

    const handleDownloadPNG = () => {
        if (qrDataUrl) {
            downloadQRCodePNG(qrDataUrl, 'qr-code');
            toast({
                title: 'Download iniciado',
                description: 'QR Code em PNG baixado.',
            });
        }
    };

    const handleDownloadSVG = () => {
        if (qrSvg) {
            downloadQRCodeSVG(qrSvg, 'qr-code');
            toast({
                title: 'Download iniciado',
                description: 'QR Code em SVG baixado.',
            });
        }
    };

    const handleCopyLink = () => {
        if (qrContent) {
            navigator.clipboard.writeText(qrContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
                title: 'Link copiado!',
                description: 'O link foi copiado para a área de transferência.',
            });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Tipo de QR Code</Label>
                    <Select value={tipo} onValueChange={setTipo}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="url">URL / Link</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="vcard">Cartão de Visita (vCard)</SelectItem>
                            <SelectItem value="landing_page">Landing Page</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {tipo === 'url' && (
                    <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                            placeholder="https://exemplo.com.br"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                )}

                {tipo === 'whatsapp' && (
                    <>
                        <div className="space-y-2">
                            <Label>Número do WhatsApp</Label>
                            <Input
                                placeholder="5511999999999"
                                value={whatsappPhone}
                                onChange={(e) => setWhatsappPhone(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Apenas números com código do país (ex: 5511999999999)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Mensagem Inicial (Opcional)</Label>
                            <Textarea
                                placeholder="Olá! Gostaria de mais informações..."
                                value={whatsappMessage}
                                onChange={(e) => setWhatsappMessage(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </>
                )}

                {tipo === 'vcard' && (
                    <>
                        <div className="space-y-2">
                            <Label>Nome Completo *</Label>
                            <Input
                                placeholder="João da Silva"
                                value={vcardName}
                                onChange={(e) => setVcardName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Telefone</Label>
                            <Input
                                placeholder="5511999999999"
                                value={vcardPhone}
                                onChange={(e) => setVcardPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                placeholder="joao@exemplo.com.br"
                                value={vcardEmail}
                                onChange={(e) => setVcardEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Organização</Label>
                            <Input
                                placeholder="Empresa XYZ"
                                value={vcardOrg}
                                onChange={(e) => setVcardOrg(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {tipo === 'landing_page' && (
                    <div className="space-y-2">
                        <Label>URL da Landing Page</Label>
                        <Input
                            placeholder="https://seusite.com/lp/seu-slug"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Cole o link completo da sua landing page
                        </p>
                    </div>
                )}

                <Button onClick={handleGenerate} className="w-full gap-2">
                    <QrCode className="w-4 h-4" />
                    Gerar QR Code
                </Button>
            </div>

            {/* Preview and Download */}
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {qrDataUrl ? (
                            <div className="space-y-4">
                                <div className="flex justify-center p-4 bg-white rounded-lg">
                                    <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                                </div>

                                <Tabs defaultValue="png" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="png">PNG</TabsTrigger>
                                        <TabsTrigger value="svg">SVG</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="png" className="space-y-2">
                                        <Button onClick={handleDownloadPNG} className="w-full gap-2">
                                            <Download className="w-4 h-4" />
                                            Download PNG
                                        </Button>
                                    </TabsContent>
                                    <TabsContent value="svg" className="space-y-2">
                                        <Button onClick={handleDownloadSVG} className="w-full gap-2">
                                            <Download className="w-4 h-4" />
                                            Download SVG
                                        </Button>
                                    </TabsContent>
                                </Tabs>

                                {qrContent && (
                                    <div className="space-y-2">
                                        <Label className="text-xs">Link Gerado</Label>
                                        <div className="flex gap-2">
                                            <Input value={qrContent} readOnly className="text-xs" />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={handleCopyLink}
                                            >
                                                {copied ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <QrCode className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    Preencha os campos e clique em "Gerar QR Code"
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default QRCodeGenerator;
