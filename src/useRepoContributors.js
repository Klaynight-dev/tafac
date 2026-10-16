import { useEffect, useState } from 'react'

// The repo's contributors, from GitHub's public API, for « Contributeurs » in
// À propos: people only (no bots), most commits first, minus `excluded`
// logins (the team, listed on its own). Asked once per tab and shared; on
// any failure (offline, rate limit) the list stays empty and the section
// simply doesn't show.
const requests = new Map()

// 'https://github.com/owner/repo' → 'owner/repo', or null.
export function readRepoSlug(url) {
  const match = String(url ?? '').match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}` : null
}

// GitHub's answer → [{ login, contributions }], people only, minus `excluded`.
export function readContributors(payload, excluded = []) {
  const skip = new Set(excluded.map((login) => login.toLowerCase()))
  return (Array.isArray(payload) ? payload : [])
    .filter((entry) => entry?.type === 'User' && typeof entry.login === 'string' && !skip.has(entry.login.toLowerCase()))
    .map((entry) => ({ login: entry.login, contributions: Number(entry.contributions) || 0 }))
}

function fetchContributors(slug) {
  let request = requests.get(slug)
  if (!request) {
    request = fetch(`https://api.github.com/repos/${slug}/contributors?per_page=50`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => (response.ok ? response.json() : []))
      .catch(() => [])
    requests.set(slug, request)
  }
  return request
}

export default function useRepoContributors(repoUrl, excluded = []) {
  const slug = readRepoSlug(repoUrl)
  const excludedKey = excluded.join(',')
  const [state, setState] = useState({ key: null, list: [] })
  const key = `${slug}|${excludedKey}`

  useEffect(() => {
    if (!slug) return undefined
    let cancelled = false
    fetchContributors(slug).then((payload) => {
      if (!cancelled) setState({ key, list: readContributors(payload, excludedKey ? excludedKey.split(',') : []) })
    })
    return () => {
      cancelled = true
    }
  }, [slug, excludedKey, key])

  return state.key === key ? state.list : []
}
