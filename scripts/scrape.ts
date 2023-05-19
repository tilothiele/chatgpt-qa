import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import { encode } from "gpt-3-encoder";

//const BASE_URL = "https://unterwegsmitbuddha.de/";
// https://steffimania.de/post-sitemap.xml

const CHUNK_SIZE = 200;

const getLinks = async (baseUrl: string) => {
  const xml = await axios.get(`${baseUrl}post-sitemap.xml`);
  const $ = cheerio.load(xml.data);
  const urls = $("url");

  const linksArr: { url: string; image: string, lastmod: Date }[] = [];

  urls.each((i, url) => {
    if(i > 0 ) {
      const loc = $(url).find("loc");
      const image = $(url).find("image\\:loc");
      const lastmod = $(url).find("lastmod");
      const linkObj = {
        url: $(loc).text(),
        image: $(image).text(),
        lastmod: new Date($(lastmod).text())
      };

      linksArr.push(linkObj);
    }
  });

  return linksArr;
};

const getPost = async (linkObj: { url: string; image: string, lastmod: Date }) => {
  const { image, lastmod, url } = linkObj;

  let essay: PGEssay = {
    title: "",
    url: "",
    image: "",
    date: new Date,
    thanks: "",
    content: "",
    length: 0,
    tokens: 0,
    chunks: []
  };

  const fullLink = url;
  const html = await axios.get(fullLink);
  const $ = cheerio.load(html.data);
  const article = $("article");
  const header = $(article).find("header");
  const title = $(header).find("h1").text();
  const essayText = $(article).find("div.entry-content").text();

  let cleanedText = essayText.replace(/\s+/g, " ");
  cleanedText = cleanedText.replace(/\.([a-zA-Z])/g, ". $1");

  const trimmedContent = cleanedText.trim();

  essay = {
    title,
    image,
    url: fullLink,
    date: lastmod,
    thanks: "",
    content: trimmedContent,
    length: trimmedContent.length,
    tokens: encode(trimmedContent).length,
    chunks: []
  };

  return essay;
};

const chunkEssay = async (essay: PGEssay) => {
  const { title, url, image, date, thanks, content, ...chunklessSection } = essay;

  let essayTextChunks = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }

    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }

  const essayChunks = essayTextChunks.map((text) => {
    const trimmedText = text.trim();

    const chunk: PGChunk = {
      essay_title: title,
      essay_url: url,
      essay_image: image,
      essay_date: date,
      essay_thanks: thanks,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      embedding: []
    };

    return chunk;
  });

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        essayChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection: PGEssay = {
    ...essay,
    chunks: essayChunks
  };

  return chunkedSection;
};

const scrapeWebsite = async (baseUrl: string, author: string) => {
  const links = await getLinks(baseUrl);

  console.log('Verarbeite '+links.length+' Posts');

  let essays = [];

  for(let i=0; i<links.length; i++) {
    console.log('Verarbeite Post '+(i+1)+'/'+links.length);
    const essay = await getPost(links[i]);
    const chunkedEssay = await chunkEssay(essay);
    //console.log(chunkedEssay);
    essays.push(chunkedEssay);
  }

  const json: PGJSON = {
    current_date: "2023-03-01",
    author,
    url: baseUrl,
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
}

(async () => {
//  await scrapeWebsite("https://unterwegsmitbuddha.de/", "Christiane Michelberger");
  await scrapeWebsite("https://steffimania.de/", "Stephanie Mitkowsky");
})();
