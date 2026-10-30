import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_atletas_status" ADD VALUE 'pendente' BEFORE 'ativo';
  ALTER TABLE "atletas" DROP COLUMN "_verified";
  ALTER TABLE "atletas" DROP COLUMN "_verificationtoken";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "atletas" ALTER COLUMN "status" SET DEFAULT 'ativo'::text;
  DROP TYPE "public"."enum_atletas_status";
  CREATE TYPE "public"."enum_atletas_status" AS ENUM('ativo', 'bloqueado');
  ALTER TABLE "atletas" ALTER COLUMN "status" SET DEFAULT 'ativo'::"public"."enum_atletas_status";
  ALTER TABLE "atletas" ALTER COLUMN "status" SET DATA TYPE "public"."enum_atletas_status" USING "status"::"public"."enum_atletas_status";
  ALTER TABLE "atletas" ADD COLUMN "_verified" boolean;
  ALTER TABLE "atletas" ADD COLUMN "_verificationtoken" varchar;`)
}
