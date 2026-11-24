import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Texto de ajuda do comprovante de pagamento: sai o e-mail, entra a área do
 * atleta.
 *
 * Desde o envio de comprovante pela área do atleta (`/area/comprovantes`, e o
 * botão "Enviar comprovante" no detalhe da inscrição), o comprovante não vai
 * mais por e-mail. O texto de ajuda dos formulários que ainda mandavam enviar
 * para `lpomaranhao@gmail.com` é ajustado aqui — só os campos de comprovante
 * (rótulo/nome com "comprovante" + "pagamento"/"taxa"/"pix") cujo texto cita
 * algum e-mail, para não mexer em conteúdo autoral de outros campos.
 */

const TEXTO_ANTIGO =
  'Anexe o comprovante do Pix. Se ainda não pagou, envie depois para lpomaranhao@gmail.com — a inscrição só é confirmada após a conferência.'

const TEXTO_NOVO =
  'Anexe o comprovante do Pix. Se ainda não pagou, envie depois em Área do atleta › Comprovantes — a inscrição só é confirmada após a conferência.'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "formularios_inscricao_blocks_arquivo"
    SET "ajuda" = ${TEXTO_NOVO}
    WHERE "ajuda" LIKE '%@%'
      AND (
        COALESCE("rotulo", '') ILIKE '%comprovante%'
        OR COALESCE("nome", '') ILIKE '%comprovante%'
      )
      AND (
        COALESCE("rotulo", '') || ' ' || COALESCE("nome", '') ILIKE '%pagamento%'
        OR COALESCE("rotulo", '') || ' ' || COALESCE("nome", '') ILIKE '%taxa%'
        OR COALESCE("rotulo", '') || ' ' || COALESCE("nome", '') ILIKE '%pix%'
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "formularios_inscricao_blocks_arquivo"
    SET "ajuda" = ${TEXTO_ANTIGO}
    WHERE "ajuda" = ${TEXTO_NOVO};
  `)
}
