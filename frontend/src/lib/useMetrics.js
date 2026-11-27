import { useEffect, useState } from 'react'
import api from './api'

let cache = null
let inflight = null

export default function useMetrics() {
  const [data, setData] = useState(cache)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (cache) return
    inflight = inflight || api.get('/models/metrics').then((r) => (cache = r.data))
    inflight.then(setData).catch((e) => { inflight = null; setError(e) })
  }, [])
  return { data, error }
}
