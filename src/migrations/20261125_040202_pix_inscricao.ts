import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "competicoes" ADD COLUMN "pix_chave" varchar;
  ALTER TABLE "competicoes" ADD COLUMN "pix_titular" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "competicoes" DROP COLUMN "pix_chave";
  ALTER TABLE "competicoes" DROP COLUMN "pix_titular";`)
}
