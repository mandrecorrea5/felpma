import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_atletas_status" AS ENUM('ativo', 'bloqueado');
  CREATE TYPE "public"."enum_formularios_inscricao_consentimentos_finalidade" AS ENUM('inscricao', 'dados-sensiveis', 'menor', 'imagem', 'comunicacoes');
  CREATE TYPE "public"."enum_formularios_inscricao_lgpd_base_legal" AS ENUM('contrato', 'consentimento', 'obrigacao-legal', 'legitimo-interesse', 'exercicio-direitos', 'sensivel-consentimento');
  CREATE TYPE "public"."enum_formularios_inscricao_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__formularios_inscricao_v_version_consentimentos_finalidade" AS ENUM('inscricao', 'dados-sensiveis', 'menor', 'imagem', 'comunicacoes');
  CREATE TYPE "public"."enum__formularios_inscricao_v_version_lgpd_base_legal" AS ENUM('contrato', 'consentimento', 'obrigacao-legal', 'legitimo-interesse', 'exercicio-direitos', 'sensivel-consentimento');
  CREATE TYPE "public"."enum__formularios_inscricao_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_inscricoes_status" AS ENUM('recebida', 'em-analise', 'aprovada', 'lista-espera', 'rejeitada', 'cancelada');
  CREATE TABLE "atletas_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "atletas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cpf" varchar,
  	"cpf_hash" varchar,
  	"cpf_mascara" varchar,
  	"data_nascimento" timestamp(3) with time zone NOT NULL,
  	"telefone" varchar,
  	"uf" varchar DEFAULT 'MA',
  	"cidade" varchar,
  	"status" "enum_atletas_status" DEFAULT 'ativo',
  	"aceite_privacidade_versao" varchar,
  	"aceite_privacidade_aceito_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "formularios_inscricao_blocks_texto" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_texto_longo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_telefone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_numero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min" numeric,
  	"max" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_selecao_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"rotulo" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_selecao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_multipla_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"rotulo" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_multipla" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_aceite" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"texto" varchar,
  	"obrigatorio" boolean DEFAULT true,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_blocks_secao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"descricao" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "formularios_inscricao_consentimentos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"identificador" varchar,
  	"finalidade" "enum_formularios_inscricao_consentimentos_finalidade",
  	"obrigatorio" boolean DEFAULT true,
  	"texto" varchar
  );
  
  CREATE TABLE "formularios_inscricao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"descricao" jsonb,
  	"lgpd_finalidade" varchar,
  	"lgpd_base_legal" "enum_formularios_inscricao_lgpd_base_legal" DEFAULT 'contrato',
  	"lgpd_prazo_retencao_meses" numeric DEFAULT 12,
  	"lgpd_versao_aviso" varchar DEFAULT '2026-10',
  	"lgpd_justificativa_retencao" varchar,
  	"lgpd_aviso_privacidade" jsonb,
  	"mensagens_sucesso" varchar DEFAULT 'Inscrição recebida. Você receberá as próximas informações no e-mail da conta.',
  	"mensagens_fora_do_periodo" varchar,
  	"evento_id" integer,
  	"versao" numeric DEFAULT 1,
  	"limite_por_atleta" numeric DEFAULT 1,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_formularios_inscricao_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_texto" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_texto_longo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min_length" numeric,
  	"max_length" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_email" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_telefone" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_data" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_numero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"min" numeric,
  	"max" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"rotulo" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_selecao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"valor" varchar,
  	"rotulo" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_multipla" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"rotulo" varchar,
  	"ajuda" varchar,
  	"obrigatorio" boolean DEFAULT false,
  	"sensivel" boolean DEFAULT false,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_aceite" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar,
  	"texto" varchar,
  	"obrigatorio" boolean DEFAULT true,
  	"mostrar_se_campo" varchar,
  	"mostrar_se_valor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_blocks_secao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"descricao" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v_version_consentimentos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"identificador" varchar,
  	"finalidade" "enum__formularios_inscricao_v_version_consentimentos_finalidade",
  	"obrigatorio" boolean DEFAULT true,
  	"texto" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_formularios_inscricao_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_descricao" jsonb,
  	"version_lgpd_finalidade" varchar,
  	"version_lgpd_base_legal" "enum__formularios_inscricao_v_version_lgpd_base_legal" DEFAULT 'contrato',
  	"version_lgpd_prazo_retencao_meses" numeric DEFAULT 12,
  	"version_lgpd_versao_aviso" varchar DEFAULT '2026-10',
  	"version_lgpd_justificativa_retencao" varchar,
  	"version_lgpd_aviso_privacidade" jsonb,
  	"version_mensagens_sucesso" varchar DEFAULT 'Inscrição recebida. Você receberá as próximas informações no e-mail da conta.',
  	"version_mensagens_fora_do_periodo" varchar,
  	"version_evento_id" integer,
  	"version_versao" numeric DEFAULT 1,
  	"version_limite_por_atleta" numeric DEFAULT 1,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__formularios_inscricao_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "inscricoes_consentimentos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"identificador" varchar,
  	"versao" varchar,
  	"finalidade" varchar,
  	"obrigatorio" boolean,
  	"texto_hash" varchar,
  	"texto" varchar,
  	"aceito" boolean,
  	"aceito_em" timestamp(3) with time zone,
  	"ip_hash" varchar,
  	"revogado_em" timestamp(3) with time zone
  );
  
  CREATE TABLE "inscricoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"protocolo" varchar NOT NULL,
  	"status" "enum_inscricoes_status" DEFAULT 'recebida' NOT NULL,
  	"enviada_em" timestamp(3) with time zone NOT NULL,
  	"atleta_id" integer NOT NULL,
  	"evento_id" integer NOT NULL,
  	"formulario_id" integer NOT NULL,
  	"formulario_versao" numeric NOT NULL,
  	"idade_na_inscricao" numeric,
  	"respostas" jsonb NOT NULL,
  	"responsavel_nome" varchar,
  	"responsavel_parentesco" varchar,
  	"responsavel_telefone" varchar,
  	"responsavel_cpf" varchar,
  	"menor_de_idade" boolean,
  	"retencao_ate" timestamp(3) with time zone,
  	"motivo_rejeicao" varchar,
  	"observacoes_internas" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "competicoes" ADD COLUMN "inscricoes_de" timestamp(3) with time zone;
  ALTER TABLE "competicoes" ADD COLUMN "inscricoes_abertas" boolean DEFAULT false;
  ALTER TABLE "competicoes" ADD COLUMN "limite_vagas" numeric;
  ALTER TABLE "competicoes" ADD COLUMN "aviso_fora_do_periodo" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "atletas_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "formularios_inscricao_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inscricoes_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN "atletas_id" integer;
  ALTER TABLE "atletas_sessions" ADD CONSTRAINT "atletas_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."atletas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_texto" ADD CONSTRAINT "formularios_inscricao_blocks_texto_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_texto_longo" ADD CONSTRAINT "formularios_inscricao_blocks_texto_longo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_email" ADD CONSTRAINT "formularios_inscricao_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_telefone" ADD CONSTRAINT "formularios_inscricao_blocks_telefone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_data" ADD CONSTRAINT "formularios_inscricao_blocks_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_numero" ADD CONSTRAINT "formularios_inscricao_blocks_numero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_selecao_opcoes" ADD CONSTRAINT "formularios_inscricao_blocks_selecao_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao_blocks_selecao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_selecao" ADD CONSTRAINT "formularios_inscricao_blocks_selecao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_multipla_opcoes" ADD CONSTRAINT "formularios_inscricao_blocks_multipla_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao_blocks_multipla"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_multipla" ADD CONSTRAINT "formularios_inscricao_blocks_multipla_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_aceite" ADD CONSTRAINT "formularios_inscricao_blocks_aceite_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_blocks_secao" ADD CONSTRAINT "formularios_inscricao_blocks_secao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao_consentimentos" ADD CONSTRAINT "formularios_inscricao_consentimentos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "formularios_inscricao" ADD CONSTRAINT "formularios_inscricao_evento_id_competicoes_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_texto" ADD CONSTRAINT "_formularios_inscricao_v_blocks_texto_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_texto_longo" ADD CONSTRAINT "_formularios_inscricao_v_blocks_texto_longo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_email" ADD CONSTRAINT "_formularios_inscricao_v_blocks_email_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_telefone" ADD CONSTRAINT "_formularios_inscricao_v_blocks_telefone_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_data" ADD CONSTRAINT "_formularios_inscricao_v_blocks_data_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_numero" ADD CONSTRAINT "_formularios_inscricao_v_blocks_numero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" ADD CONSTRAINT "_formularios_inscricao_v_blocks_selecao_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v_blocks_selecao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao" ADD CONSTRAINT "_formularios_inscricao_v_blocks_selecao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" ADD CONSTRAINT "_formularios_inscricao_v_blocks_multipla_opcoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v_blocks_multipla"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla" ADD CONSTRAINT "_formularios_inscricao_v_blocks_multipla_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_aceite" ADD CONSTRAINT "_formularios_inscricao_v_blocks_aceite_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_blocks_secao" ADD CONSTRAINT "_formularios_inscricao_v_blocks_secao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v_version_consentimentos" ADD CONSTRAINT "_formularios_inscricao_v_version_consentimentos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_formularios_inscricao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v" ADD CONSTRAINT "_formularios_inscricao_v_parent_id_formularios_inscricao_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_formularios_inscricao_v" ADD CONSTRAINT "_formularios_inscricao_v_version_evento_id_competicoes_id_fk" FOREIGN KEY ("version_evento_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes_consentimentos" ADD CONSTRAINT "inscricoes_consentimentos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."inscricoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_atleta_id_atletas_id_fk" FOREIGN KEY ("atleta_id") REFERENCES "public"."atletas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_id_competicoes_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_formulario_id_formularios_inscricao_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "atletas_sessions_order_idx" ON "atletas_sessions" USING btree ("_order");
  CREATE INDEX "atletas_sessions_parent_id_idx" ON "atletas_sessions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "atletas_cpf_hash_idx" ON "atletas" USING btree ("cpf_hash");
  CREATE INDEX "atletas_updated_at_idx" ON "atletas" USING btree ("updated_at");
  CREATE INDEX "atletas_created_at_idx" ON "atletas" USING btree ("created_at");
  CREATE UNIQUE INDEX "atletas_email_idx" ON "atletas" USING btree ("email");
  CREATE INDEX "formularios_inscricao_blocks_texto_order_idx" ON "formularios_inscricao_blocks_texto" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_texto_parent_id_idx" ON "formularios_inscricao_blocks_texto" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_texto_path_idx" ON "formularios_inscricao_blocks_texto" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_texto_longo_order_idx" ON "formularios_inscricao_blocks_texto_longo" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_texto_longo_parent_id_idx" ON "formularios_inscricao_blocks_texto_longo" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_texto_longo_path_idx" ON "formularios_inscricao_blocks_texto_longo" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_email_order_idx" ON "formularios_inscricao_blocks_email" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_email_parent_id_idx" ON "formularios_inscricao_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_email_path_idx" ON "formularios_inscricao_blocks_email" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_telefone_order_idx" ON "formularios_inscricao_blocks_telefone" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_telefone_parent_id_idx" ON "formularios_inscricao_blocks_telefone" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_telefone_path_idx" ON "formularios_inscricao_blocks_telefone" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_data_order_idx" ON "formularios_inscricao_blocks_data" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_data_parent_id_idx" ON "formularios_inscricao_blocks_data" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_data_path_idx" ON "formularios_inscricao_blocks_data" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_numero_order_idx" ON "formularios_inscricao_blocks_numero" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_numero_parent_id_idx" ON "formularios_inscricao_blocks_numero" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_numero_path_idx" ON "formularios_inscricao_blocks_numero" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_selecao_opcoes_order_idx" ON "formularios_inscricao_blocks_selecao_opcoes" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_selecao_opcoes_parent_id_idx" ON "formularios_inscricao_blocks_selecao_opcoes" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_selecao_order_idx" ON "formularios_inscricao_blocks_selecao" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_selecao_parent_id_idx" ON "formularios_inscricao_blocks_selecao" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_selecao_path_idx" ON "formularios_inscricao_blocks_selecao" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_multipla_opcoes_order_idx" ON "formularios_inscricao_blocks_multipla_opcoes" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_multipla_opcoes_parent_id_idx" ON "formularios_inscricao_blocks_multipla_opcoes" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_multipla_order_idx" ON "formularios_inscricao_blocks_multipla" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_multipla_parent_id_idx" ON "formularios_inscricao_blocks_multipla" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_multipla_path_idx" ON "formularios_inscricao_blocks_multipla" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_aceite_order_idx" ON "formularios_inscricao_blocks_aceite" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_aceite_parent_id_idx" ON "formularios_inscricao_blocks_aceite" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_aceite_path_idx" ON "formularios_inscricao_blocks_aceite" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_blocks_secao_order_idx" ON "formularios_inscricao_blocks_secao" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_blocks_secao_parent_id_idx" ON "formularios_inscricao_blocks_secao" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_blocks_secao_path_idx" ON "formularios_inscricao_blocks_secao" USING btree ("_path");
  CREATE INDEX "formularios_inscricao_consentimentos_order_idx" ON "formularios_inscricao_consentimentos" USING btree ("_order");
  CREATE INDEX "formularios_inscricao_consentimentos_parent_id_idx" ON "formularios_inscricao_consentimentos" USING btree ("_parent_id");
  CREATE INDEX "formularios_inscricao_evento_idx" ON "formularios_inscricao" USING btree ("evento_id");
  CREATE INDEX "formularios_inscricao_updated_at_idx" ON "formularios_inscricao" USING btree ("updated_at");
  CREATE INDEX "formularios_inscricao_created_at_idx" ON "formularios_inscricao" USING btree ("created_at");
  CREATE INDEX "formularios_inscricao__status_idx" ON "formularios_inscricao" USING btree ("_status");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_order_idx" ON "_formularios_inscricao_v_blocks_texto" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_parent_id_idx" ON "_formularios_inscricao_v_blocks_texto" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_path_idx" ON "_formularios_inscricao_v_blocks_texto" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_longo_order_idx" ON "_formularios_inscricao_v_blocks_texto_longo" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_longo_parent_id_idx" ON "_formularios_inscricao_v_blocks_texto_longo" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_texto_longo_path_idx" ON "_formularios_inscricao_v_blocks_texto_longo" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_email_order_idx" ON "_formularios_inscricao_v_blocks_email" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_email_parent_id_idx" ON "_formularios_inscricao_v_blocks_email" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_email_path_idx" ON "_formularios_inscricao_v_blocks_email" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_telefone_order_idx" ON "_formularios_inscricao_v_blocks_telefone" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_telefone_parent_id_idx" ON "_formularios_inscricao_v_blocks_telefone" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_telefone_path_idx" ON "_formularios_inscricao_v_blocks_telefone" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_data_order_idx" ON "_formularios_inscricao_v_blocks_data" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_data_parent_id_idx" ON "_formularios_inscricao_v_blocks_data" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_data_path_idx" ON "_formularios_inscricao_v_blocks_data" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_numero_order_idx" ON "_formularios_inscricao_v_blocks_numero" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_numero_parent_id_idx" ON "_formularios_inscricao_v_blocks_numero" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_numero_path_idx" ON "_formularios_inscricao_v_blocks_numero" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_selecao_opcoes_order_idx" ON "_formularios_inscricao_v_blocks_selecao_opcoes" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_selecao_opcoes_parent_id_idx" ON "_formularios_inscricao_v_blocks_selecao_opcoes" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_selecao_order_idx" ON "_formularios_inscricao_v_blocks_selecao" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_selecao_parent_id_idx" ON "_formularios_inscricao_v_blocks_selecao" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_selecao_path_idx" ON "_formularios_inscricao_v_blocks_selecao" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_multipla_opcoes_order_idx" ON "_formularios_inscricao_v_blocks_multipla_opcoes" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_multipla_opcoes_parent_id_idx" ON "_formularios_inscricao_v_blocks_multipla_opcoes" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_multipla_order_idx" ON "_formularios_inscricao_v_blocks_multipla" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_multipla_parent_id_idx" ON "_formularios_inscricao_v_blocks_multipla" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_multipla_path_idx" ON "_formularios_inscricao_v_blocks_multipla" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_aceite_order_idx" ON "_formularios_inscricao_v_blocks_aceite" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_aceite_parent_id_idx" ON "_formularios_inscricao_v_blocks_aceite" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_aceite_path_idx" ON "_formularios_inscricao_v_blocks_aceite" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_blocks_secao_order_idx" ON "_formularios_inscricao_v_blocks_secao" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_blocks_secao_parent_id_idx" ON "_formularios_inscricao_v_blocks_secao" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_blocks_secao_path_idx" ON "_formularios_inscricao_v_blocks_secao" USING btree ("_path");
  CREATE INDEX "_formularios_inscricao_v_version_consentimentos_order_idx" ON "_formularios_inscricao_v_version_consentimentos" USING btree ("_order");
  CREATE INDEX "_formularios_inscricao_v_version_consentimentos_parent_id_idx" ON "_formularios_inscricao_v_version_consentimentos" USING btree ("_parent_id");
  CREATE INDEX "_formularios_inscricao_v_parent_idx" ON "_formularios_inscricao_v" USING btree ("parent_id");
  CREATE INDEX "_formularios_inscricao_v_version_version_evento_idx" ON "_formularios_inscricao_v" USING btree ("version_evento_id");
  CREATE INDEX "_formularios_inscricao_v_version_version_updated_at_idx" ON "_formularios_inscricao_v" USING btree ("version_updated_at");
  CREATE INDEX "_formularios_inscricao_v_version_version_created_at_idx" ON "_formularios_inscricao_v" USING btree ("version_created_at");
  CREATE INDEX "_formularios_inscricao_v_version_version__status_idx" ON "_formularios_inscricao_v" USING btree ("version__status");
  CREATE INDEX "_formularios_inscricao_v_created_at_idx" ON "_formularios_inscricao_v" USING btree ("created_at");
  CREATE INDEX "_formularios_inscricao_v_updated_at_idx" ON "_formularios_inscricao_v" USING btree ("updated_at");
  CREATE INDEX "_formularios_inscricao_v_latest_idx" ON "_formularios_inscricao_v" USING btree ("latest");
  CREATE INDEX "inscricoes_consentimentos_order_idx" ON "inscricoes_consentimentos" USING btree ("_order");
  CREATE INDEX "inscricoes_consentimentos_parent_id_idx" ON "inscricoes_consentimentos" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "inscricoes_protocolo_idx" ON "inscricoes" USING btree ("protocolo");
  CREATE INDEX "inscricoes_atleta_idx" ON "inscricoes" USING btree ("atleta_id");
  CREATE INDEX "inscricoes_evento_idx" ON "inscricoes" USING btree ("evento_id");
  CREATE INDEX "inscricoes_formulario_idx" ON "inscricoes" USING btree ("formulario_id");
  CREATE INDEX "inscricoes_updated_at_idx" ON "inscricoes" USING btree ("updated_at");
  CREATE INDEX "inscricoes_created_at_idx" ON "inscricoes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_atletas_fk" FOREIGN KEY ("atletas_id") REFERENCES "public"."atletas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_formularios_inscricao_fk" FOREIGN KEY ("formularios_inscricao_id") REFERENCES "public"."formularios_inscricao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inscricoes_fk" FOREIGN KEY ("inscricoes_id") REFERENCES "public"."inscricoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_atletas_fk" FOREIGN KEY ("atletas_id") REFERENCES "public"."atletas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_atletas_id_idx" ON "payload_locked_documents_rels" USING btree ("atletas_id");
  CREATE INDEX "payload_locked_documents_rels_formularios_inscricao_id_idx" ON "payload_locked_documents_rels" USING btree ("formularios_inscricao_id");
  CREATE INDEX "payload_locked_documents_rels_inscricoes_id_idx" ON "payload_locked_documents_rels" USING btree ("inscricoes_id");
  CREATE INDEX "payload_preferences_rels_atletas_id_idx" ON "payload_preferences_rels" USING btree ("atletas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "atletas_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "atletas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_texto" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_texto_longo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_telefone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_data" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_numero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_selecao_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_selecao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_multipla_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_multipla" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_aceite" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_blocks_secao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao_consentimentos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "formularios_inscricao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_texto" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_texto_longo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_email" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_telefone" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_data" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_numero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_aceite" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_blocks_secao" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v_version_consentimentos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_formularios_inscricao_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inscricoes_consentimentos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inscricoes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "atletas_sessions" CASCADE;
  DROP TABLE "atletas" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_texto" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_texto_longo" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_email" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_telefone" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_data" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_numero" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_selecao_opcoes" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_selecao" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_multipla_opcoes" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_multipla" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_aceite" CASCADE;
  DROP TABLE "formularios_inscricao_blocks_secao" CASCADE;
  DROP TABLE "formularios_inscricao_consentimentos" CASCADE;
  DROP TABLE "formularios_inscricao" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_texto" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_texto_longo" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_email" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_telefone" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_data" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_numero" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_selecao" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_multipla" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_aceite" CASCADE;
  DROP TABLE "_formularios_inscricao_v_blocks_secao" CASCADE;
  DROP TABLE "_formularios_inscricao_v_version_consentimentos" CASCADE;
  DROP TABLE "_formularios_inscricao_v" CASCADE;
  DROP TABLE "inscricoes_consentimentos" CASCADE;
  DROP TABLE "inscricoes" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_atletas_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_formularios_inscricao_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inscricoes_fk";
  
  ALTER TABLE "payload_preferences_rels" DROP CONSTRAINT "payload_preferences_rels_atletas_fk";
  
  DROP INDEX "payload_locked_documents_rels_atletas_id_idx";
  DROP INDEX "payload_locked_documents_rels_formularios_inscricao_id_idx";
  DROP INDEX "payload_locked_documents_rels_inscricoes_id_idx";
  DROP INDEX "payload_preferences_rels_atletas_id_idx";
  ALTER TABLE "competicoes" DROP COLUMN "inscricoes_de";
  ALTER TABLE "competicoes" DROP COLUMN "inscricoes_abertas";
  ALTER TABLE "competicoes" DROP COLUMN "limite_vagas";
  ALTER TABLE "competicoes" DROP COLUMN "aviso_fora_do_periodo";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "atletas_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "formularios_inscricao_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inscricoes_id";
  ALTER TABLE "payload_preferences_rels" DROP COLUMN "atletas_id";
  DROP TYPE "public"."enum_atletas_status";
  DROP TYPE "public"."enum_formularios_inscricao_consentimentos_finalidade";
  DROP TYPE "public"."enum_formularios_inscricao_lgpd_base_legal";
  DROP TYPE "public"."enum_formularios_inscricao_status";
  DROP TYPE "public"."enum__formularios_inscricao_v_version_consentimentos_finalidade";
  DROP TYPE "public"."enum__formularios_inscricao_v_version_lgpd_base_legal";
  DROP TYPE "public"."enum__formularios_inscricao_v_version_status";
  DROP TYPE "public"."enum_inscricoes_status";`)
}
