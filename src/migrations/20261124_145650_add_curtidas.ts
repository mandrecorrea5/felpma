import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "curtidas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"noticia_id" integer NOT NULL,
  	"chave" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "noticias" ADD COLUMN "curtidas" numeric DEFAULT 0;
  ALTER TABLE "_noticias_v" ADD COLUMN "version_curtidas" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "curtidas_id" integer;
  ALTER TABLE "curtidas" ADD CONSTRAINT "curtidas_noticia_id_noticias_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "curtidas_noticia_idx" ON "curtidas" USING btree ("noticia_id");
  CREATE INDEX "curtidas_chave_idx" ON "curtidas" USING btree ("chave");
  CREATE INDEX "curtidas_updated_at_idx" ON "curtidas" USING btree ("updated_at");
  CREATE INDEX "curtidas_created_at_idx" ON "curtidas" USING btree ("created_at");
  CREATE UNIQUE INDEX "noticia_chave_idx" ON "curtidas" USING btree ("noticia_id","chave");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_curtidas_fk" FOREIGN KEY ("curtidas_id") REFERENCES "public"."curtidas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_curtidas_id_idx" ON "payload_locked_documents_rels" USING btree ("curtidas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "curtidas" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "curtidas" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_curtidas_fk";
  
  DROP INDEX "payload_locked_documents_rels_curtidas_id_idx";
  ALTER TABLE "noticias" DROP COLUMN "curtidas";
  ALTER TABLE "_noticias_v" DROP COLUMN "version_curtidas";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "curtidas_id";`)
}
