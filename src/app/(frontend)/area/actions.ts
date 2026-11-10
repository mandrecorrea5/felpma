'use server'

import { redirect } from 'next/navigation'
import type { Atleta } from '@/payload-types'
import { getPayloadClient } from '@/lib/payload'
import { atletaAtual, entrar, limparSessao, revogarTodasAsSessoes, sair } from '@/lib/atleta/sessao'
import { cpfValido, normalizarCpf } from '@/lib/cpf'
import { hashBusca } from '@/lib/crypto/campos'
import { emailDisponivel, enviarEmailAtivacao } from '@/lib/email'
import { caminhoInterno, destinoPosLogin } from '@/lib/atleta/caminho'
import { origemDaRequisicao } from '@/lib/inscricoes/consentimento'
import { limitar } from '@/lib/rate-limit'
import type { ErroDeCampo, EstadoFormulario } from '@/lib/atleta/tipos'


const texto = (form: FormData, chave: string): string => String(form.get(chave) ?? '').trim()

const emailValido = (valor: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)

const senhaForte = (valor: string): null | string => {
  if (valor.length < 10) return 'A senha precisa de pelo menos 10 caracteres.'
  if (!/[a-zA-Z]/.test(valor) || !/\d/.test(valor))
    return 'A senha precisa misturar letras e números.'
  return null
}

const dataParaISO = (ymd: string): string => `${ymd}T00:00:00-03:00`

const anosDesde = (iso: string, hoje = new Date()): number => {
  const nascimento = new Date(iso)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const mes = hoje.getMonth() - nascimento.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--
  return idade
}

