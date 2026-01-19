import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

export interface QRCodeOptions {
    size?: number;
    color?: {
        dark?: string;
        light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
}

/**
 * Generate QR code as Data URL (PNG)
 */
export const generateQRCodeDataURL = async (
    text: string,
    options?: QRCodeOptions
): Promise<string> => {
    try {
        const qrOptions = {
            width: options?.size || 400,
            color: {
                dark: options?.color?.dark || '#000000',
                light: options?.color?.light || '#FFFFFF',
            },
            errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
            margin: options?.margin || 2,
        };

        const dataUrl = await QRCode.toDataURL(text, qrOptions);
        return dataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
};

/**
 * Generate QR code as SVG string
 */
export const generateQRCodeSVG = async (
    text: string,
    options?: QRCodeOptions
): Promise<string> => {
    try {
        const qrOptions = {
            width: options?.size || 400,
            color: {
                dark: options?.color?.dark || '#000000',
                light: options?.color?.light || '#FFFFFF',
            },
            errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
            margin: options?.margin || 2,
        };

        const svg = await QRCode.toString(text, { ...qrOptions, type: 'svg' });
        return svg;
    } catch (error) {
        console.error('Error generating QR code SVG:', error);
        throw new Error('Failed to generate QR code SVG');
    }
};

/**
 * Upload QR code to Supabase Storage
 */
export const uploadQRCodeToStorage = async (
    dataUrl: string,
    fileName: string
): Promise<string> => {
    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Upload to Supabase Storage
        const filePath = `qr-codes/${fileName}.png`;
        const { data, error } = await supabase.storage
            .from('qr-codes')
            .upload(filePath, blob, {
                contentType: 'image/png',
                upsert: true,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('qr-codes')
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Error uploading QR code:', error);
        throw new Error('Failed to upload QR code');
    }
};

/**
 * Generate different types of QR code content
 */
export const generateQRContent = {
    url: (url: string): string => {
        return url;
    },

    whatsapp: (phoneNumber: string, message?: string): string => {
        const encodedMessage = message ? encodeURIComponent(message) : '';
        return `https://wa.me/${phoneNumber}${message ? `?text=${encodedMessage}` : ''}`;
    },

    email: (email: string, subject?: string, body?: string): string => {
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        if (body) params.set('body', body);
        const queryString = params.toString();
        return `mailto:${email}${queryString ? `?${queryString}` : ''}`;
    },

    vcard: (data: {
        name: string;
        phone?: string;
        email?: string;
        organization?: string;
        title?: string;
    }): string => {
        const vcard = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${data.name}`,
            data.phone ? `TEL:${data.phone}` : '',
            data.email ? `EMAIL:${data.email}` : '',
            data.organization ? `ORG:${data.organization}` : '',
            data.title ? `TITLE:${data.title}` : '',
            'END:VCARD',
        ]
            .filter(Boolean)
            .join('\n');
        return vcard;
    },

    wifi: (data: {
        ssid: string;
        password: string;
        encryption?: 'WPA' | 'WEP' | 'nopass';
    }): string => {
        const encryption = data.encryption || 'WPA';
        return `WIFI:T:${encryption};S:${data.ssid};P:${data.password};;`;
    },

    sms: (phoneNumber: string, message?: string): string => {
        return `sms:${phoneNumber}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
    },

    landingPage: (slug: string, baseUrl: string): string => {
        return `${baseUrl}/lp/${slug}`;
    },
};

/**
 * Download QR code as PNG
 */
export const downloadQRCodePNG = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Download QR code as SVG
 */
export const downloadQRCodeSVG = (svgString: string, fileName: string) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Get redirect URL for QR code scan tracking
 */
export const getQRCodeRedirectUrl = (qrCodeId: string, baseUrl: string): string => {
    return `${baseUrl}/qr/${qrCodeId}`;
};
