w2qimport React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus,
  Phone,
  Mail,
  Building2,
  Briefcase,
  CheckCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import FloxBeeLogo from '@/components/FloxBeeLogo';

const registerSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  whatsapp: z.string().min(10, 'WhatsApp inválido').max(15, 'WhatsApp inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  matricula: z.string().optional(),
  cargo: z.string().optional(),
  secretaria: z.string().optional(),
  data_nascimento: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const SECRETARIAS = [
  'Administração',
  'Educação',
  'Saúde',
  'Finanças',
  'Obras',
  'Meio Ambiente',
  'Cultura',
  'Esportes',
  'Assistência Social',
  'Segurança',
  'Transporte',
  'Planejamento',
  'Outra',
];

const formatPhoneNumber = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const cleanPhoneNumber = (value: string) => {
  let numbers = value.replace(/\D/g, '');
  if (!numbers.startsWith('55')) {
    numbers = '55' + numbers;
  }
  return numbers;
};

const PublicRegister: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nome: '',
      whatsapp: '',
      email: '',
      matricula: '',
      cargo: '',
      secretaria: '',
      data_nascimento: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const cleanedWhatsapp = cleanPhoneNumber(data.whatsapp);

      // Check if whatsapp already exists
      const { data: existing } = await supabase
        .from('contacts')
        .select('id')
        .eq('whatsapp', cleanedWhatsapp)
        .single();

      if (existing) {
        setError('Este número de WhatsApp já está cadastrado.');
        setIsSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('contacts')
        .insert({
          nome: data.nome,
          whatsapp: cleanedWhatsapp,
          email: data.email || null,
          matricula: data.matricula || null,
          cargo: data.cargo || null,
          secretaria: data.secretaria || null,
          data_nascimento: data.data_nascimento || null,
          ativo: true,
          tags: ['cadastro_publico'],
        });

      if (insertError) {
        throw insertError;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Erro ao realizar cadastro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-primary/20">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Cadastro Realizado!</h2>
            <p className="text-muted-foreground mb-6">
              Seus dados foram registrados com sucesso. Em breve você receberá uma mensagem de confirmação no seu WhatsApp.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIsSuccess(false);
                form.reset();
              }}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Fazer novo cadastro
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-primary/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <FloxBeeLogo size={48} />
          </div>
          <CardTitle className="text-2xl font-bold">Cadastro de Servidor</CardTitle>
          <CardDescription>
            Preencha seus dados para se cadastrar no sistema de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Nome Completo *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      WhatsApp *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="matricula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula</FormLabel>
                      <FormControl>
                        <Input placeholder="Nº matrícula" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="secretaria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Secretaria
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a secretaria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECRETARIAS.map((sec) => (
                          <SelectItem key={sec} value={sec}>
                            {sec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Cargo
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Seu cargo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {isSubmitting ? 'Cadastrando...' : 'Realizar Cadastro'}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Ao se cadastrar, você concorda em receber comunicações via WhatsApp
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicRegister;
