import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas" ADD COLUMN "aprovado_em" timestamp(3) with time zone;
  ALTER TABLE "atletas" ADD COLUMN "aprovado_por_id" integer;
  ALTER TABLE "atletas" ADD CONSTRAINT "atletas_aprovado_por_id_users_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "atletas_aprovado_por_idx" ON "atletas" USING btree ("aprovado_por_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas" DROP CONSTRAINT "atletas_aprovado_por_id_users_id_fk";
  
  DROP INDEX "atletas_aprovado_por_idx";
  ALTER TABLE "atletas" DROP COLUMN "aprovado_em";
  ALTER TABLE "atletas" DROP COLUMN "aprovado_por_id";`)
}
