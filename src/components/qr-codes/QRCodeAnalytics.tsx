import React, { useState, useEffect } from 'react';
import { QrCode, Download, Smartphone, Laptop, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useQRCodeScans, useQRCodeAnalytics } from '@/hooks/useQRCodes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface QRCodeAnalyticsProps {
    qrCodeId: string;
    qrCodeTitle: string;
}

const QRCodeAnalytics: React.FC<QRCodeAnalyticsProps> = ({ qrCodeId, qrCodeTitle }) => {
    const { data: scans = [] } = useQRCodeScans(qrCodeId);
    const { data: analytics } = useQRCodeAnalytics(qrCodeId);

    // Prepare chart data
    const chartData = analytics?.scansByDate
        ? Object.entries(analytics.scansByDate)
            .map(([date, count]) => ({
                date,
                scans: count,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Scans</p>
                                <p className="text-3xl font-bold text-foreground">{analytics?.totalScans || 0}</p>
                            </div>
                            <QrCode className="w-8 h-8 text-primary opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Mobile</p>
                                <p className="text-3xl font-bold text-foreground">{analytics?.scansByDevice.mobile || 0}</p>
                            </div>
                            <Smartphone className="w-8 h-8 text-blue-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Desktop</p>
                                <p className="text-3xl font-bold text-foreground">{analytics?.scansByDevice.desktop || 0}</p>
                            </div>
                            <Laptop className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Scans por Data
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                                    stroke="#888888"
                                />
                                <YAxis stroke="#888888" />
                                <Tooltip
                                    labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '6px',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="scans"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    dot={{ fill: 'hsl(var(--primary))' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Recent Scans */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Scans Recentes</h3>
                    {scans.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhum scan registrado ainda
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {scans.slice(0, 10).map((scan) => (
                                <div
                                    key={scan.id}
                                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">
                                            {scan.contact?.nome || 'Visitante Anônimo'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(scan.scanned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {scan.user_agent?.toLowerCase().includes('mobile') ? (
                                            <Badge variant="outline" className="gap-1">
                                                <Smartphone className="w-3 h-3" />
                                                Mobile
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1">
                                                <Laptop className="w-3 h-3" />
                                                Desktop
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default QRCodeAnalytics;
