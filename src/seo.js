import universityConfig from '@university'

export const APP_NAME = universityConfig.branding.appName
export const APP_DEFAULT_TITLE = universityConfig.branding.defaultTitle
export const SEO_TITLE = universityConfig.branding.seoTitle
export const SEO_DESCRIPTION = universityConfig.branding.seoDescription
export const SEO_ROBOTS_CONTENT = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'

const OG_IMAGE_PATH = '/og-image.jpg'
const STRUCTURED_DATA_SCRIPT_ID = 'seo-structured-data'

function ensureHeadNode(selector, tagName, attributes = {}) {
  let node = document.head.querySelector(selector)

  if (!node) {
    node = document.createElement(tagName)
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, value)
    }
    document.head.appendChild(node)
  }

  return node
}

function setMetaByName(name, content) {
  const meta = ensureHeadNode(`meta[name="${name}"]`, 'meta', { name })
  meta.setAttribute('content', content)
}

function setMetaByProperty(property, content) {
  const meta = ensureHeadNode(`meta[property="${property}"]`, 'meta', { property })
  meta.setAttribute('content', content)
}

function setCanonicalLink(href) {
  const link = ensureHeadNode('link[rel="canonical"]', 'link', { rel: 'canonical' })
  link.setAttribute('href', href)
}

// The site (its name and former names, for the name shown in search
// results) and the app, as index.html has them.
function buildStructuredData(pageUrl, imageUrl) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: APP_NAME,
      alternateName: universityConfig.branding.alternateNames ?? [],
      url: pageUrl,
      inLanguage: 'fr-FR',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: APP_NAME,
      url: pageUrl,
      image: imageUrl,
      description: SEO_DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'fr-FR',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      sameAs: [universityConfig.branding.about?.repoUrl].filter(Boolean),
    },
  ]
}

function syncStructuredData(pageUrl, imageUrl) {
  const script = ensureHeadNode(
    `script#${STRUCTURED_DATA_SCRIPT_ID}`,
    'script',
    { id: STRUCTURED_DATA_SCRIPT_ID, type: 'application/ld+json' },
  )

  script.textContent = JSON.stringify(buildStructuredData(pageUrl, imageUrl))
}

// Signed out (the login page, the one search engines see): the SEO title as
// it is, so the result's title is the page's.
export function buildDocumentTitle(authenticated) {
  return authenticated ? APP_DEFAULT_TITLE : SEO_TITLE
}

export function syncRuntimeSeo({ authenticated = false } = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  // Always the home page: the app is one page whatever its path or query.
  const pageUrl = new URL('/', window.location.origin).toString()
  const imageUrl = new URL(OG_IMAGE_PATH, window.location.origin).toString()
  const title = buildDocumentTitle(authenticated)

  document.documentElement.setAttribute('lang', 'fr')
  document.title = title

  setMetaByName('description', SEO_DESCRIPTION)
  setMetaByName('robots', SEO_ROBOTS_CONTENT)
  setMetaByName('googlebot', SEO_ROBOTS_CONTENT)
  setMetaByName('twitter:card', 'summary_large_image')
  setMetaByName('twitter:title', SEO_TITLE)
  setMetaByName('twitter:description', SEO_DESCRIPTION)
  setMetaByName('twitter:url', pageUrl)
  setMetaByName('twitter:image', imageUrl)
  setMetaByName('twitter:image:alt', `Aperçu de l'application ${APP_NAME}`)

  setMetaByProperty('og:type', 'website')
  setMetaByProperty('og:locale', 'fr_FR')
  setMetaByProperty('og:site_name', APP_NAME)
  setMetaByProperty('og:title', SEO_TITLE)
  setMetaByProperty('og:description', SEO_DESCRIPTION)
  setMetaByProperty('og:url', pageUrl)
  setMetaByProperty('og:image', imageUrl)
  setMetaByProperty('og:image:alt', `Aperçu de l'application ${APP_NAME}`)

  setCanonicalLink(pageUrl)
  syncStructuredData(pageUrl, imageUrl)
}
