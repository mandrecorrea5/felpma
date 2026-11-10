import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "formularios_inscricao_blocks_selecao_opcoes" ADD COLUMN "grupo" varchar;
  ALTER TABLE "formularios_inscricao_blocks_selecao" ADD COLUMN "filtrar_por" varchar;
  ALTER TABLE "formularios_inscricao_blocks_multipla_opcoes" ADD COLUMN "grupo" varchar;
  ALTER TABLE "formularios_inscricao_blocks_multipla" ADD COLUMN "filtrar_por" varchar;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" ADD COLUMN "grupo" varchar;
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao" ADD COLUMN "filtrar_por" varchar;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" ADD COLUMN "grupo" varchar;
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla" ADD COLUMN "filtrar_por" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "formularios_inscricao_blocks_selecao_opcoes" DROP COLUMN "grupo";
  ALTER TABLE "formularios_inscricao_blocks_selecao" DROP COLUMN "filtrar_por";
  ALTER TABLE "formularios_inscricao_blocks_multipla_opcoes" DROP COLUMN "grupo";
  ALTER TABLE "formularios_inscricao_blocks_multipla" DROP COLUMN "filtrar_por";
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao_opcoes" DROP COLUMN "grupo";
  ALTER TABLE "_formularios_inscricao_v_blocks_selecao" DROP COLUMN "filtrar_por";
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla_opcoes" DROP COLUMN "grupo";
  ALTER TABLE "_formularios_inscricao_v_blocks_multipla" DROP COLUMN "filtrar_por";`)
}