// ---------------------------------------------------------------------------
// Cadastro
// ---------------------------------------------------------------------------
export async function criarConta(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  // Este formulário faz duas coisas caras: revela se e-mail/CPF já existem e
  // dispara e-mail de ativação para qualquer endereço. 10 cadastros por hora
  // por origem é folgado para gente e caro para script de enumeração.
  const origem = await origemDaRequisicao()
  if (origem.ipHash && !limitar(`cadastro:${origem.ipHash}`, 10, 60 * 60 * 1000)) {
    return { ok: false, erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.' }
  }

  const campos = {
    nome: texto(form, 'nome'),
    email: texto(form, 'email').toLowerCase(),
    senha: texto(form, 'senha'),
    cpf: normalizarCpf(texto(form, 'cpf')),
    nascimento: texto(form, 'nascimento'),
    telefone: texto(form, 'telefone'),
    cidade: texto(form, 'cidade'),
    uf: texto(form, 'uf') || 'MA',
  }

  // Erros por campo: a tela destaca cada um e mantém o que a pessoa digitou.
  const erros: ErroDeCampo[] = []
  if (campos.nome.length < 5 || !campos.nome.includes(' '))
    erros.push({ campo: 'nome', mensagem: 'Informe o nome completo.' })
  if (!emailValido(campos.email))
    erros.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' })
  const problemaSenha = senhaForte(campos.senha)
  if (problemaSenha) erros.push({ campo: 'senha', mensagem: problemaSenha })
  if (!cpfValido(campos.cpf))
    erros.push({ campo: 'cpf', mensagem: 'Informe um CPF válido (11 números).' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campos.nascimento)) {
    erros.push({ campo: 'nascimento', mensagem: 'Informe a data de nascimento.' })
  } else {
    const idade = anosDesde(dataParaISO(campos.nascimento))
    if (idade < 0 || idade > 100)
      erros.push({ campo: 'nascimento', mensagem: 'Confira a data de nascimento.' })
  }
  if (form.get('aceite') !== 'on')
    erros.push({ campo: 'aceite', mensagem: 'É necessário aceitar o aviso de privacidade.' })

  if (erros.length > 0) {
    return { ok: false, erro: 'Confira os campos destacados.', erros, campos }
  }

  // Em produção, cadastro sem e-mail configurado ficaria "pendente" para sempre.
  // Melhor bloquear antes de gravar do que criar uma conta órfã.
  if (!emailDisponivel()) {
    return {
      ok: false,
      erro: 'O envio de e-mails ainda não está configurado. Fale com a federação pelo canal de contato.',
      campos,
    }
  }

  const payload = await getPayloadClient()
  const cpfHash = hashBusca(campos.cpf)

  const existente = await payload.find({
    collection: 'atletas',
    where: { or: [{ email: { equals: campos.email } }, { cpfHash: { equals: cpfHash } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  if (existente.totalDocs > 0) {
    // Não diz QUAL dos dois bateu: dizer "e-mail já existe" transformava o
    // formulário num oráculo de CPF/e-mail. O teto por origem acima é o que
    // torna a sondagem cara; a mensagem só evita entregar de graça qual campo.
    return {
      ok: false,
      erro: 'Já existe um cadastro com estes dados. Se for seu, entre ou recupere a senha.',
      campos,
    }
  }

  let criada: Atleta & { _verificationToken?: null | string }
  try {
    criada = (await payload.create({
      collection: 'atletas',
      overrideAccess: true,
      // O e-mail de ativação é enviado logo abaixo, em try/catch próprio: uma
      // falha do Resend não pode derrubar a criação da conta (o Payload envia
      // a verificação depois de gravar, e o erro deixaria um cadastro órfão).
      disableVerificationEmail: true,
      showHiddenFields: true,
      data: {
        nome: campos.nome.slice(0, 120),
        email: campos.email.slice(0, 200),
        password: campos.senha,
        cpf: campos.cpf,
        dataNascimento: dataParaISO(campos.nascimento),
        telefone: campos.telefone.replace(/\D/g, '').slice(0, 11) || undefined,
        cidade: campos.cidade.slice(0, 120) || undefined,
        uf: campos.uf.slice(0, 2).toUpperCase(),
        status: 'pendente',
        aceitePrivacidade: {
          versao: '2026-10',
          aceitoEm: new Date().toISOString(),
        },
      },
    })) as Atleta & { _verificationToken?: null | string }
  } catch (e) {
    console.error('Falha ao criar conta de atleta', e)
    return {
      ok: false,
      erro: 'Não foi possível criar a conta agora. Tente novamente em instantes.',
      campos,
    }
  }

  const token = criada._verificationToken
  if (!token) {
    console.error('Conta de atleta criada sem token de ativação', criada.id)
    redirect('/area/entrar?criada=1&envio=falhou')
  }

  try {
    await enviarEmailAtivacao(payload, { email: campos.email, nome: campos.nome, token })
  } catch (e) {
    console.error('Falha ao enviar o e-mail de ativação', e)
    redirect('/area/entrar?criada=1&envio=falhou')
  }

  redirect('/area/entrar?criada=1')
}

// ---------------------------------------------------------------------------
// Entrar / sair
// ---------------------------------------------------------------------------
export async function entrarAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  // O Payload já trava a conta após 5 erros, mas esse contador é por conta. Sem
  // um teto por origem, credential stuffing troca de alvo a cada tentativa.
  const origem = await origemDaRequisicao()
  if (origem.ipHash && !limitar(`login:${origem.ipHash}`, 30, 10 * 60 * 1000)) {
    return { ok: false, erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.' }
  }

  const email = texto(form, 'email').toLowerCase()
  const senha = texto(form, 'senha')
  const retorno = caminhoInterno(texto(form, 'retorno'))

  if (!emailValido(email) || !senha) {
    const erros: ErroDeCampo[] = []
    if (!emailValido(email)) erros.push({ campo: 'email', mensagem: 'Informe um e-mail válido.' })
    if (!senha) erros.push({ campo: 'senha', mensagem: 'Informe sua senha.' })
    return { ok: false, erro: 'Confira os campos destacados.', erros, campos: { email } }
  }

  const resultado = await entrar(email, senha)
  if (!resultado.ok) return { ok: false, erro: resultado.erro, campos: { email } }

  redirect(destinoPosLogin(retorno))
}

export async function sairAction(): Promise<void> {
  await sair()
  redirect('/')
}

// ---------------------------------------------------------------------------
// Senha
// ---------------------------------------------------------------------------
export async function recuperarSenhaAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  // Dispara e-mail: sem teto, vira bombardeio de caixa alheia e queima de cota
  // do Resend.
  const origem = await origemDaRequisicao()
  if (origem.ipHash && !limitar(`senha:${origem.ipHash}`, 5, 15 * 60 * 1000)) {
    return { ok: false, erro: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos.' }
  }

  if (!emailDisponivel()) {
    return {
      ok: false,
      erro: 'A recuperação por e-mail ainda não está disponível. Fale com a federação pelo contato.',
    }
  }

  const email = texto(form, 'email').toLowerCase()
  if (!emailValido(email)) return { ok: false, erro: 'Informe um e-mail válido.' }

  try {
    const payload = await getPayloadClient()
    await payload.forgotPassword({ collection: 'atletas', data: { email } })
  } catch {
    // Resposta idêntica para não revelar se o e-mail existe.
  }

  return {
    ok: true,
    sucesso: 'Se houver uma conta com este e-mail, enviamos o link para redefinir a senha.',
  }
}

export async function redefinirSenhaAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const token = texto(form, 'token')
  const senha = texto(form, 'senha')
  const confirmacao = texto(form, 'confirmacao')

  if (!token) return { ok: false, erro: 'Link inválido ou expirado. Peça um novo.' }
  if (senha !== confirmacao) return { ok: false, erro: 'As senhas não conferem.' }
  const problema = senhaForte(senha)
  if (problema) return { ok: false, erro: problema }

  try {
    const payload = await getPayloadClient()
    const resultado = await payload.resetPassword({
      collection: 'atletas',
      overrideAccess: false,
      data: { password: senha, token },
    })

    const usuario = resultado.user as { id?: number | string } | undefined
    if (usuario?.id) await revogarTodasAsSessoes(usuario.id)
  } catch (e) {
    console.error('Falha ao redefinir senha', e)
    return { ok: false, erro: 'Link inválido ou expirado. Peça um novo.' }
  }

  redirect('/area/entrar?redefinida=1')
}

// ---------------------------------------------------------------------------
// Dados e LGPD
// ---------------------------------------------------------------------------
export async function atualizarDadosAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const atleta = await atletaAtual()
  if (!atleta) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const nome = texto(form, 'nome')
  if (nome.length < 5 || !nome.includes(' ')) return { ok: false, erro: 'Informe o nome completo.' }

  try {
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'atletas',
      id: atleta.id,
      overrideAccess: true,
      data: {
        nome: nome.slice(0, 120),
        telefone: texto(form, 'telefone').replace(/\D/g, '').slice(0, 11) || null,
        cidade: texto(form, 'cidade').slice(0, 120) || null,
        uf: (texto(form, 'uf') || 'MA').slice(0, 2).toUpperCase(),
      },
    })
    return { ok: true, sucesso: 'Dados atualizados.' }
  } catch (e) {
    console.error('Falha ao atualizar dados do atleta', e)
    return { ok: false, erro: 'Não foi possível salvar agora. Tente novamente.' }
  }
}

export async function revogarConsentimentoAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const atleta = await atletaAtual()
  if (!atleta) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const inscricaoId = texto(form, 'inscricao')
  const identificador = texto(form, 'identificador')
  if (!inscricaoId || !identificador) return { ok: false, erro: 'Consentimento não encontrado.' }

  try {
    const payload = await getPayloadClient()
    const inscricao = await payload.findByID({
      collection: 'inscricoes',
      id: inscricaoId,
      depth: 0,
      overrideAccess: true,
    })

    const dono = typeof inscricao?.atleta === 'object' ? inscricao.atleta?.id : inscricao?.atleta
    if (String(dono) !== String(atleta.id)) return { ok: false, erro: 'Consentimento não encontrado.' }

    const consentimentos = (inscricao.consentimentos ?? []).map((c) =>
      c.identificador === identificador
        ? { ...c, aceito: false, revogadoEm: new Date().toISOString() }
        : c,
    )

    await payload.update({
      collection: 'inscricoes',
      id: inscricaoId,
      overrideAccess: true,
      data: { consentimentos },
    })

    return { ok: true, sucesso: 'Consentimento revogado.' }
  } catch (e) {
    console.error('Falha ao revogar consentimento', e)
    return { ok: false, erro: 'Não foi possível revogar agora. Tente novamente.' }
  }
}

export async function excluirContaAction(_prev: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const atleta = await atletaAtual()
  if (!atleta) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  if (texto(form, 'confirmacao').toUpperCase() !== 'EXCLUIR') {
    return { ok: false, erro: 'Digite EXCLUIR para confirmar.' }
  }

  try {
    const payload = await getPayloadClient()
    // Documento privado da inscrição é dado de saúde (atestado): sai do disco
    // junto com a conta. Vem antes das inscrições porque é ele que aponta para
    // elas — e porque apagar a inscrição sem o arquivo deixaria o titular sem
    // o direito de eliminação (LGPD art. 18, VI).
    await payload.delete({
      collection: 'arquivos-inscricao',
      where: { atleta: { equals: atleta.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'inscricoes',
      where: { atleta: { equals: atleta.id } },
      overrideAccess: true,
    })
    await payload.delete({ collection: 'atletas', id: atleta.id, overrideAccess: true })
  } catch (e) {
    console.error('Falha ao excluir conta', e)
    return { ok: false, erro: 'Não foi possível excluir agora. Tente novamente.' }
  }

  await limparSessao()
  redirect('/?conta-excluida=1')
}
