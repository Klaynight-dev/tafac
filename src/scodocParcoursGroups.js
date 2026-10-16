// ScoDoc names some TP groups after the parcours instead of TD/TP letters, and
// the naming changes between years for the same group: BUT INFO-COM Lannion
// uses "JOUR 1-2" (partition "JOUR"), "JOUR1A2" or "groupeJOUR1A2" (partition
// "Groupes TP") for the ADE TP leaf "1A2 J" (1re année, groupe 2, Journalisme).
// Returns the ADE-style labels to try, or [] when the label isn't shaped so.
export function buildParcoursTpAliases(label) {
  const normalizedLabel = String(label ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
  const match = normalizedLabel.match(/^(?:groupe\s*)?([A-Z]{2,}?)\s*(\d)\s*(?:-|A)\s*(\d{1,2})$/i)
  const [, parcours, year, group] = match ?? []

  // "TP 1-2" or "Groupe 1-2" carry no parcours to match the ADE suffix against.
  if (!match || /^(?:T[DP]|groupe)$/i.test(parcours)) {
    return []
  }

  const tpLabel = `${year}A${group}`

  return [`${tpLabel} ${parcours[0].toUpperCase()}`, tpLabel]
}
