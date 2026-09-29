// Vérifie, après `npm run build`, que le service worker généré précache bien offline.html
// (et non « offline » : @vite-pwa/nuxt retire l'extension .html des entrées qu'il génère).
// Lancé en CI après le build ; volontairement hors de `npm run test` pour ne pas dépendre d'un build préalable.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const swPath = fileURLToPath(new URL('../.output/public/sw.js', import.meta.url))

if (!existsSync(swPath)) {
  console.error(`[precache] ${swPath} introuvable : lancer « npm run build » d'abord.`)
  process.exit(1)
}

const sw = readFileSync(swPath, 'utf8')
const entries = [...sw.matchAll(/\burl:\s*"([^"]*)"/g)].map(m => m[1])

const errors = []
if (!entries.some(u => u === 'offline.html' || u === '/offline.html')) {
  errors.push('aucune entrée de précache « offline.html »')
}
if (entries.includes('offline')) {
  errors.push('entrée de précache « offline » (sans extension) présente')
}

if (errors.length > 0) {
  console.error(`[precache] ${errors.join(' ; ')}. Entrées : ${entries.join(', ')}`)
  process.exit(1)
}
console.log(`[precache] OK : offline.html précaché (${entries.length} entrées).`)
