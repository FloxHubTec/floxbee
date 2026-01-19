import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

export const exportDashboardToPDF = (data: DashboardExportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header com logo e título
    doc.setFontSize(24);
    doc.setTextColor(59, 130, 246); // Primary blue
    doc.text('FloxBee', 20, yPosition);

    yPosition += 10;
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Relatório de Dashboard', 20, yPosition);

    yPosition += 5;
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
        20,
        yPosition
    );

    // Line separator
    yPosition += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // === KPIs Principais ===
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('📊 Métricas Principais', 20, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    const kpiData = [
        ['Atendimentos Hoje', data.metrics.conversationsToday, `${data.metrics.conversationsChange >= 0 ? '+' : ''}${data.metrics.conversationsChange}% vs ontem`],
        ['Mensagens Hoje', data.metrics.messagesToday, ''],
        ['Tickets Abertos', data.metrics.openTickets, ''],
        ['Resolvidos Hoje', data.metrics.resolvedToday, `${data.metrics.resolvedChange >= 0 ? '+' : ''}${data.metrics.resolvedChange}% vs ontem`],
    ];

    kpiData.forEach(([label, value, change]) => {
        doc.setTextColor(0, 0, 0);
        doc.text(`${label}:`, 25, yPosition);
        doc.setFont(undefined, 'bold');
        doc.text(String(value), 100, yPosition);
        doc.setFont(undefined, 'normal');
        if (change) {
            doc.setTextColor(128, 128, 128);
            doc.text(change, 115, yPosition);
        }
        yPosition += 6;
    });

    yPosition += 5;

    // === Resumo de Contatos ===
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('👥 Contatos', 20, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total de Contatos Cadastrados: ${data.metrics.totalContacts}`, 25, yPosition);
    yPosition += 10;

    // === Campanhas ===
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('📢 Campanhas', 20, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    const campaignMetrics = [
        ['Campanhas Concluídas', data.campaignsSummary.concluidas],
        ['Mensagens Enviadas', data.campaignsSummary.totalEnviados],
        ['Mensagens Entregues', data.campaignsSummary.totalEntregues],
        ['Mensagens Lidas', data.campaignsSummary.totalLidos],
        ['Mensagens Respondidas', data.campaignsSummary.totalRespondidos],
        ['Falhas', data.campaignsSummary.totalFalhas],
    ];

    campaignMetrics.forEach(([label, value]) => {
        doc.text(`${label}:`, 25, yPosition);
        doc.setFont(undefined, 'bold');
        doc.text(String(value), 100, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 6;
    });

    yPosition += 5;

    // Taxas
    doc.setTextColor(59, 130, 246);
    doc.text(`Taxa de Entrega: ${data.campaignsSummary.deliveryRate}%`, 25, yPosition);
    yPosition += 5;
    doc.text(`Taxa de Leitura: ${data.campaignsSummary.readRate}%`, 25, yPosition);
    yPosition += 5;
    doc.text(`Taxa de Resposta: ${data.campaignsSummary.responseRate}%`, 25, yPosition);
    yPosition += 10;

    // === Tickets por Status ===
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('🎫 Tickets por Status', 20, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    data.ticketsByStatus.forEach(ticket => {
        if (ticket.value > 0) {
            doc.text(`${ticket.name}:`, 25, yPosition);
            doc.setFont(undefined, 'bold');
            doc.text(String(ticket.value), 70, yPosition);
            doc.setFont(undefined, 'normal');
            yPosition += 6;
        }
    });

    yPosition += 5;

    // === Atendentes Ativos ===
    if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('👤 Atendentes', 20, yPosition);
    yPosition += 8;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    if (data.activeAgents.length > 0) {
        data.activeAgents.forEach(agent => {
            doc.text(`${agent.nome}:`, 25, yPosition);
            doc.text(`${agent.activeChats} chats ativos`, 100, yPosition);
            yPosition += 6;
        });
    } else {
        doc.setTextColor(128, 128, 128);
        doc.text('Nenhum atendente ativo no momento', 25, yPosition);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
        `FloxBee - Sistema de Atendimento | Página 1`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
    );

    // Save PDF
    const fileName = `dashboard_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
    doc.save(fileName);

    return fileName;
};
