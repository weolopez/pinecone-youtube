import { Configuration, OpenAIApi } from 'openai'
import { PineconeClient } from 'pinecone-client'
import QuickLRU from 'quick-lru'

import * as config from '@/lib/config'
import * as types from '@/server/types'
import { createAPIHandler } from '@/server/api'
import '@/server/config'
import { pick } from '@/server/utils'
import { SearchQuery, SearchQuerySchema, SearchResult } from '@/types'

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY
  })
)

const pinecone = new PineconeClient<types.PineconeCaptionMetadata>({
  apiKey: process.env.PINECONE_API_KEY,
  baseUrl: process.env.PINECONE_BASE_URL,
  namespace: process.env.PINECONE_NAMESPACE
})

const embeddingCache = new QuickLRU<string, number[]>({
  maxSize: 4096
})

export default createAPIHandler<SearchQuery, never, SearchResult[]>(
  {
    methods: ['GET'],
    query: SearchQuerySchema
  },
  async function searchHandler(req, res, { query }) {
    const input = query.query
    const limit = query.limit ?? 25

    const inputL = input.toLowerCase().trim()
    let searchResults: SearchResult[] = []
    if (inputL) {
      const tokens = inputL
        .split(/\s/)
        .map((token) => token.trim())
        .filter(Boolean)

      let inputEmbedding = embeddingCache.get(inputL)

      if (!inputEmbedding) {
        const { data: embed } = await openai.createEmbedding({
          input,
          model: config.openaiEmbeddingModel
        })

        inputEmbedding = embed.data[0].embedding
        embeddingCache.set(inputL, inputEmbedding)
      }

      const results = await pinecone.query({
        vector: inputEmbedding,
        topK: limit,
        includeMetadata: true,
        includeValues: false
      })

      const contexts: string[] = results['matches'].map(
        (x: any) => x['metadata']['text']
      )
      const prompt = getPrompt(contexts, input, limit)

      let data: any = await openai
        .createCompletion({
          prompt: prompt,
          model: config.openaiCompletionModel,
          max_tokens: 1000,
          temperature: 0.5,
          n: 1,
          stream: false,
          stop: ['\n', 'Answer:']
        })
        .then((res) => {
          let output = res.data.choices[0].text
          console.log(output)
          return output
        })

      // res.setHeader('answer', data)

      searchResults = results.matches.map((result) => {
        const searchResult = pick<Partial<SearchResult>>(
          result,
          'id',
          'score',
          'metadata'
        )

        // extract direct match highlights
        let html = result.metadata.text
        for (const token of tokens) {
          html = html
            .replaceAll(/\s+/g, ' ')
            .replaceAll(
              new RegExp(`\\b(${token})\\b`, 'ig'),
              `<span class="match">$1</span>`
            )
        }
        searchResult.matchedHtml = html

        return searchResult as SearchResult
      })

      searchResults[0].answer = data
    }

    // add an extra long delay to accentuate any client-side swr cache misses
    // (for debugging purposes)
    // await new Promise((resolve) => {
    //   setTimeout(resolve, 5000)
    // })

    if (!config.isDev) {
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=3600, max-age=3600, stale-while-revalidate=3600'
      )
    }

    return res.status(200).json(searchResults)
  }
)

function getPrompt(contexts: string[], query: string, limit: number) {
  // build our prompt with the retrieved contexts included
  let prompt: string =
    'Answer the question based on the context below.\n\nContext:\n'
  const prompt_end: string = `\n\nQuestion: ${query}\nAnswer:`

  for (let i = 1; i < contexts.length; i++) {
    prompt += contexts[i]
  }

  return prompt + prompt_end
}
