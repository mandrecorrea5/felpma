import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Sexo na conta do atleta.
 *
 * A inscrição usa esse dado para definir a categoria de peso e evitar que o
 * atleta troque de categoria no navegador. Contas antigas começam com o campo
 * vazio e informam uma única vez (em Meus dados ou na primeira inscrição).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_atletas_sexo" AS ENUM('F', 'M');
    ALTER TABLE "atletas" ADD COLUMN "sexo" "enum_atletas_sexo";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "atletas" DROP COLUMN "sexo";
    DROP TYPE "public"."enum_atletas_sexo";
  `)
}
