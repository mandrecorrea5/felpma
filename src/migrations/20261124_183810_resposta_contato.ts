import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mensagens" ADD COLUMN "resposta" varchar;
  ALTER TABLE "mensagens" ADD COLUMN "enviar_resposta" boolean DEFAULT false;
  ALTER TABLE "mensagens" ADD COLUMN "respondida_em" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "mensagens" DROP COLUMN "resposta";
  ALTER TABLE "mensagens" DROP COLUMN "enviar_resposta";
  ALTER TABLE "mensagens" DROP COLUMN "respondida_em";`)
}
