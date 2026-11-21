import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Categoria de peso como campo próprio da inscrição.
 *
 * Antes ela existia só dentro do JSON de respostas. O campo permite mostrar a
 * categoria na lista do painel, na área do atleta e no CSV, além de filtrar e
 * ordenar as inscrições de um evento. O backfill abaixo lê o snapshot que já
 * está gravado — nenhuma inscrição precisa ser reaberta.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "inscricoes" ADD COLUMN "categoria_peso" varchar;
  `)

  await db.execute(sql`
    WITH "candidatos" AS (
      SELECT
        "i"."id",
        COALESCE(
          (
            SELECT NULLIF(btrim("r"->>'exibicao'), '')
            FROM jsonb_array_elements("i"."respostas") AS "r"
            WHERE lower(coalesce("r"->>'campo', '')) LIKE '%categoria%peso%'
              AND coalesce(("r"->>'cifrado')::boolean, false) = false
              AND coalesce(("r"->>'sensivel')::boolean, false) = false
            LIMIT 1
          ),
          (
            SELECT COALESCE(
              NULLIF(btrim("r"->>'exibicao'), ''),
              CASE
                WHEN jsonb_typeof("r"->'valor') = 'string'
                  THEN NULLIF(btrim("r"->>'valor'), '')
              END
            )
            FROM jsonb_array_elements("i"."respostas") AS "r"
            WHERE lower(coalesce("r"->>'rotulo', '')) LIKE '%categoria de peso%'
              AND coalesce(("r"->>'cifrado')::boolean, false) = false
              AND coalesce(("r"->>'sensivel')::boolean, false) = false
            LIMIT 1
          )
        ) AS "categoria"
      FROM "inscricoes" AS "i"
      WHERE jsonb_typeof("i"."respostas") = 'array'
    )
    UPDATE "inscricoes" AS "i"
    SET "categoria_peso" = "c"."categoria"
    FROM "candidatos" AS "c"
    WHERE "i"."id" = "c"."id"
      AND "i"."categoria_peso" IS NULL
      AND "c"."categoria" IS NOT NULL;
  `)

  await db.execute(sql`
    CREATE INDEX "inscricoes_categoria_peso_idx" ON "inscricoes" USING btree ("categoria_peso");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "inscricoes_categoria_peso_idx";
    ALTER TABLE "inscricoes" DROP COLUMN "categoria_peso";
  `)
}
