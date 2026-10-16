import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_noticias_categoria" AS ENUM('competicoes', 'selecao', 'filiacao', 'arbitragem', 'base', 'institucional');
  CREATE TYPE "public"."enum_noticias_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__noticias_v_version_categoria" AS ENUM('competicoes', 'selecao', 'filiacao', 'arbitragem', 'base', 'institucional');
  CREATE TYPE "public"."enum__noticias_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_paginas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__paginas_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_mensagens_assunto" AS ENUM('filiacao', 'competicoes', 'imprensa', 'parcerias', 'outros');
  CREATE TYPE "public"."enum_mensagens_status" AS ENUM('nova', 'respondida', 'arquivada');
  CREATE TYPE "public"."enum_competicoes_tipo" AS ENUM('estadual', 'regional', 'nacional', 'internacional', 'curso', 'evento');
  CREATE TYPE "public"."enum_competicoes_status" AS ENUM('auto', 'inscricoes-abertas', 'convocacao-publicada', 'em-breve', 'em-andamento', 'encerrado', 'adiado', 'cancelado');
  CREATE TYPE "public"."enum_convocacoes_tipo" AS ENUM('atletas', 'tecnicos', 'arbitros');
  CREATE TYPE "public"."enum_resultados_linhas_sexo" AS ENUM('F', 'M');
  CREATE TYPE "public"."enum_resultados_linhas_categoria_idade" AS ENUM('sub13', 'sub15', 'sub17', 'sub20', 'sub23', 'senior', 'master');
  CREATE TYPE "public"."enum_recordes_categoria_idade" AS ENUM('sub13', 'sub15', 'sub17', 'sub20', 'sub23', 'senior', 'master');
  CREATE TYPE "public"."enum_recordes_sexo" AS ENUM('F', 'M');
  CREATE TYPE "public"."enum_recordes_movimento" AS ENUM('arranco', 'arremesso', 'total');
  CREATE TYPE "public"."enum_centros_tags" AS ENUM('iniciacao', 'base', 'alto-rendimento', 'paradesporto', 'projeto-social', 'master');
  CREATE TYPE "public"."enum_diretoria_grupo" AS ENUM('diretoria', 'conselho-fiscal', 'arbitragem', 'tecnica', 'atletas');
  CREATE TYPE "public"."enum_documentos_categoria" AS ENUM('estatuto', 'regulamento', 'formulario', 'ata', 'edital', 'prestacao-contas', 'convenio', 'calendario', 'outros');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  CREATE TABLE "noticias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"resumo" varchar,
  	"capa_id" integer,
  	"conteudo" jsonb,
  	"categoria" "enum_noticias_categoria",
  	"data_publicacao" timestamp(3) with time zone,
  	"destaque" boolean DEFAULT false,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_noticias_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_noticias_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_resumo" varchar,
  	"version_capa_id" integer,
  	"version_conteudo" jsonb,
  	"version_categoria" "enum__noticias_v_version_categoria",
  	"version_data_publicacao" timestamp(3) with time zone,
  	"version_destaque" boolean DEFAULT false,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__noticias_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "paginas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"resumo" varchar,
  	"conteudo" jsonb,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_paginas_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_paginas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_resumo" varchar,
  	"version_conteudo" jsonb,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__paginas_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "mensagens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"telefone" varchar,
  	"assunto" "enum_mensagens_assunto" NOT NULL,
  	"mensagem" varchar NOT NULL,
  	"status" "enum_mensagens_status" DEFAULT 'nova',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "competicoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"tipo" "enum_competicoes_tipo" NOT NULL,
  	"area" varchar,
  	"categorias" varchar,
  	"data_inicio" timestamp(3) with time zone NOT NULL,
  	"data_fim" timestamp(3) with time zone,
  	"inscricoes_ate" timestamp(3) with time zone,
  	"local" varchar,
  	"cidade" varchar NOT NULL,
  	"uf" varchar DEFAULT 'MA',
  	"pesagem" varchar,
  	"imagem_id" integer,
  	"descricao" jsonb,
  	"regulamento_id" integer,
  	"link_inscricao" varchar,
  	"status" "enum_competicoes_status" DEFAULT 'auto',
  	"destaque_home" boolean DEFAULT false,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "convocacoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"tipo" "enum_convocacoes_tipo" NOT NULL,
  	"data_publicacao" timestamp(3) with time zone NOT NULL,
  	"detalhe" varchar,
  	"competicao_id" integer,
  	"documento_id" integer NOT NULL,
  	"prazo_confirmacao" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "resultados_linhas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sexo" "enum_resultados_linhas_sexo" NOT NULL,
  	"categoria_idade" "enum_resultados_linhas_categoria_idade" NOT NULL,
  	"categoria_peso" varchar NOT NULL,
  	"colocacao" numeric,
  	"peso_corporal" numeric,
  	"atleta" varchar NOT NULL,
  	"clube" varchar,
  	"arranco" numeric,
  	"arremesso" numeric,
  	"total" numeric
  );
  
  CREATE TABLE "resultados" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"competicao_id" integer,
  	"data" timestamp(3) with time zone NOT NULL,
  	"cidade" varchar,
  	"sumula_id" integer,
  	"observacoes" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recordes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"rotulo" varchar,
  	"categoria_idade" "enum_recordes_categoria_idade" NOT NULL,
  	"sexo" "enum_recordes_sexo" NOT NULL,
  	"categoria_peso" varchar NOT NULL,
  	"movimento" "enum_recordes_movimento" NOT NULL,
  	"marca" numeric NOT NULL,
  	"atleta" varchar NOT NULL,
  	"clube" varchar,
  	"data" timestamp(3) with time zone NOT NULL,
  	"competicao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "centros_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_centros_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "centros" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cidade" varchar NOT NULL,
  	"bairro" varchar,
  	"cep" varchar,
  	"endereco" varchar NOT NULL,
  	"latitude" numeric,
  	"longitude" numeric,
  	"tecnico_responsavel" varchar,
  	"cref" varchar,
  	"horarios" varchar,
  	"telefone" varchar,
  	"whatsapp" varchar,
  	"instagram" varchar,
  	"capa_id" integer,
  	"descricao" jsonb,
  	"ativo" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "centros_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "diretoria" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cargo" varchar NOT NULL,
  	"grupo" "enum_diretoria_grupo" DEFAULT 'diretoria' NOT NULL,
  	"foto_id" integer,
  	"mandato" varchar,
  	"email" varchar,
  	"ordem" numeric DEFAULT 10,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "documentos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"categoria" "enum_documentos_categoria" NOT NULL,
  	"ano" numeric,
  	"data_publicacao" timestamp(3) with time zone,
  	"descricao" varchar,
  	"publico" boolean DEFAULT true,
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
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"credito" varchar,
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
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"noticias_id" integer,
  	"paginas_id" integer,
  	"mensagens_id" integer,
  	"competicoes_id" integer,
  	"convocacoes_id" integer,
  	"resultados_id" integer,
  	"recordes_id" integer,
  	"centros_id" integer,
  	"diretoria_id" integer,
  	"documentos_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"destaque_id" integer,
  	"texto_destaque" varchar,
  	"foto_destaque_id" integer,
  	"chamada_filiacao_titulo" varchar DEFAULT 'Faça parte do levantamento de pesos maranhense',
  	"chamada_filiacao_texto" varchar DEFAULT 'Escolha seu perfil, veja os documentos necessários e comece sua filiação.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "filiacao_perfis_documentos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "filiacao_perfis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"anuidade" numeric,
  	"link_inscricao" varchar,
  	"descricao" varchar,
  	"formulario_id" integer
  );
  
  CREATE TABLE "filiacao_passos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar
  );
  
  CREATE TABLE "filiacao_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"pergunta" varchar NOT NULL,
  	"resposta" varchar NOT NULL
  );
  
  CREATE TABLE "filiacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"introducao" varchar DEFAULT 'Escolha seu perfil e veja os documentos necessários. Filiados podem competir em eventos oficiais e ser convocados para a seleção maranhense.',
  	"link_renovacao" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "federacao_numeros" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL,
  	"rotulo" varchar NOT NULL
  );
  
  CREATE TABLE "federacao_filiacoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "federacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"apresentacao" varchar DEFAULT 'A FELPMA organiza, fomenta e representa o levantamento de pesos olímpico no Maranhão.',
  	"historia" jsonb,
  	"foto_id" integer,
  	"missao" varchar,
  	"visao" varchar,
  	"valores" varchar,
  	"transparencia_intro" varchar DEFAULT 'Prestações de contas, atas, convênios e documentos institucionais, publicados em cumprimento à legislação esportiva.',
  	"transparencia_texto" jsonb,
  	"email_ouvidoria" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "configuracoes_apoiadores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"logo_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "configuracoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sigla" varchar DEFAULT 'FELPMA' NOT NULL,
  	"nome_completo" varchar DEFAULT 'Federação de Levantamento de Pesos do Maranhão' NOT NULL,
  	"logo_id" integer,
  	"cnpj" varchar,
  	"descricao_site" varchar DEFAULT 'Site oficial da Federação de Levantamento de Pesos do Maranhão: calendário, convocações, resultados, centros de treinamento e filiação.',
  	"endereco" varchar,
  	"cidade" varchar DEFAULT 'São Luís',
  	"cep" varchar,
  	"email" varchar,
  	"telefone" varchar,
  	"whatsapp" varchar,
  	"horario_atendimento" varchar,
  	"instagram" varchar,
  	"youtube" varchar,
  	"facebook" varchar,
  	"link_area_filiado" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_capa_id_media_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_parent_id_noticias_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_capa_id_media_id_fk" FOREIGN KEY ("version_capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v" ADD CONSTRAINT "_paginas_v_parent_id_paginas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."paginas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "competicoes" ADD CONSTRAINT "competicoes_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "competicoes" ADD CONSTRAINT "competicoes_regulamento_id_documentos_id_fk" FOREIGN KEY ("regulamento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "convocacoes" ADD CONSTRAINT "convocacoes_competicao_id_competicoes_id_fk" FOREIGN KEY ("competicao_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "convocacoes" ADD CONSTRAINT "convocacoes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "resultados_linhas" ADD CONSTRAINT "resultados_linhas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."resultados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "resultados" ADD CONSTRAINT "resultados_competicao_id_competicoes_id_fk" FOREIGN KEY ("competicao_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "resultados" ADD CONSTRAINT "resultados_sumula_id_documentos_id_fk" FOREIGN KEY ("sumula_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "centros_tags" ADD CONSTRAINT "centros_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."centros"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "centros" ADD CONSTRAINT "centros_capa_id_media_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "centros_rels" ADD CONSTRAINT "centros_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."centros"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "centros_rels" ADD CONSTRAINT "centros_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "diretoria" ADD CONSTRAINT "diretoria_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_mensagens_fk" FOREIGN KEY ("mensagens_id") REFERENCES "public"."mensagens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_competicoes_fk" FOREIGN KEY ("competicoes_id") REFERENCES "public"."competicoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_convocacoes_fk" FOREIGN KEY ("convocacoes_id") REFERENCES "public"."convocacoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_resultados_fk" FOREIGN KEY ("resultados_id") REFERENCES "public"."resultados"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recordes_fk" FOREIGN KEY ("recordes_id") REFERENCES "public"."recordes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_centros_fk" FOREIGN KEY ("centros_id") REFERENCES "public"."centros"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_diretoria_fk" FOREIGN KEY ("diretoria_id") REFERENCES "public"."diretoria"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_destaque_id_competicoes_id_fk" FOREIGN KEY ("destaque_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_foto_destaque_id_media_id_fk" FOREIGN KEY ("foto_destaque_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "filiacao_perfis_documentos" ADD CONSTRAINT "filiacao_perfis_documentos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."filiacao_perfis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "filiacao_perfis" ADD CONSTRAINT "filiacao_perfis_formulario_id_documentos_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "filiacao_perfis" ADD CONSTRAINT "filiacao_perfis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."filiacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "filiacao_passos" ADD CONSTRAINT "filiacao_passos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."filiacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "filiacao_faq" ADD CONSTRAINT "filiacao_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."filiacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "federacao_numeros" ADD CONSTRAINT "federacao_numeros_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."federacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "federacao_filiacoes" ADD CONSTRAINT "federacao_filiacoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."federacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "federacao" ADD CONSTRAINT "federacao_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes_apoiadores" ADD CONSTRAINT "configuracoes_apoiadores_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes_apoiadores" ADD CONSTRAINT "configuracoes_apoiadores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."configuracoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "noticias_capa_idx" ON "noticias" USING btree ("capa_id");
  CREATE UNIQUE INDEX "noticias_slug_idx" ON "noticias" USING btree ("slug");
  CREATE INDEX "noticias_updated_at_idx" ON "noticias" USING btree ("updated_at");
  CREATE INDEX "noticias_created_at_idx" ON "noticias" USING btree ("created_at");
  CREATE INDEX "noticias__status_idx" ON "noticias" USING btree ("_status");
  CREATE INDEX "_noticias_v_parent_idx" ON "_noticias_v" USING btree ("parent_id");
  CREATE INDEX "_noticias_v_version_version_capa_idx" ON "_noticias_v" USING btree ("version_capa_id");
  CREATE INDEX "_noticias_v_version_version_slug_idx" ON "_noticias_v" USING btree ("version_slug");
  CREATE INDEX "_noticias_v_version_version_updated_at_idx" ON "_noticias_v" USING btree ("version_updated_at");
  CREATE INDEX "_noticias_v_version_version_created_at_idx" ON "_noticias_v" USING btree ("version_created_at");
  CREATE INDEX "_noticias_v_version_version__status_idx" ON "_noticias_v" USING btree ("version__status");
  CREATE INDEX "_noticias_v_created_at_idx" ON "_noticias_v" USING btree ("created_at");
  CREATE INDEX "_noticias_v_updated_at_idx" ON "_noticias_v" USING btree ("updated_at");
  CREATE INDEX "_noticias_v_latest_idx" ON "_noticias_v" USING btree ("latest");
  CREATE UNIQUE INDEX "paginas_slug_idx" ON "paginas" USING btree ("slug");
  CREATE INDEX "paginas_updated_at_idx" ON "paginas" USING btree ("updated_at");
  CREATE INDEX "paginas_created_at_idx" ON "paginas" USING btree ("created_at");
  CREATE INDEX "paginas__status_idx" ON "paginas" USING btree ("_status");
  CREATE INDEX "_paginas_v_parent_idx" ON "_paginas_v" USING btree ("parent_id");
  CREATE INDEX "_paginas_v_version_version_slug_idx" ON "_paginas_v" USING btree ("version_slug");
  CREATE INDEX "_paginas_v_version_version_updated_at_idx" ON "_paginas_v" USING btree ("version_updated_at");
  CREATE INDEX "_paginas_v_version_version_created_at_idx" ON "_paginas_v" USING btree ("version_created_at");
  CREATE INDEX "_paginas_v_version_version__status_idx" ON "_paginas_v" USING btree ("version__status");
  CREATE INDEX "_paginas_v_created_at_idx" ON "_paginas_v" USING btree ("created_at");
  CREATE INDEX "_paginas_v_updated_at_idx" ON "_paginas_v" USING btree ("updated_at");
  CREATE INDEX "_paginas_v_latest_idx" ON "_paginas_v" USING btree ("latest");
  CREATE INDEX "mensagens_updated_at_idx" ON "mensagens" USING btree ("updated_at");
  CREATE INDEX "mensagens_created_at_idx" ON "mensagens" USING btree ("created_at");
  CREATE INDEX "competicoes_imagem_idx" ON "competicoes" USING btree ("imagem_id");
  CREATE INDEX "competicoes_regulamento_idx" ON "competicoes" USING btree ("regulamento_id");
  CREATE UNIQUE INDEX "competicoes_slug_idx" ON "competicoes" USING btree ("slug");
  CREATE INDEX "competicoes_updated_at_idx" ON "competicoes" USING btree ("updated_at");
  CREATE INDEX "competicoes_created_at_idx" ON "competicoes" USING btree ("created_at");
  CREATE INDEX "convocacoes_competicao_idx" ON "convocacoes" USING btree ("competicao_id");
  CREATE INDEX "convocacoes_documento_idx" ON "convocacoes" USING btree ("documento_id");
  CREATE INDEX "convocacoes_updated_at_idx" ON "convocacoes" USING btree ("updated_at");
  CREATE INDEX "convocacoes_created_at_idx" ON "convocacoes" USING btree ("created_at");
  CREATE INDEX "resultados_linhas_order_idx" ON "resultados_linhas" USING btree ("_order");
  CREATE INDEX "resultados_linhas_parent_id_idx" ON "resultados_linhas" USING btree ("_parent_id");
  CREATE INDEX "resultados_competicao_idx" ON "resultados" USING btree ("competicao_id");
  CREATE INDEX "resultados_sumula_idx" ON "resultados" USING btree ("sumula_id");
  CREATE UNIQUE INDEX "resultados_slug_idx" ON "resultados" USING btree ("slug");
  CREATE INDEX "resultados_updated_at_idx" ON "resultados" USING btree ("updated_at");
  CREATE INDEX "resultados_created_at_idx" ON "resultados" USING btree ("created_at");
  CREATE INDEX "recordes_updated_at_idx" ON "recordes" USING btree ("updated_at");
  CREATE INDEX "recordes_created_at_idx" ON "recordes" USING btree ("created_at");
  CREATE INDEX "centros_tags_order_idx" ON "centros_tags" USING btree ("order");
  CREATE INDEX "centros_tags_parent_idx" ON "centros_tags" USING btree ("parent_id");
  CREATE INDEX "centros_capa_idx" ON "centros" USING btree ("capa_id");
  CREATE UNIQUE INDEX "centros_slug_idx" ON "centros" USING btree ("slug");
  CREATE INDEX "centros_updated_at_idx" ON "centros" USING btree ("updated_at");
  CREATE INDEX "centros_created_at_idx" ON "centros" USING btree ("created_at");
  CREATE INDEX "centros_rels_order_idx" ON "centros_rels" USING btree ("order");
  CREATE INDEX "centros_rels_parent_idx" ON "centros_rels" USING btree ("parent_id");
  CREATE INDEX "centros_rels_path_idx" ON "centros_rels" USING btree ("path");
  CREATE INDEX "centros_rels_media_id_idx" ON "centros_rels" USING btree ("media_id");
  CREATE INDEX "diretoria_foto_idx" ON "diretoria" USING btree ("foto_id");
  CREATE INDEX "diretoria_updated_at_idx" ON "diretoria" USING btree ("updated_at");
  CREATE INDEX "diretoria_created_at_idx" ON "diretoria" USING btree ("created_at");
  CREATE INDEX "documentos_updated_at_idx" ON "documentos" USING btree ("updated_at");
  CREATE INDEX "documentos_created_at_idx" ON "documentos" USING btree ("created_at");
  CREATE UNIQUE INDEX "documentos_filename_idx" ON "documentos" USING btree ("filename");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_noticias_id_idx" ON "payload_locked_documents_rels" USING btree ("noticias_id");
  CREATE INDEX "payload_locked_documents_rels_paginas_id_idx" ON "payload_locked_documents_rels" USING btree ("paginas_id");
  CREATE INDEX "payload_locked_documents_rels_mensagens_id_idx" ON "payload_locked_documents_rels" USING btree ("mensagens_id");
  CREATE INDEX "payload_locked_documents_rels_competicoes_id_idx" ON "payload_locked_documents_rels" USING btree ("competicoes_id");
  CREATE INDEX "payload_locked_documents_rels_convocacoes_id_idx" ON "payload_locked_documents_rels" USING btree ("convocacoes_id");
  CREATE INDEX "payload_locked_documents_rels_resultados_id_idx" ON "payload_locked_documents_rels" USING btree ("resultados_id");
  CREATE INDEX "payload_locked_documents_rels_recordes_id_idx" ON "payload_locked_documents_rels" USING btree ("recordes_id");
  CREATE INDEX "payload_locked_documents_rels_centros_id_idx" ON "payload_locked_documents_rels" USING btree ("centros_id");
  CREATE INDEX "payload_locked_documents_rels_diretoria_id_idx" ON "payload_locked_documents_rels" USING btree ("diretoria_id");
  CREATE INDEX "payload_locked_documents_rels_documentos_id_idx" ON "payload_locked_documents_rels" USING btree ("documentos_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_destaque_idx" ON "home" USING btree ("destaque_id");
  CREATE INDEX "home_foto_destaque_idx" ON "home" USING btree ("foto_destaque_id");
  CREATE INDEX "filiacao_perfis_documentos_order_idx" ON "filiacao_perfis_documentos" USING btree ("_order");
  CREATE INDEX "filiacao_perfis_documentos_parent_id_idx" ON "filiacao_perfis_documentos" USING btree ("_parent_id");
  CREATE INDEX "filiacao_perfis_order_idx" ON "filiacao_perfis" USING btree ("_order");
  CREATE INDEX "filiacao_perfis_parent_id_idx" ON "filiacao_perfis" USING btree ("_parent_id");
  CREATE INDEX "filiacao_perfis_formulario_idx" ON "filiacao_perfis" USING btree ("formulario_id");
  CREATE INDEX "filiacao_passos_order_idx" ON "filiacao_passos" USING btree ("_order");
  CREATE INDEX "filiacao_passos_parent_id_idx" ON "filiacao_passos" USING btree ("_parent_id");
  CREATE INDEX "filiacao_faq_order_idx" ON "filiacao_faq" USING btree ("_order");
  CREATE INDEX "filiacao_faq_parent_id_idx" ON "filiacao_faq" USING btree ("_parent_id");
  CREATE INDEX "federacao_numeros_order_idx" ON "federacao_numeros" USING btree ("_order");
  CREATE INDEX "federacao_numeros_parent_id_idx" ON "federacao_numeros" USING btree ("_parent_id");
  CREATE INDEX "federacao_filiacoes_order_idx" ON "federacao_filiacoes" USING btree ("_order");
  CREATE INDEX "federacao_filiacoes_parent_id_idx" ON "federacao_filiacoes" USING btree ("_parent_id");
  CREATE INDEX "federacao_foto_idx" ON "federacao" USING btree ("foto_id");
  CREATE INDEX "configuracoes_apoiadores_order_idx" ON "configuracoes_apoiadores" USING btree ("_order");
  CREATE INDEX "configuracoes_apoiadores_parent_id_idx" ON "configuracoes_apoiadores" USING btree ("_parent_id");
  CREATE INDEX "configuracoes_apoiadores_logo_idx" ON "configuracoes_apoiadores" USING btree ("logo_id");
  CREATE INDEX "configuracoes_logo_idx" ON "configuracoes" USING btree ("logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "noticias" CASCADE;
  DROP TABLE "_noticias_v" CASCADE;
  DROP TABLE "paginas" CASCADE;
  DROP TABLE "_paginas_v" CASCADE;
  DROP TABLE "mensagens" CASCADE;
  DROP TABLE "competicoes" CASCADE;
  DROP TABLE "convocacoes" CASCADE;
  DROP TABLE "resultados_linhas" CASCADE;
  DROP TABLE "resultados" CASCADE;
  DROP TABLE "recordes" CASCADE;
  DROP TABLE "centros_tags" CASCADE;
  DROP TABLE "centros" CASCADE;
  DROP TABLE "centros_rels" CASCADE;
  DROP TABLE "diretoria" CASCADE;
  DROP TABLE "documentos" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "filiacao_perfis_documentos" CASCADE;
  DROP TABLE "filiacao_perfis" CASCADE;
  DROP TABLE "filiacao_passos" CASCADE;
  DROP TABLE "filiacao_faq" CASCADE;
  DROP TABLE "filiacao" CASCADE;
  DROP TABLE "federacao_numeros" CASCADE;
  DROP TABLE "federacao_filiacoes" CASCADE;
  DROP TABLE "federacao" CASCADE;
  DROP TABLE "configuracoes_apoiadores" CASCADE;
  DROP TABLE "configuracoes" CASCADE;
  DROP TYPE "public"."enum_noticias_categoria";
  DROP TYPE "public"."enum_noticias_status";
  DROP TYPE "public"."enum__noticias_v_version_categoria";
  DROP TYPE "public"."enum__noticias_v_version_status";
  DROP TYPE "public"."enum_paginas_status";
  DROP TYPE "public"."enum__paginas_v_version_status";
  DROP TYPE "public"."enum_mensagens_assunto";
  DROP TYPE "public"."enum_mensagens_status";
  DROP TYPE "public"."enum_competicoes_tipo";
  DROP TYPE "public"."enum_competicoes_status";
  DROP TYPE "public"."enum_convocacoes_tipo";
  DROP TYPE "public"."enum_resultados_linhas_sexo";
  DROP TYPE "public"."enum_resultados_linhas_categoria_idade";
  DROP TYPE "public"."enum_recordes_categoria_idade";
  DROP TYPE "public"."enum_recordes_sexo";
  DROP TYPE "public"."enum_recordes_movimento";
  DROP TYPE "public"."enum_centros_tags";
  DROP TYPE "public"."enum_diretoria_grupo";
  DROP TYPE "public"."enum_documentos_categoria";
  DROP TYPE "public"."enum_users_role";`)
}
