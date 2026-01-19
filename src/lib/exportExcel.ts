import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Contact } from '@/hooks/useContacts';
import type { Campaign } from '@/hooks/useCampaigns';

/**
 * Export contacts to Excel file
 * Compatible with database structure
 */
export const exportContactsToExcel = (contacts: Contact[]) => {
    // Map contacts to Excel-friendly format
    const data = contacts.map(contact => ({
        'ID': contact.id,
        'Nome': contact.nome,
        'WhatsApp': contact.whatsapp || '',
        'Email': contact.email || '',
        'Secretaria': contact.secretaria || '',
        'Matrícula': contact.matricula || '',
        'Tags': Array.isArray(contact.tags) ? contact.tags.join(', ') : '',
        'Ativo': contact.ativo ? 'Sim' : 'Não',
        'Data de Criação': contact.created_at ? format(new Date(contact.created_at), 'dd/MM/yyyy HH:mm') : '',
        'Última Atualização': contact.updated_at ? format(new Date(contact.updated_at), 'dd/MM/yyyy HH:mm') : '',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const columnWidths = [
        { wch: 10 },  // ID
        { wch: 30 },  // Nome
        { wch: 15 },  // WhatsApp
        { wch: 30 },  // Email
        { wch: 20 },  // Secretaria
        { wch: 15 },  // Matrícula
        { wch: 30 },  // Tags
        { wch: 8 },   // Ativo
        { wch: 18 },  // Data de Criação
        { wch: 18 },  // Última Atualização
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');

    // Add summary sheet
    const summary = [
        { Métrica: 'Total de Contatos', Valor: contacts.length },
        { Métrica: 'Contatos Ativos', Valor: contacts.filter(c => c.ativo).length },
        { Métrica: 'Contatos com WhatsApp', Valor: contacts.filter(c => c.whatsapp).length },
        { Métrica: 'Contatos com Email', Valor: contacts.filter(c => c.email).length },
        { Métrica: 'Data de Exportação', Valor: format(new Date(), 'dd/MM/yyyy HH:mm') },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Generate filename
    const fileName = `contatos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, fileName);

    return fileName;
};

/**
 * Export campaigns to Excel file
 * Compatible with database structure
 */
export const exportCampaignsToExcel = (campaigns: Campaign[]) => {
    // Map campaigns to Excel-friendly format
    const data = campaigns.map(campaign => ({
        'ID': campaign.id,
        'Nome': campaign.nome,
        'Status': campaign.status === 'agendada' ? 'Agendada' :
            campaign.status === 'enviando' ? 'Enviando' :
                campaign.status === 'concluida' ? 'Concluída' :
                    campaign.status === 'pausada' ? 'Pausada' : campaign.status,
        'Total Destinatários': campaign.total_destinatarios || 0,
        'Enviadas': campaign.enviados || 0,
        'Entregues': campaign.entregues || 0,
        'Lidas': campaign.lidos || 0,
        'Respondidas': campaign.respondidos || 0,
        'Falhas': campaign.falhas || 0,
        'Taxa de Entrega (%)': campaign.enviados && campaign.enviados > 0
            ? ((campaign.entregues || 0) / campaign.enviados * 100).toFixed(1)
            : '0.0',
        'Taxa de Leitura (%)': campaign.entregues && campaign.entregues > 0
            ? ((campaign.lidos || 0) / campaign.entregues * 100).toFixed(1)
            : '0.0',
        'Taxa de Resposta (%)': campaign.entregues && campaign.entregues > 0
            ? ((campaign.respondidos || 0) / campaign.entregues * 100).toFixed(1)
            : '0.0',
        'Data de Criação': campaign.created_at ? format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm') : '',
        'Agendada Para': campaign.agendado_para ? format(new Date(campaign.agendado_para), 'dd/MM/yyyy HH:mm') : '',
        'Iniciada Em': campaign.iniciado_em ? format(new Date(campaign.iniciado_em), 'dd/MM/yyyy HH:mm') : '',
        'Concluída Em': campaign.concluido_em ? format(new Date(campaign.concluido_em), 'dd/MM/yyyy HH:mm') : '',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const columnWidths = [
        { wch: 10 },  // ID
        { wch: 30 },  // Nome
        { wch: 12 },  // Status
        { wch: 18 },  // Total Destinatários
        { wch: 12 },  // Enviadas
        { wch: 12 },  // Entregues
        { wch: 10 },  // Lidas
        { wch: 14 },  // Respondidas
        { wch: 10 },  // Falhas
        { wch: 18 },  // Taxa de Entrega
        { wch: 18 },  // Taxa de Leitura
        { wch: 18 },  // Taxa de Resposta
        { wch: 18 },  // Data de Criação
        { wch: 18 },  // Agendada Para
        { wch: 18 },  // Iniciada Em
        { wch: 18 },  // Concluída Em
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Campanhas');

    // Add summary sheet
    const totalEnviados = campaigns.reduce((sum, c) => sum + (c.enviados || 0), 0);
    const totalEntregues = campaigns.reduce((sum, c) => sum + (c.entregues || 0), 0);
    const totalLidos = campaigns.reduce((sum, c) => sum + (c.lidos || 0), 0);
    const totalRespondidos = campaigns.reduce((sum, c) => sum + (c.respondidos || 0), 0);
    const totalFalhas = campaigns.reduce((sum, c) => sum + (c.falhas || 0), 0);

    const summary = [
        { Métrica: 'Total de Campanhas', Valor: campaigns.length },
        { Métrica: 'Campanhas Concluídas', Valor: campaigns.filter(c => c.status === 'concluida').length },
        { Métrica: 'Campanhas Agendadas', Valor: campaigns.filter(c => c.status === 'agendada').length },
        { Métrica: '', Valor: '' },
        { Métrica: 'Total de Mensagens Enviadas', Valor: totalEnviados },
        { Métrica: 'Total de Mensagens Entregues', Valor: totalEntregues },
        { Métrica: 'Total de Mensagens Lidas', Valor: totalLidos },
        { Métrica: 'Total de Mensagens Respondidas', Valor: totalRespondidos },
        { Métrica: 'Total de Falhas', Valor: totalFalhas },
        { Métrica: '', Valor: '' },
        { Métrica: 'Taxa Geral de Entrega (%)', Valor: totalEnviados > 0 ? ((totalEntregues / totalEnviados) * 100).toFixed(1) : '0.0' },
        { Métrica: 'Taxa Geral de Leitura (%)', Valor: totalEntregues > 0 ? ((totalLidos / totalEntregues) * 100).toFixed(1) : '0.0' },
        { Métrica: 'Taxa Geral de Resposta (%)', Valor: totalEntregues > 0 ? ((totalRespondidos / totalEntregues) * 100).toFixed(1) : '0.0' },
        { Métrica: '', Valor: '' },
        { Métrica: 'Data de Exportação', Valor: format(new Date(), 'dd/MM/yyyy HH:mm') },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summary);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

    // Generate filename
    const fileName = `campanhas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, fileName);

    return fileName;
};

/**
 * Export landing page submissions to Excel file
 */
export const exportLandingPageSubmissionsToExcel = (submissions: any[], landingPageTitle: string) => {
    // Map submissions to Excel-friendly format
    const data = submissions.map(submission => ({
        'Nome': submission.dados?.nome || '',
        'WhatsApp': submission.dados?.whatsapp || '',
        'Email': submission.dados?.email || '',
        'Origem': submission.origem || 'Direct',
        'User Agent': submission.user_agent || '',
        'Data': submission.created_at ? format(new Date(submission.created_at), 'dd/MM/yyyy HH:mm') : '',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const columnWidths = [
        { wch: 30 },  // Nome
        { wch: 18 },  // WhatsApp
        { wch: 30 },  // Email
        { wch: 15 },  // Origem
        { wch: 40 },  // User Agent
        { wch: 18 },  // Data
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissões');

    // Generate filename
    const slugTitle = landingPageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `landing_page_${slugTitle}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, fileName);

    return fileName;
};
