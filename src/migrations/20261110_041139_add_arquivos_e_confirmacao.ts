import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_formularios_inscricao_blocks_arquivo_aceita" AS ENUM('pdf', 'pdf-imagem', 'imagem');
  CREATE TYPE "public"."enum__formularios_inscricao_v_blocks_arquivo_aceita" AS ENUM('pdf', 'pdf-imagem', 'imagem');
  CREATE TABLE "formularios_inscricao_blocks_arquivo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"aceita" "enum_formularios_inscricao_blocks_arquivo_aceita" DEFAULT 'pdf-imagem',
  	"obrigatorio" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_arquivo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"aceita" "enum__formularios_inscricao_v_blocks_arquivo_aceita" DEFAULT 'pdf-imagem',
  	"obrigatorio" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "arquivos_inscricao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"campo" varchar NOT NULL,
  	"rotulo" varchar,
  	"atleta_id" integer NOT NULL,
  	"inscricao_id" integer,
  	"formulario_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "formularios_inscricao" ADD COLUMN "confirmacao_titulo" varchar DEFAULT 'Confirme sua inscrição';
  ALTER TABLE "formularios_inscricao" ADD COLUMN "confirmacao_texto" varchar;
  ALTER TABLE "formularios_inscricao" ADD COLUMN "confirmacao_arquivo_id" integer;
  ALTER TABLE "_formularios_inscricao_v" ADD COLUMN "version_confirmacao_titulo" varchar DEFAULT 'Confirme sua inscrição';
  ALTER TABLE "_formularios_inscricao_v" ADD COLUMN "version_confirmacao_texto" varchar;
  ALTER TABLE "_formularios_inscricao_v" ADD COLUMN "version_confirmacao_arquivo_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "arquivos_inscricao_id" integer;
  ALTER TABLE "formularios_inscricao_blocks_arquivo" ADD CONSTRAINT "formularios_inscricao_blocks_arquivo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_arquivo" ADD CONSTRAINT "_formularios_inscricao_v_blocks_arquivo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "arquivos_inscricao" ADD CONSTRAINT "arquivos_inscricao_atleta_id_atletas_id_fk" FOREIGN KEY ("atleta_id") REFERENCES "public"."atletas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "arquivos_inscricao" ADD CONSTRAINT "arquivos_inscricao_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "arquivos_inscricao" ADD CONSTRAINT "arquivos_inscricao_formulario_id_formularios_inscricao_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "formularios_inscricao_blocks_arquivo_order_idx" ON "formularios_inscricao_blocks_arquivo" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_arquivo_parent_id_idx" ON "formularios_inscricao_blocks_arquivo" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_arquivo_path_idx" ON "formularios_inscricao_blocks_arquivo" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_arquivo_order_idx" ON "_formularios_inscricao_v_blocks_arquivo" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_arquivo_parent_id_idx" ON "_formularios_inscricao_v_blocks_arquivo" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_arquivo_path_idx" ON "_formularios_inscricao_v_blocks_arquivo" USING btree ("_path");
  CREATE INDEX "arquivos_inscricao_campo_idx" ON "arquivos_inscricao" USING btree ("campo");
  CREATE INDEX "arquivos_inscricao_atleta_idx" ON "arquivos_inscricao" USING btree ("atleta_id");
  CREATE INDEX "arquivos_inscricao_inscricao_idx" ON "arquivos_inscricao" USING btree ("inscricao_id");
  CREATE INDEX "arquivos_inscricao_formulario_idx" ON "arquivos_inscricao" USING btree ("formulario_id");
  CREATE INDEX "arquivos_inscricao_updated_at_idx" ON "arquivos_inscricao" USING btree ("updated_at");
  CREATE INDEX "arquivos_inscricao_created_at_idx" ON "arquivos_inscricao" USING btree ("created_at");
  CREATE UNIQUE INDEX "arquivos_inscricao_filename_idx" ON "arquivos_inscricao" USING btree ("filename");
  ALTER TABLE "formularios_inscricao" ADD CONSTRAINT "formularios_inscricao_confirmacao_arquivo_id_documentos_id_fk" FOREIGN KEY ("confirmacao_arquivo_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v" ADD CONSTRAINT "_formularios_inscricao_v_version_confirmacao_arquivo_id_documentos_id_fk" FOREIGN KEY ("version_confirmacao_arquivo_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_arquivos_inscricao_fk" FOREIGN KEY ("arquivos_inscricao_id") REFERENCES "public"."arquivos_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "formularios_inscricao_confirmacao_confirmacao_arquivo_idx" ON "formularios_inscricao" USING btree ("confirmacao_arquivo_id");
  CREATE INDEX "_formularios_inscricao_v_version_confirmacao_version_con_idx" ON "_formularios_inscricao_v" USING btree ("version_confirmacao_arquivo_id");
  CREATE INDEX "payload_locked_documents_rels_arquivos_inscricao_id_idx" ON "payload_locked_documents_rels" USING btree ("arquivos_inscricao_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "formularios_inscricao_blocks_arquivo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_arquivo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "arquivos_inscricao" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "formularios_inscricao_blocks_arquivo" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_arquivo" CASCADE;
  DROP TABLE "arquivos_inscricao" CASCADE;
  ALTER TABLE "formularios_inscricao" DROP CONSTRAINT "formularios_inscricao_confirmacao_arquivo_id_documentos_id_fk";
  
  ALTER TABLE "_formularios_inscricao_v" DROP CONSTRAINT "_formularios_inscricao_v_version_confirmacao_arquivo_id_documentos_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_arquivos_inscricao_fk";
  
  DROP INDEX "formularios_inscricao_confirmacao_confirmacao_arquivo_idx";
  DROP INDEX "_formularios_inscricao_v_version_confirmacao_version_con_idx";
  DROP INDEX "payload_locked_documents_rels_arquivos_inscricao_id_idx";
  ALTER TABLE "formularios_inscricao" DROP COLUMN "confirmacao_titulo";
  ALTER TABLE "formularios_inscricao" DROP COLUMN "confirmacao_texto";
  ALTER TABLE "formularios_inscricao" DROP COLUMN "confirmacao_arquivo_id";
  ALTER TABLE "_formularios_inscricao_v" DROP COLUMN "version_confirmacao_titulo";
  ALTER TABLE "_formularios_inscricao_v" DROP COLUMN "version_confirmacao_texto";
  ALTER TABLE "_formularios_inscricao_v" DROP COLUMN "version_confirmacao_arquivo_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "arquivos_inscricao_id";
  DROP TYPE "public"."enum_formularios_inscricao_blocks_arquivo_aceita";
  DROP TYPE "public"."enum__formularios_inscricao_v_blocks_arquivo_aceita";`)
}
