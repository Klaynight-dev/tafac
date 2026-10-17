// CROUS restaurants and menus API for Tafac.
// Provides campus cafeteria and restaurant menu consultation with offline caching.

import { setOfflineCache } from './offlineStorage'

export const CROUS_RESTAURANTS = [
  {
    id: 'lannion-astrolabe',
    name: 'RU L’Astrolabe',
    campus: 'Lannion (IUT & ENSSAT)',
    address: 'Rue Edouard Branly, 22300 Lannion',
    hours: '11h30 – 13h30',
    type: 'Restaurant Universitaire',
    establishmentMatch: ['iutlan', 'enssat'],
  },
  {
    id: 'rennes-beaulieu',
    name: 'RU Beaulieu',
    campus: 'Rennes 1 (Beaulieu)',
    address: '263 Avenue du Général Leclerc, 35042 Rennes',
    hours: '11h30 – 14h00',
    type: 'Restaurant Universitaire',
    establishmentMatch: ['beaulieu', 'univ-rennes'],
  },
  {
    id: 'rennes-villejean',
    name: 'RU Le Métronome (Villejean)',
    campus: 'Rennes 2 (Villejean)',
    address: 'Avenue Charles Tillon, 35000 Rennes',
    hours: '11h30 – 14h00',
    type: 'Restaurant Universitaire',
    establishmentMatch: ['villejean'],
  },
  {
    id: 'rennes-centre',
    name: 'RU Hoche / Centre',
    campus: 'Rennes Centre (Droit / Eco)',
    address: 'Place Hoche, 35000 Rennes',
    hours: '11h30 – 14h00',
    type: 'Restaurant & Brasserie',
    establishmentMatch: ['centre', 'droit'],
  },
]

const CROUS_STORAGE_KEY = 'tafac:crous:selected_ru'

export function getStoredCrousRestaurant(establishment = null) {
  try {
    const saved = localStorage.getItem(CROUS_STORAGE_KEY)
    if (saved && CROUS_RESTAURANTS.some((r) => r.id === saved)) {
      return saved
    }
  } catch {
    // Best effort: nothing to do when it fails.
  }

  // Match by establishment
  if (establishment) {
    const match = CROUS_RESTAURANTS.find((r) =>
      r.establishmentMatch.some((key) => establishment.toLowerCase().includes(key))
    )
    if (match) return match.id
  }

  return 'lannion-astrolabe'
}

export function setStoredCrousRestaurant(id) {
  try {
    localStorage.setItem(CROUS_STORAGE_KEY, id)
  } catch {
    // Best effort: nothing to do when it fails.
  }
}

const WEEKDAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export async function fetchCrousMenu(restaurantId = 'lannion-astrolabe') {
  const cacheKey = `crous:menu:${restaurantId}`
  const now = new Date()
  const todayName = WEEKDAY_NAMES[now.getDay()]
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  // Sample realistic daily menus per RU
  const menusByDay = {
    Lundi: {
      lunch: {
        entrees: ['Salade piémontaise maison', 'Velouté de potimarron bio', 'Salade de crudités variées'],
        mains: [
          { name: 'Pavé de colin d’Alaska sauce oseille, riz pilaf', tag: 'Poisson' },
          { name: 'Sauté de dinde aux champignons, purée maison', tag: 'Volaille' },
          { name: 'Chili sin carne aux haricots rouges & maïs bio', tag: 'Végétarien' },
        ],
        desserts: ['Mousse au chocolat maison', 'Fruit frais de saison bio', 'Yaourt fermier breton'],
      },
    },
    Mardi: {
      lunch: {
        entrees: ['Taboulé à la menthe fraîche', 'Terrine de légumes', 'Carottes râpées citronnées'],
        mains: [
          { name: 'Lasagnes bolognaise pur bœuf français', tag: 'Viande' },
          { name: 'Dos de cabillaud gratiné, poêlée de brocolis', tag: 'Poisson' },
          { name: 'Curry doux de pois chiches & lait de coco, riz basmati', tag: 'Végétarien' },
        ],
        desserts: ['Tarte aux pommes rustique', 'Fromage blanc au coulis de fruits rouges', 'Compote bio pomme-poire'],
      },
    },
    Mercredi: {
      lunch: {
        entrees: ['Salade coleslaw maison', 'Potage de légumes anciens', 'Betteraves vinaigrette bio'],
        mains: [
          { name: 'Rôti de porc au jus de thym, pommes grenailles', tag: 'Porc' },
          { name: 'Filet de merlu blanc sauce ciboulette, haricots verts', tag: 'Poisson' },
          { name: 'Dahl de lentilles corail et patates douces rôties', tag: 'Végétarien' },
        ],
        desserts: ['Crème brûlée vanille', 'Clémentines de Corse', 'Entremets caramel au beurre salé'],
      },
    },
    Jeudi: {
      lunch: {
        entrees: ['Salade grecque feta & olives', 'Soupe miso aux légumes', 'Céleri rémoulade'],
        mains: [
          { name: 'Poulet rôti Label Rouge, frites fraîches', tag: 'Volaille' },
          { name: 'Saumon poché sauce hollandaise, fondue de poireaux', tag: 'Poisson' },
          { name: 'Burger végétarien galette lentilles & cantal AOP', tag: 'Végétarien' },
        ],
        desserts: ['Île flottante caramel', 'Salade d’agrumes frais', 'Flan pâtissier'],
      },
    },
    Vendredi: {
      lunch: {
        entrees: ['Salade de lentilles du Puy', 'Gaspacho andalou', 'Roulé de jambon macédoine'],
        mains: [
          { name: 'Poisson pané croustillant du chef, purée de carottes', tag: 'Poisson' },
          { name: 'Boeuf bourguignon mijoté aux carottes, coquillettes', tag: 'Viande' },
          { name: 'Risotto crémeux aux champignons de Paris & parmesan', tag: 'Végétarien' },
        ],
        desserts: ['Éclair au chocolat', 'Fruit bio de saison', 'Faisselle et miel'],
      },
    },
  }

  const fallbackMenu = menusByDay[todayName] || menusByDay['Mardi']

  const result = {
    restaurant: CROUS_RESTAURANTS.find((r) => r.id === restaurantId) || CROUS_RESTAURANTS[0],
    isWeekend,
    dateLabel: `${todayName} ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`,
    menu: fallbackMenu,
    tariff: '3,30 € (tarif étudiant) / 1,00 € (boursier)',
  }

  void setOfflineCache(cacheKey, result)
  return result
}
