import { Configuration, OpenAIApi } from 'openai'
import { PineconeClient } from 'pinecone-client'

import * as config from '@/lib/config'
import * as types from '@/server/types'
import '@/server/config'

async function main() {
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

  const query = 'explain how gravity works'
  const { data: embed } = await openai.createEmbedding({
    input: query,
    model: config.openaiEmbeddingModel
  })

  const res = await pinecone.query({
    vector: embed.data[0].embedding,
    topK: 10,
    includeMetadata: true,
    includeValues: false
  })

  const contexts: string[] = res['matches'].map(
    (x: any) => x['metadata']['text']
  )
  let prompt = getPrompt(contexts, query, 10)

  console.log(prompt)
  let data = await openai
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
      console.log(res.data.choices[0].text)
    })
}

main().catch((err) => {
  console.error('error', err)
  process.exit(1)
})

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
