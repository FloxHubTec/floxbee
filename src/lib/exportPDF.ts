import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TenantBranding } from '@/config/tenant';

export interface DashboardExportData {
    metrics: {
        totalContacts: number;
        conversationsToday: number;
        conversationsChange: number;
        messagesToday: number;
        openTickets: number;
        resolvedToday: number;
        resolvedChange: number;
    };
    campaignsSummary: {
        totalEnviados: number;
        totalEntregues: number;
        totalLidos: number;
        totalRespondidos: number;
        totalFalhas: number;
        deliveryRate: number;
        readRate: number;
        responseRate: number;
        concluidas: number;
    };
    ticketsByStatus: Array<{ name: string; value: number }>;
    activeAgents: Array<{ nome: string; activeChats: number }>;
    filters?: {
        startDate?: string;
        endDate?: string;
        agentName?: string;
    };
    branding?: TenantBranding;
}

// Helper para converter HSL do tenant para RGB (usado pelo jsPDF)
const hslToRgbArray = (hslStr: string): [number, number, number] => {
    // Exemplo: "162 100% 33%"
    const parts = hslStr.match(/\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return [59, 130, 246]; // Fallback blue

    let h = parseInt(parts[0]);
    let s = parseInt(parts[1]) / 100;
    let l = parseInt(parts[2]) / 100;

    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

    return [
        Math.round(255 * f(0)),
        Math.round(255 * f(8)),
        Math.round(255 * f(4))
    ];
};

// Helper para converter URL de imagem em Base64
const getImageBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Falha ao obter contexto do canvas'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem para o PDF'));
        img.src = url;
    });
};

