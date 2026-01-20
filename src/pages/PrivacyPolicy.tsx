import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import FloxBeeLogo from '@/components/FloxBeeLogo';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="container max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <Link to="/auth">
                        <Button variant="ghost" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>

                <div className="bg-card rounded-lg shadow-lg p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <FloxBeeLogo size={48} />
                        <div>
                            <h1 className="text-3xl font-bold">Política de Privacidade</h1>
                            <p className="text-muted-foreground">Última atualização: Janeiro de 2026</p>
                        </div>
                    </div>

                    <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
                            <p className="text-muted-foreground">
                                Esta Política de Privacidade descreve como o FloxBee coleta, usa, armazena e protege suas informações pessoais.
                                Estamos comprometidos em proteger sua privacidade e garantir a segurança de seus dados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">2. Informações que Coletamos</h2>
                            <p className="text-muted-foreground mb-2">
                                Coletamos as seguintes informações:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li><strong>Informações de Cadastro:</strong> Nome, email, telefone, matrícula</li>
                                <li><strong>Informações de Uso:</strong> Logs de acesso, interações com o sistema</li>
                                <li><strong>Dados de Conversas:</strong> Mensagens trocadas através da plataforma</li>
                                <li><strong>Informações de Contatos:</strong> Dados dos contatos cadastrados no sistema</li>
                                <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">3. Como Usamos suas Informações</h2>
                            <p className="text-muted-foreground mb-2">
                                Utilizamos suas informações para:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Fornecer e manter nossos serviços</li>
                                <li>Processar e gerenciar seu cadastro</li>
                                <li>Enviar notificações importantes sobre o serviço</li>
                                <li>Melhorar a experiência do usuário</li>
                                <li>Detectar e prevenir fraudes ou abusos</li>
                                <li>Cumprir obrigações legais</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
                            <p className="text-muted-foreground mb-2">
                                Não vendemos suas informações pessoais. Podemos compartilhar dados apenas:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Com provedores de serviços terceirizados (ex: Supabase, OpenAI)</li>
                                <li>Quando exigido por lei ou ordem judicial</li>
                                <li>Para proteger nossos direitos legais</li>
                                <li>Com seu consentimento explícito</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">5. Armazenamento e Segurança</h2>
                            <p className="text-muted-foreground">
                                Seus dados são armazenados em servidores seguros fornecidos pela Supabase. Implementamos medidas de segurança
                                técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação
                                ou destruição.
                            </p>
                            <p className="text-muted-foreground mt-2">
                                Medidas de segurança incluem:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                                <li>Criptografia de dados em repouso</li>
                                <li>Autenticação segura com hash de senhas</li>
                                <li>Políticas de controle de acesso (RLS)</li>
                                <li>Monitoramento e logs de segurança</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">6. Seus Direitos</h2>
                            <p className="text-muted-foreground mb-2">
                                De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Acessar seus dados pessoais</li>
                                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                                <li>Solicitar a exclusão de seus dados</li>
                                <li>Revogar consentimento</li>
                                <li>Portabilidade de dados</li>
                                <li>Informação sobre compartilhamento de dados</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">7. Cookies e Tecnologias Similares</h2>
                            <p className="text-muted-foreground">
                                Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso do serviço e
                                personalizar conteúdo. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar
                                algumas funcionalidades.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">8. Retenção de Dados</h2>
                            <p className="text-muted-foreground">
                                Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta
                                política, a menos que um período de retenção mais longo seja exigido ou permitido por lei.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">9. Menores de Idade</h2>
                            <p className="text-muted-foreground">
                                Nossos serviços não são direcionados a menores de 18 anos. Não coletamos intencionalmente informações de
                                menores. Se tomarmos conhecimento de que coletamos dados de um menor, tomaremos medidas para excluí-los.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">10. Alterações nesta Política</h2>
                            <p className="text-muted-foreground">
                                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas
                                através da plataforma ou por email. A data da última atualização será sempre indicada no topo desta página.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
                            <p className="text-muted-foreground">
                                Para exercer seus direitos ou esclarecer dúvidas sobre esta Política de Privacidade, entre em contato através
                                do suporte da plataforma ou pelo email de privacidade disponível nas configurações.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
