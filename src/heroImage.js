import universityConfig from '@university'
import duskPlaceholder from './assets/hero-placeholders/dusk.svg'
import coastPlaceholder from './assets/hero-placeholders/coast.svg'
import meadowPlaceholder from './assets/hero-placeholders/meadow.svg'

// Stylized scenes shown when neither the establishment nor the university
// configures a hero photo.
const PLACEHOLDER_HERO_IMAGES = [
  { src: duskPlaceholder, credit: null },
  { src: coastPlaceholder, credit: null },
  { src: meadowPlaceholder, credit: null },
]

function normalizeHeroImages(images) {
  if (!Array.isArray(images)) {
    return []
  }

  return images
    .map((image) => (typeof image === 'string' ? { src: image } : image))
    .filter((image) => image && typeof image.src === 'string' && image.src)
    .map((image) => ({
      src: image.src,
      position: image.position ?? null,
      credit: image.credit ?? null,
    }))
}

function hashString(value) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function getDayIndex(date) {
  return Math.floor(date.getTime() / 86_400_000)
}

// Photos the dashboard can show for an establishment: its own first, then the
// university's. Empty when neither configures any (a placeholder is used).
export function listHeroImages(establishment = null) {
  const establishmentImages = normalizeHeroImages(
    universityConfig.establishments?.byId?.[establishment]?.heroImages,
  )
  const universityImages = normalizeHeroImages(universityConfig.branding?.heroImages)
  return establishmentImages.length > 0 ? establishmentImages : universityImages
}

// Hero photo for the dashboard: establishment photos first, then the
// university's, then a placeholder. With several photos, the pick rotates
// daily so it stays stable within a day. `offset` shifts the pick (debug menu).
export function resolveHeroImage(establishment = null, date = new Date(), offset = 0) {
  const candidates = listHeroImages(establishment)

  if (candidates.length > 0) {
    const count = candidates.length
    return candidates[(((getDayIndex(date) + offset) % count) + count) % count]
  }

  const seed = `${universityConfig.id ?? ''}:${establishment ?? ''}`
  return PLACEHOLDER_HERO_IMAGES[hashString(seed) % PLACEHOLDER_HERO_IMAGES.length]
}
