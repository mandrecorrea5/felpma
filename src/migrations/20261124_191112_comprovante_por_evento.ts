import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "arquivos_inscricao" ADD COLUMN "evento_id" integer;
  ALTER TABLE "arquivos_inscricao" ADD CONSTRAINT "arquivos_inscricao_evento_id_competicoes_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "arquivos_inscricao_evento_idx" ON "arquivos_inscricao" USING btree ("evento_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "arquivos_inscricao" DROP CONSTRAINT "arquivos_inscricao_evento_id_competicoes_id_fk";
  
  DROP INDEX "arquivos_inscricao_evento_idx";
  ALTER TABLE "arquivos_inscricao" DROP COLUMN "evento_id";`)
}
