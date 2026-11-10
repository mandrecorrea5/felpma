import type { CollectionConfig } from 'payload'
import { authenticated, doPainel, isAdmin } from '../access'
import { auditarAcesso } from '../lib/lgpd/auditoria'

/**
 * Upload privado das inscrições.
 *
 * Atestado médico, comprovante de pagamento e documento do responsável são
 * dados pessoais (o atestado é dado de saúde): não podem viver em `media`, que
 * é público por padrão. Aqui o arquivo fica em `arquivos-inscricao/` no disco e
 * o acesso é restrito:
 *
 * - o painel lê (para conferir e baixar);
 * - o atleta baixa o PRÓPRIO arquivo pela rota `/area/inscricoes/:protocolo/arquivos/:id`,
 *   que confere a sessão do atleta antes de ler do disco;
 * - ninguém cria por REST: o upload acontece dentro da server action, depois da
 *   validação de tamanho, tipo e consentimentos.
 */
export const ArquivosInscricao: CollectionConfig = {
  slug: 'arquivos-inscricao',
  typescript: { interface: 'ArquivoInscricao' },
  labels: { singular: 'Arquivo de inscrição', plural: 'Arquivos de inscrição' },
  admin: {
    useAsTitle: 'titulo',
    group: 'Inscrições',
    defaultColumns: ['titulo', 'campo', 'atleta', 'createdAt'],
    description:
      'Arquivos privados enviados pelo atleta no formulário. Ficam fora do site público; o download é auditável pela sessão.',
  },
  access: {
    // O atleta não é usuário do painel e não autentica na API do Payload — o
    // download dele passa pela rota da área do atleta (que confere o dono).
    read: ({ req: { user } }) => doPainel(user),
    create: () => false,
    update: authenticated,
    delete: isAdmin,
  },
  // Quem baixa atestado de atleta fica registrado: `afterOperation` cobre a
  // listagem, a abertura do documento no painel e o download.
  hooks: { afterOperation: [auditarAcesso('arquivos-inscricao')] },
  upload: {
    staticDir: 'arquivos-inscricao',
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'titulo',
      label: 'Nome do arquivo',
      type: 'text',
      required: true,
      admin: { description: 'Nome original enviado pelo atleta, para ele reconhecer o documento.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'campo',
          label: 'Campo do formulário',
          type: 'text',
          required: true,
          index: true,
          admin: { width: '50%', description: 'Nome técnico do campo (ex.: atestado-medico).' },
        },
        {
          name: 'rotulo',
          label: 'Pergunta',
          type: 'text',
          admin: { width: '50%', description: 'Como a pergunta aparecia para o atleta.' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'atleta',
          label: 'Atleta',
          type: 'relationship',
          relationTo: 'atletas',
          required: true,
          index: true,
          admin: { width: '50%' },
        },
        {
          name: 'inscricao',
          label: 'Inscrição',
          type: 'relationship',
          relationTo: 'inscricoes',
          index: true,
          admin: { width: '50%', description: 'Preenchida após a inscrição ser gravada.' },
        },
      ],
    },
    {
      name: 'formulario',
      label: 'Formulário',
      type: 'relationship',
      relationTo: 'formularios-inscricao',
      index: true,
      admin: { description: 'Versão do formulário em que o arquivo foi enviado.' },
    },
  ],
}
