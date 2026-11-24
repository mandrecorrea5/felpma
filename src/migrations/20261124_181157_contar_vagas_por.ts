import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_competicoes_contar_vagas_por" AS ENUM('inscricoes', 'atletas');
  ALTER TABLE "competicoes" ADD COLUMN "contar_vagas_por" "enum_competicoes_contar_vagas_por" DEFAULT 'inscricoes';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "competicoes" DROP COLUMN "contar_vagas_por";
  DROP TYPE "public"."enum_competicoes_contar_vagas_por";`)
}
