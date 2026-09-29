import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  SUPABASE_KEY_PLACEHOLDER,
  SUPABASE_URL_PLACEHOLDER,
  missingSupabaseEnv,
} from './app/utils/supabase-env'

const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_URL_PLACEHOLDER
const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY?.trim() || SUPABASE_KEY_PLACEHOLDER

const missingEnv = missingSupabaseEnv({ url: supabaseUrl, key: supabaseKey })
if (missingEnv.length > 0) {
  console.warn(`[supabase] Variable(s) d'environnement manquante(s) : ${missingEnv.join(', ')}. Voir .env.example.`)
}

// Révision de offline.html, calculée ici car le module retire l'extension .html des entrées
// qu'il génère (createManifestTransform) : on l'ajoute donc à la main, après les transformations.
const offlineRevision = createHash('md5').update(readFileSync('./public/offline.html')).digest('hex')

export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase', '@vite-pwa/nuxt', '@nuxt/eslint'],
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Carnet de nuits',
      meta: [
        { name: 'theme-color', content: '#0f172a' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'description', content: 'Suivi des soirées, nuits et matins' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
      style: [{ innerHTML: 'html{background:#0f172a;color-scheme:dark}' }],
    },
  },
  compatibilityDate: '2026-09-01',
  typescript: { strict: true, typeCheck: false },
  eslint: { config: { stylistic: true } },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Carnet de nuits',
      short_name: 'Carnet de nuits',
      description: 'Suivi des soirées, nuits et matins',
      lang: 'fr',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: null,
      // Obligatoire : le module ajoute sinon un seul motif qui remplace les motifs par défaut.
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      globIgnores: ['offline.html'],
      additionalManifestEntries: [{ url: 'offline.html', revision: offlineRevision }],
      runtimeCaching: [{
        urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
        handler: 'NetworkOnly',
        options: { precacheFallback: { fallbackURL: '/offline.html' } },
      }],
    },
    client: { installPrompt: false },
    devOptions: { enabled: false },
  },
  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    redirect: false,
    types: false,
  },
  tailwindcss: { viewer: false },
})
