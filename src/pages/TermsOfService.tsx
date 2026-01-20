import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import FloxBeeLogo from '@/components/FloxBeeLogo';

const TermsOfService = () => {
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
                            <h1 className="text-3xl font-bold">Termos de Uso</h1>
                            <p className="text-muted-foreground">Última atualização: Janeiro de 2026</p>
                        </div>
                    </div>

                    <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
                        <section>
                            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
                            <p className="text-muted-foreground">
                                Ao acessar e usar o FloxBee, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
                                Se você não concordar com qualquer parte destes termos, não deverá usar nossos serviços.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
                            <p className="text-muted-foreground">
                                O FloxBee é uma plataforma de gestão de atendimento e comunicação que oferece:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Sistema de gestão de conversas e tickets</li>
                                <li>Integração com WhatsApp Business API</li>
                                <li>Assistente virtual com inteligência artificial</li>
                                <li>Automações de mensagens</li>
                                <li>Gestão de contatos e campanhas</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">3. Cadastro e Conta</h2>
                            <p className="text-muted-foreground mb-2">
                                Para utilizar o FloxBee, você deve:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Fornecer informações verdadeiras, precisas e completas</li>
                                <li>Manter suas credenciais de acesso seguras</li>
                                <li>Notificar imediatamente sobre qualquer uso não autorizado</li>
                                <li>Ser responsável por todas as atividades em sua conta</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">4. Uso Aceitável</h2>
                            <p className="text-muted-foreground mb-2">
                                Você concorda em NÃO:
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                                <li>Usar o serviço para fins ilegais ou não autorizados</li>
                                <li>Enviar spam ou mensagens não solicitadas</li>
                                <li>Violar direitos de propriedade intelectual</li>
                                <li>Tentar acessar sistemas ou dados não autorizados</li>
                                <li>Interferir no funcionamento do serviço</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">5. Propriedade Intelectual</h2>
                            <p className="text-muted-foreground">
                                Todo o conteúdo, recursos e funcionalidades do FloxBee são de propriedade exclusiva da empresa e estão protegidos
                                por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">6. Privacidade e Dados</h2>
                            <p className="text-muted-foreground">
                                O uso de seus dados pessoais é regido por nossa Política de Privacidade. Ao usar o FloxBee, você concorda
                                com a coleta e uso de informações conforme descrito na política.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">7. Limitação de Responsabilidade</h2>
                            <p className="text-muted-foreground">
                                O FloxBee é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto,
                                seguro ou livre de erros. Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais ou
                                consequenciais.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">8. Modificações</h2>
                            <p className="text-muted-foreground">
                                Reservamo-nos o direito de modificar estes termos a qualquer momento. Notificaremos sobre mudanças significativas
                                através da plataforma ou por email. O uso continuado após as alterações constitui aceitação dos novos termos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">9. Rescisão</h2>
                            <p className="text-muted-foreground">
                                Podemos suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, por violação destes termos ou
                                por qualquer outro motivo que considerarmos apropriado.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
                            <p className="text-muted-foreground">
                                Para questões sobre estes Termos de Uso, entre em contato através do suporte da plataforma.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
