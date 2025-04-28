---
title: A Gentle Introduction to Using a Vector Database
description: In which we learn how to build a simple vector database using Pinecone and OpenAI embeddings, and discover it was way easier than we might have expected.
date: 2024-12-30T17:07:17-07:00
modified: 2025-04-26T10:04:14-06:00
published: true
tags:
  - open-ai
  - pinecone
  - artificial-intelligence
---

Let's talk about vector databases by using [Pinecone](https://www.pinecone.io) and [OpenAI](https://openai.com) embeddings to build a simple script that allows you to search a set of what we'll generously call "recipes." We're going to explore how vector databases differ from the usual SQL-style tables you might know—and potentially love/hate, learn how to generate embeddings with OpenAI to capture the "meaning" of text, and then put it all together in a simple TypeScript project—because I can't be bothered to learn how `virtualenv`s work in Python. By the end, you'll be ready to store and semantically query unhinged recipes—or anything else you fancy—with ease, grace, and poise.

**Nota bene**: A completed version of the code can be found in [this repository](https://github.com/stevekinney/pinecone-example).

## What Even is a Vector Database?

If we're going to spend the next little bit learning how to use a vector database, then it probably makes sense to spend a moment or two to quickly review what they are and why they're potentialy useful.

A vector database is a specialized system for storing and searching high-dimensional representations (vectors) of data, rather than traditional rows and columns. When AI models (like large language models) convert text or images into numerical embeddings that capture semantic meaning, those embeddings can be efficiently stored in a vector database. This allows for “similarity searches” that retrieve the most relevant information based on how close two vectors are in high-dimensional space, rather than relying on exact keyword matches.

In practice, vector databases excel at tasks like:

1. **Semantic Search**: Matching user queries to similar documents based on meaning rather than exact keywords. (_Spoiler alert_: This is going to be roughly what we're going to implement today.)
2. **Recommendation Systems**: Finding items with similar traits by measuring proximity in vector space.
3. **Question Answering**: Locating the most relevant info from knowledge bases by comparing vector representations.

Vector databases are super useful when working with Large Language Models (LLMs, as the kids like to say) because they let you store and compare the AI-generated [vector “embeddings"](https://platform.openai.com/docs/guides/embeddings/) that capture deeper semantic meaning. For example, if you're building a Q&A system on a large set of legal documents, the database can quickly return similar passages—even if they don't share the same exact words—by comparing their embeddings.

In a recommendation system, LLMs can embed product descriptions, and the vector database finds items with overlapping attributes to suggest meaningful alternatives. Additionally, for chatbot applications, you can store a knowledge base in vector form and retrieve the most relevant context on demand, enabling more accurate and context-aware responses.

We're going to use [Pinecone](https://www.pinecone.io/), which I'm told is a popular choice for vector databases. In the future, we'll explore some other alternatives as well. (I'm looking at you, [LanceDB](https://lancedb.com/).)

## Getting Set Up

First, let's define some simple types that we're going to work with. This silly little example is going to take an array of recipes and add them to our vector database. Later on, we'll use the vector database to search for documents related to a given query. I'm just going to cheat and use the structure of this JSON object to infer a type since it's hardcoded in `recipes.json`.

```typescript
import recipes from './recipes.json';
type Recipe = (typeof recipes)[number];
```

Next, we'll pull in [Pinecone](https://www.npmjs.com/package/@pinecone-database/pinecone) and the [Open AI SDK](https://www.npmjs.com/package/openai). Additionally, we'll use `dotenv` to pull in our API keys as environment variables from `.env`, which you'll need to create yourself since it's included in `.gitignore`. It turns out that I wasn't particularly in the mood to publicly expose my API keys and let y'all run up a series of bills on my behalf.

```typescript
import 'dotenv/config';

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
```

Before we go any further, let's make sure that our environment variables are _actually_ configured correctly before we go any further. If they're not, our code will—intentionally—blow up. But, at least we'll know exactly why.

```typescript
const { PINECONE_API_KEY, OPEN_AI_API_KEY } = process.env;

if (!PINECONE_API_KEY) throw new Error('Pinecone API key is required');
if (!OPEN_AI_API_KEY) throw new Error('OpenAI API key is required');
```

We're going to create a `VectorDatabase` class to encapsulate our logic. I'm going to keep this intentionally simple and I'll leave it to your to improve it as homework. We'll start with just `constructor` and some properties. I'll add some additional methods once we have that out of the way. For our own sanity, we're going to make sure that those API keys are defined and choose to blow up if they're not.

```typescript
export class VectorDatabasse {
  private pinecone: Pinecone;
  private openai: OpenAI;

  private readonly indexName = 'recipes';
  private readonly dimension = 1536; // OpenAI's ada-002 embedding dimension
  private readonly metric = 'cosine'; // OpenAI's ada-002 embedding metric

  constructor() {
    /** Instantiate an instance of the Pinecone SDK.  */
    this.pinecone = new Pinecone({ apiKey: PINECONE_API_KEY! });
    /** Instantiate an instance of the OpenAI SDK.  */
    this.openai = new OpenAI({ apiKey: OPEN_AI_API_KEY! });
  }

  // ... More to come ...
}
```

You can think of an **index** like a table in a more traditional database. In fact, you could _probably_ think of it as an instance of the database itself. Please don't message me. Anyway, we want to make sure that our "recipes" index exists. If it does, then we'd like a reference to it. If it doesn't, then please go ahead and create one on our behalf.

I'm going to go ahead and give myself some helpful little utilities.

- `this.#indexExists` will give me a list of all of the index currently in Pinecone and checks to to see if `this.indexName` is included in that list.
- `this.getIndex()` is going to return a reference to Pinecone index as determined by `this.indexName`. If it doesn't already exist, it will go ahead and create it for me.

```typescript
/**
   * Verify if the index exists in Pinecone.
   */
  get #indexExists() {
    return this.pinecone.listIndexes().then(({ indexes }) => {
      if (!indexes) return false;
      return indexes.some((index) => index.name === this.indexName);
    });
  }

  /**
   * A reference to the index in Pinecone. If the index does not exist, it will be created.
   */
  async getIndex() {
    if (await this.#indexExists) return this.pinecone.Index(this.indexName);

    await this.pinecone.createIndex({
      name: this.indexName,
      dimension: this.dimension,
      metric: this.metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    return this.pinecone.Index(this.indexName);
  }
```

You're more than welcome to tweak the `spec` if you want to use a different region or Cloud provider, but these are sensible defaults for this silly example implementation.

Next, we'll initialize our connection to Pinecone.

## Creating Vector Embeddings

We're going to add three methods:

- `generateEmbedding`: This will use OpenAI to create an embedding based on the text content of a document.
- `indexDocument`: This will call `generateEmbedding` and then add the document to our vector database.
- `semanticSearch`: This will search our vector database for content that is similar to the query.

The first one, `generateEmbedding` is going to use Open AI in order to take a given piece of text and turn it into a vector—also known as an array of numbers. It's fairly straight-forward. We specify what model we want to use to create the embedding and then we pull the data we're looking for out of the response.

```typescript
export class VectorDatabase {
  // ... Previous code ...

  /**
   * Generate embeddings using OpenAI's API.
   * @returns A vector representation of the text.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  }
}
```

We'll use `this.generateEmbedding` for both storing our documents and then also to create a vector when someone tries to query the database using a string. Next up, let's look at `this.insertDocument`.

```typescript
export class VectorDatabase {
  // ... Previous code ...

  async indexDocument(document: Recipe) {
    const index = await this.getIndex();
    const embedding = await this.generateEmbedding(document.content);

    await index.upsert([
      {
        id: document.id,
        values: embedding,
        metadata: {
          title: document.title,
          content: document.content,
        },
      },
    ]);
  }
}
```

As you can see, we're including both the embedding of the document—a recipe, in this case—as well as some of the metadata about the file that it came from. This metadata can be anything that makes it easier for you to relate the vector embedding back to the original source material.

Finally, we need to figure out how to search the vector database to get content that relates to a given query. In this example, we're going to default to returning the top three matches as our dataset isn't particularly large.

```typescript
export class VectorDatabase {
  // ... Previous code ...

  /**
   * Search the vector database for content that matches the query.
   */
  async semanticSearch(
    /**
     * A string that will be turned into an embedding and used to query the
     * vector database.
     */
    query: string,
    /** The number of results to return. Maximum: 10,000. */
    topK: number = 3,
  ) {
    // Generate embedding for the search query.
    const vector = await this.generateEmbedding(query);
    const index = await this.getIndex();

    // Search for similar vectors
    const searchResults = await index.query({
      vector,
      topK,
      includeMetadata: true,
    });

    return searchResults.matches.map((match) => ({
      id: match.id,
      title: match.metadata?.title,
      content: match.metadata?.content.toString().slice(0, 50) + '…',
      score: match.score,
    }));
  }
}
```

## Trying It Out

Now that we have everything set up, we can load our data into Pinecone and query it. Comment out whatever parts you don't need and feel free to adjust the query to see the results change.

```typescript
const database = new VectorDatabase();

// Comment this out if you've already stored the recipes in the database.
for (const recipe of recipes) {
  console.log(chalk.blue('Indexing recipe:'), recipe.title);
  await database.indexDocument(recipe);
}

const searchResults = await database.semanticSearch('recipes with ice cream');

console.table(searchResults);
```

**In case you missed it**: A completed version of the code can be found in [this repository](https://github.com/stevekinney/pinecone-example).

And with that, we've managed to cobble together a simple vector database using Pinecone and OpenAI embeddings to store and query recipe data. You definitely don't have to use OpenAI to create your embeddings. The only rule that whatever you use to create vector embeddings for you data has to be the same model that you use to create vector embeddings of the user-provided queries. You can't mix and match.

As an exercise, you can take a larger dataset (e.g. the documentation for your favorite open source project, the last five years of your private journal, all of the blog posts you bookmarked with every intention to read, etc.)
