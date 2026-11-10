import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "editais_taxas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"categoria" varchar,
  	"federado" varchar,
  	"nao_federado" varchar
  );
  
  CREATE TABLE "editais_inscricoes_regras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL
  );
  
  CREATE TABLE "editais_categorias_idade" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"descricao" varchar
  );
  
  CREATE TABLE "editais_categorias_peso_linhas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"masculino" varchar,
  	"feminino" varchar
  );
  
  CREATE TABLE "editais_categorias_peso" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL
  );
  
  CREATE TABLE "editais_requisitos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL
  );
  
  CREATE TABLE "editais" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" varchar DEFAULT '01' NOT NULL,
  	"ano" numeric NOT NULL,
  	"data_evento" timestamp(3) with time zone NOT NULL,
  	"horario" varchar,
  	"titulo" varchar NOT NULL,
  	"local" varchar NOT NULL,
  	"endereco" varchar NOT NULL,
  	"pesagem" varchar,
  	"competicao_id" integer,
  	"abertura" varchar DEFAULT 'A presidente da Federação de Levantamento de Peso do Maranhão (FELP-MA) torna público o edital de convocação para a {titulo}.',
  	"disposicoes" varchar DEFAULT 'O campeonato será regido pelas normas deste edital e executado pela Federação Esportiva de Levantamento de Peso do Estado do Maranhão FELP-MA.',
  	"inscricoes_de" timestamp(3) with time zone NOT NULL,
  	"inscricoes_ate" timestamp(3) with time zone NOT NULL,
  	"email_inscricao" varchar DEFAULT 'felpmaranhao@gmail.com',
  	"inscricoes_texto" varchar DEFAULT 'As inscrições devem ser realizadas no período de {inscricoesDe} a {inscricoesAte}.
  
  As inscrições serão feitas pelos atletas e/ou treinadores.
  
  Atletas federados e não federados devem inscrever-se com a Federação de Levantamento de Peso do Maranhão por meio do formulário eletrônico, efetuar o pagamento da inscrição e enviar o comprovante de pagamento descrevendo no e-mail o NOME COMPLETO DO ATLETA, a CATEGORIA DE IDADE e o PESO DA INSCRIÇÃO para o e-mail {emailInscricao}.
  
  Todas as inscrições realizadas por este método só serão dadas como válidas após o envio do e-mail de confirmação por parte da comissão de inscrições.
  
  O valor da taxa de inscrição será de:',
  	"observacao_taxas" varchar DEFAULT '*atletas de projetos sociais, mesmo não federados, terão como taxa de inscrição o valor de R$ 100,00, pagos por transferência para a conta bancária disponibilizada no formulário e anexado no formulário de inscrição.',
  	"regras" varchar DEFAULT 'Serão utilizadas as regras de competição e pesagem regulamentadas no manual de regras e regulamentos técnicos de competição da International Weightlifting Federation (IWF).',
  	"direitos_imagem" varchar DEFAULT 'Os participantes do campeonato autorizam, desde o ato de sua inscrição ou participação, a utilização de sua imagem pela FELP-MA.',
  	"observacoes_finais" varchar,
  	"publicado" boolean DEFAULT false,
  	"documento_id" integer,
  	"cidade_assinatura" varchar DEFAULT 'São Luís',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "editais_id" integer;
  ALTER TABLE "editais_taxas" ADD CONSTRAINT "editais_taxas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais_inscricoes_regras" ADD CONSTRAINT "editais_inscricoes_regras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais_categorias_idade" ADD CONSTRAINT "editais_categorias_idade_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais_categorias_peso_linhas" ADD CONSTRAINT "editais_categorias_peso_linhas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais_categorias_peso"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais_categorias_peso" ADD CONSTRAINT "editais_categorias_peso_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais_requisitos" ADD CONSTRAINT "editais_requisitos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "editais" ADD CONSTRAINT "editais_competicao_id_competicoes_id_fk" FOREIGN KEY ("competicao_id") REFERENCES "public"."competicoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "editais" ADD CONSTRAINT "editais_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "editais_taxas_order_idx" ON "editais_taxas" USING btree ("_order");
  CREATE INDEX "editais_taxas_parent_id_idx" ON "editais_taxas" USING btree ("_parent_id");
  CREATE INDEX "editais_inscricoes_regras_order_idx" ON "editais_inscricoes_regras" USING btree ("_order");
  CREATE INDEX "editais_inscricoes_regras_parent_id_idx" ON "editais_inscricoes_regras" USING btree ("_parent_id");
  CREATE INDEX "editais_categorias_idade_order_idx" ON "editais_categorias_idade" USING btree ("_order");
  CREATE INDEX "editais_categorias_idade_parent_id_idx" ON "editais_categorias_idade" USING btree ("_parent_id");
  CREATE INDEX "editais_categorias_peso_linhas_order_idx" ON "editais_categorias_peso_linhas" USING btree ("_order");
  CREATE INDEX "editais_categorias_peso_linhas_parent_id_idx" ON "editais_categorias_peso_linhas" USING btree ("_parent_id");
  CREATE INDEX "editais_categorias_peso_order_idx" ON "editais_categorias_peso" USING btree ("_order");
  CREATE INDEX "editais_categorias_peso_parent_id_idx" ON "editais_categorias_peso" USING btree ("_parent_id");
  CREATE INDEX "editais_requisitos_order_idx" ON "editais_requisitos" USING btree ("_order");
  CREATE INDEX "editais_requisitos_parent_id_idx" ON "editais_requisitos" USING btree ("_parent_id");
  CREATE INDEX "editais_competicao_idx" ON "editais" USING btree ("competicao_id");
  CREATE INDEX "editais_documento_idx" ON "editais" USING btree ("documento_id");
  CREATE INDEX "editais_updated_at_idx" ON "editais" USING btree ("updated_at");
  CREATE INDEX "editais_created_at_idx" ON "editais" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_editais_fk" FOREIGN KEY ("editais_id") REFERENCES "public"."editais"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_editais_id_idx" ON "payload_locked_documents_rels" USING btree ("editais_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "editais_taxas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais_inscricoes_regras" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais_categorias_idade" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais_categorias_peso_linhas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais_categorias_peso" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais_requisitos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "editais" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "editais_taxas" CASCADE;
  DROP TABLE "editais_inscricoes_regras" CASCADE;
  DROP TABLE "editais_categorias_idade" CASCADE;
  DROP TABLE "editais_categorias_peso_linhas" CASCADE;
  DROP TABLE "editais_categorias_peso" CASCADE;
  DROP TABLE "editais_requisitos" CASCADE;
  DROP TABLE "editais" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_editais_fk";
  
  DROP INDEX "payload_locked_documents_rels_editais_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "editais_id";`)
}
