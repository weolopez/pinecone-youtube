import * as React from 'react'
import { AnimatePresence } from 'framer-motion'

import * as types from '@/types'
import { SearchResult } from '@/components/SearchResult/SearchResult'

import styles from './styles.module.css'

export const SearchResultsList: React.FC<{
  results: types.SearchResult[]
  query: string
  answerHeader: string
}> = ({ results, query, answerHeader }) => {
  console.error(results)
  let text = results.map((value) => {
    return value.metadata.text
  })
  let answer = answerHeader
  let textString =
    'Answer the question based on the context below.\n\nContext:\n' +
    text +
    '\n\nQuestion: ' +
    query +
    '\nAnswer:'
  return (
    <div className={styles.searchResultsList}>
      <h1>Generative Answer</h1>
      <h4>{answer}</h4>
      <h1>Transcript Search</h1>
      <AnimatePresence mode='popLayout' initial={false}>
        {results.map((result) => (
          <SearchResult key={result.id} result={result} />
        ))}
      </AnimatePresence>
    </div>
  )
}
