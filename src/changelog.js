// « Nouveautés »: what changed in the app, written for students.
//
// Adding an entry is one object, at the TOP of CHANGELOG (newest first):
//
//   {
//     id: 'mon-entree',          // unique and never changed: devices remember the ids they've seen
//     date: '2026-10-12',        // YYYY-MM-DD, the day it ships
//     title: 'Un titre court',
//     body: 'Une ou deux phrases concrètes, en tutoyant, sans jargon.',
//     icon: 'carbon:calendar',   // optional, any Iconify name (carbon: or ph: like the rest)
//     universities: ['univ-rennes'],  // optional: only these universityConfig.id
//     features: ['mail', 'moodle'],   // optional: only where all these universityConfig.features are on
//   },
//
// An entry with neither `universities` nor `features` is shown everywhere.
// With both, it has to pass both. A feature counts as on when it's `true` (or
// an object without `enabled: false`, like `weather`), so `grades: 'disabled'`
// counts as off. Where an entry doesn't apply, it's invisible: no pill, not in
// the list. Copy rules: ’ apostrophes, a narrow no-break space (`\u202f`)
// before : ! ? » and after «, and no app name (each university brands its own).
//
// Students see a small « Nouveautés » pill on the dashboard until they open
// the list. A device's first visit marks everything already here as seen, so
// only entries added afterwards light the pill up (src/changelogState.js).
// Same-day entries keep the order they have here.

export const CHANGELOG = [
  {
    id: 'resume-du-jour',
    date: '2026-10-12',
    title: 'Le résumé de ta journée',
    body: 'Sous ton prénom, une petite phrase te dit combien de cours t’attendent et à quelle heure tu finis. Le soir, elle passe au lendemain.',
    icon: 'ph:sun-horizon',
    features: ['ade'],
  },
  {
    id: 'certificat-de-scolarite',
    date: '2026-10-12',
    title: 'Ton certificat de scolarité en un clic',
    body: 'Télécharge-le en PDF depuis Réglages\u202f›\u202fCompte, sans aller le chercher ailleurs.',
    icon: 'carbon:document-pdf',
    features: ['schoolCertificate'],
  },
  {
    id: 'accueil-compact-telephone',
    date: '2026-10-12',
    title: 'Un accueil plus compact sur téléphone',
    body: 'Les cartes prennent moins de place, et tu passes des mails aux échéances d’un glissement de doigt. Celle où il y a le plus à voir s’affiche en premier.',
    icon: 'carbon:mobile',
    features: ['mail', 'moodleDeadlines'],
  },
  {
    id: 'navigation',
    date: '2026-10-12',
    title: 'Une barre d’onglets sur téléphone',
    body: 'En bas de l’écran, l’accueil et tes raccourcis restent à portée de pouce. Sur ordi, tire le bord de la barre latérale pour l’élargir ou la réduire.',
    icon: 'ph:squares-four',
    features: ['planning'],
  },
  {
    id: 'raccourcis-messagerie-moodle',
    date: '2026-10-12',
    title: 'Messagerie et Moodle en un geste',
    body: 'Les deux ont leur raccourci dans la barre latérale, et en bas de l’écran sur téléphone. Un appui et tu y es, sans te reconnecter.',
    icon: 'carbon:email',
    features: ['mail', 'moodle'],
  },
  {
    id: 'apparence',
    date: '2026-10-12',
    title: 'Thème sombre et photo de fond',
    body: 'Dans Réglages\u202f›\u202fApparence, choisis entre clair, sombre ou automatique (comme ton téléphone). Tu peux aussi masquer la photo\u202f: les cartes deviennent pleines et bien nettes.',
    icon: 'carbon:moon',
  },
  {
    id: 'reglages-en-sections',
    date: '2026-10-12',
    title: 'Des Réglages mieux rangés',
    body: 'Compte, Planning, Apparence… Chaque chose a sa section. Et ce qui touche à ta vie privée est expliqué directement dedans.',
    icon: 'carbon:settings',
  },
  {
    id: 'applications',
    date: '2026-10-12',
    title: 'Des applications plus faciles à trouver',
    body: 'Chaque application a sa vraie icône, logo Moodle compris. La recherche ignore les accents et connaît les synonymes («\u202fmail\u202f» trouve la messagerie), et tes favoris s’ajoutent instantanément.',
    icon: 'carbon:app-switcher',
  },
]