export const exportDashboardToPDF = async (data: DashboardExportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 30;

    const primaryColor = data.branding?.colors?.primary
        ? hslToRgbArray(data.branding.colors.primary)
        : [59, 130, 246]; // Fallback blue

    const systemName = data.branding?.name || 'FloxBee';

    // Helpers
    const addHeader = async () => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);

        let textX = margin;

        // Tentar adicionar o logo se existir
        if (data.branding?.logoUrl) {
            try {
                const base64Logo = await getImageBase64(data.branding.logoUrl);
                // Adiciona o logo (ajustado para caber no header de 25px)
                doc.addImage(base64Logo, 'PNG', margin, 5, 15, 15);
                textX = margin + 20;
            } catch (error) {
                console.error('Erro ao adicionar logo ao PDF:', error);
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(`${systemName} - Relatório de Atendimento`, textX, 17);
        y = 40;
    };

    const addSectionTitle = async (title: string) => {
        if (y > pageHeight - 30) {
            doc.addPage();
            await addHeader();
        }
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(title.toUpperCase(), margin, y);
        y += 3;
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + 40, y);
        y += 8;
    };

    const getStatusText = (rate: number, type: 'delivery' | 'read' | 'response') => {
        if (type === 'delivery') return rate > 90 ? 'Excelente' : rate > 70 ? 'Bom' : 'Atenção';
        if (type === 'read') return rate > 50 ? 'Excelente' : rate > 30 ? 'Bom' : 'Baixo';
        return rate > 20 ? 'Excelente' : rate > 10 ? 'Bom' : 'Baixo';
    };

    const addDataRow = (label: string, value: string | number, subValue?: string, xOffset = 0) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin + xOffset, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(String(value), margin + xOffset + 60, y);

        if (subValue) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(subValue, margin + xOffset + 85, y);
        }
        y += 7;
    };

    const addKPICard = (title: string, value: string | number, change: number | null) => {
        doc.setDrawColor(230, 230, 230);
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(title, margin + 5, y + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(String(value), margin + 5, y + 16);

        if (change !== null) {
            doc.setFontSize(9);
            const isPos = change >= 0;
            doc.setTextColor(isPos ? 34 : 220, isPos ? 197 : 38, isPos ? 94 : 38);
            doc.text(`${isPos ? '+' : ''}${change}% vs ontem`, margin + contentWidth - 40, y + 12);
        }
        y += 25;
    };

    // Build Document
    await addHeader();

    // Intro Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const dateStr = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });
    doc.text(`Período de Análise: Hoje (${dateStr})`, margin, 32);
    doc.text(`Identificador: ${format(new Date(), 'yyyyMMdd-HHmm')}`, pageWidth - margin - 50, 32);

    // --- ANALYTICAL INSIGHTS ---
    await addSectionTitle('RESUMO ANALÍTICO');

    // Add Period Info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const startStr = data.filters?.startDate ? format(new Date(data.filters.startDate), 'dd/MM/yyyy') : dateStr;
    const endStr = data.filters?.endDate ? format(new Date(data.filters.endDate), 'dd/MM/yyyy') : dateStr;
    const agentStr = data.filters?.agentName ? ` | Atendente: ${data.filters.agentName}` : '';
    doc.text(`Período: ${startStr} - ${endStr}${agentStr}`, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Geral:', margin + 5, y);
    doc.setFont('helvetica', 'normal');

    const deliveryStatus = getStatusText(data.campaignsSummary.deliveryRate, 'delivery');
    const readStatus = getStatusText(data.campaignsSummary.readRate, 'read');

    const insightText = `O sistema ${systemName} apresenta uma eficiência de entrega de ${data.campaignsSummary.deliveryRate}% (${deliveryStatus}). ` +
        `A taxa de abertura está em ${data.campaignsSummary.readRate}% (${readStatus}). ` +
        `Até o momento, foram processadas ${data.metrics.conversationsToday} novas conversas hoje.`;

    const splitInsight = doc.splitTextToSize(insightText, contentWidth - 10);
    doc.text(splitInsight, margin + 5, y + 6);
    y += (splitInsight.length * 5) + 12;

    await addSectionTitle('DESEMPENHO OPERACIONAL');
    addKPICard('Aberturas Hoje', data.metrics.conversationsToday, data.metrics.conversationsChange);
    addKPICard('Resolvidos Hoje', data.metrics.resolvedToday, data.metrics.resolvedChange);

    y += 2;
    addDataRow('Volume de Mensagens:', data.metrics.messagesToday);
    addDataRow('Tickets Pendentes:', data.metrics.openTickets);
    addDataRow('Base de Contatos:', data.metrics.totalContacts);

    y += 10;
    await addSectionTitle('EFICIÊNCIA DE CAMPANHAS');

    // Campanha Table Style
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('MÉTRICA', margin + 5, y + 5);
    doc.text('VALOR', margin + 80, y + 5);
    doc.text('STATUS / TAXA', margin + 130, y + 5);
    y += 13;

    doc.setTextColor(50, 50, 50);
    const campRows = [
        ['Mensagens Enviadas', data.campaignsSummary.totalEnviados, '-'],
        ['Sucesso de Entrega', data.campaignsSummary.totalEntregues, `${data.campaignsSummary.deliveryRate}% (${deliveryStatus})`],
        ['Taxa de Leitura', data.campaignsSummary.totalLidos, `${data.campaignsSummary.readRate}% (${readStatus})`],
        ['Taxa de Resposta', data.campaignsSummary.totalRespondidos, `${data.campaignsSummary.responseRate}%`],
        ['Insucesso (Falhas)', data.campaignsSummary.totalFalhas, `${Math.round((data.campaignsSummary.totalFalhas / (data.campaignsSummary.totalEnviados || 1)) * 100)}%`]
    ];

    campRows.forEach(([label, val, perc]) => {
        doc.setFont('helvetica', 'normal');
        doc.text(String(label), margin + 5, y);
        doc.text(String(val), margin + 80, y);
        doc.setFont('helvetica', 'bold');
        doc.text(String(perc), margin + 130, y);
        y += 7;
    });

    y += 5;
    await addSectionTitle('FUNIL DE TICKETS');
    const ticketXStart = margin + 5;
    data.ticketsByStatus.forEach((t, i) => {
        const col = i % 2;
        if (col === 0 && i > 0) y += 8;
        doc.setFont('helvetica', 'normal');
        doc.text(`${t.name}:`, ticketXStart + (col * 80), y);
        doc.setFont('helvetica', 'bold');
        doc.text(String(t.value), ticketXStart + (col * 80) + 30, y);
    });
    y += 12;

    await addSectionTitle('EQUIPE E ATENDENTES');
    if (data.activeAgents.length > 0) {
        for (const agent of data.activeAgents) {
            if (y > pageHeight - 15) {
                doc.addPage();
                await addHeader();
            }
            addDataRow(agent.nome, agent.activeChats, 'chats ativos');
        }
    } else {
        doc.text('Nenhum registro de atividade de agentes recente.', margin + 5, y);
    }

    // Footer footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(`Relatório ${systemName} - Confidencial | Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const fileName = `Relatorio_${systemName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
    doc.save(fileName);
    return fileName;
};
