import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas" ALTER COLUMN "status" SET DEFAULT 'pendente';
  ALTER TABLE "atletas" ADD COLUMN "_verified" boolean;
  ALTER TABLE "atletas" ADD COLUMN "_verificationtoken" varchar;
  -- Contas que já existiam passaram pela aprovação manual: não podem ficar
  -- bloqueadas pelo novo login que exige e-mail confirmado.
  UPDATE "atletas" SET "_verified" = true WHERE "_verified" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas" ALTER COLUMN "status" SET DEFAULT 'ativo';
  ALTER TABLE "atletas" DROP COLUMN "_verified";
  ALTER TABLE "atletas" DROP COLUMN "_verificationtoken";`)
}
