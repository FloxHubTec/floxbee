import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Calendar } from 'lucide-react';
import BirthdayDashboard from '@/components/automations/BirthdayDashboard';

const AutomationsPage: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-background p-4 md:p-6">
            <Tabs defaultValue="birthday" className="flex-1 flex flex-col">
                <TabsList className="w-full md:w-auto grid grid-cols-2 mb-4">
                    <TabsTrigger value="birthday" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        Aniversários
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        Regras
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="birthday" className="flex-1 mt-0">
                    <BirthdayDashboard />
                </TabsContent>

                <TabsContent value="rules" className="flex-1 mt-0">
                    <div className="text-center py-12 text-muted-foreground">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Configuração de regras será implementada em breve</p>
                        <p className="text-sm mt-2">
                            Use a página "Automações" no menu lateral para gerenciar regras
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AutomationsPage;
