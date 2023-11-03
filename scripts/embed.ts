import { PGEssay, PGJSON } from "@/types";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";
import fs from "fs";
import { Configuration, OpenAIApi } from "openai";
import pgvector from 'pgvector/pg';

loadEnvConfig("");

/*
-- in psql
CREATE EXTENSION IF NOT EXISTS vector;

drop table if exists pg;
create table
  pg (
    id bigserial,
    essay_title text null,
    essay_url text null,
    essay_thanks text null,
    content text null,
    content_length bigint null,
    content_tokens bigint null,
    embedding vector(1536)  null,
    essay_image text null,
    essay_date date null,
    constraint pg_pkey primary key (id)
  ) tablespace pg_default;

create index if not exists pg_embedding_idx on pg using ivfflat (embedding vector_cosine_ops)
with
  (lists = '100') tablespace pg_default;
*/

const generateEmbeddings = async (essays: PGEssay[]) => {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);

  const pg_client = new Client();
  await pg_client.connect();
  await pgvector.registerType(pg_client);

  for (let i = 0; i < essays.length; i++) {
    const section = essays[i];

    for (let j = 0; j < section.chunks.length; j++) {
      const chunk = section.chunks[j];

      console.log(`Generating embedding for ${chunk.essay_title} - post ${i+1} of ${essays.length} / chunk ${j + 1} of ${section.chunks.length}`)

      const { essay_title, essay_image, essay_url, essay_date, essay_thanks, content, content_length, content_tokens } = chunk;

      const embeddingResponse = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: content
      });

      const [{ embedding }] = embeddingResponse.data.data;

      const result = await pg_client
        .query({
          text: "insert into pg(essay_title, essay_image, essay_url, essay_date, essay_thanks, content, content_length, content_tokens, embedding) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *",
          values: [essay_title,
            essay_image,
            essay_url,
            essay_date,
            essay_thanks,
            content,
            content_length,
            content_tokens,
            pgvector.toSql(embedding)]
        })

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
};

(async () => {
  const book: PGJSON = JSON.parse(fs.readFileSync("scripts/pg.json", "utf8"));

  await generateEmbeddings(book.essays);
})();
