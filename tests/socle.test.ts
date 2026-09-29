import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

function listFiles(dir: string, extensions: string[]): string[] {
  const abs = join(root, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs, { recursive: true, encoding: 'utf8' })
    .filter(f => extensions.some(ext => f.endsWith(ext)))
    .map(f => relative(root, join(abs, f)).replaceAll('\\', '/'))
}

const sourceFiles = [
  ...listFiles('app', ['.vue', '.css', '.ts', '.html']).filter(f => !f.endsWith('.test.ts')),
  'public/offline.html',
  'public/icon.svg',
  'tailwind.config.ts',
  'nuxt.config.ts',
].filter(f => existsSync(join(root, f)))

describe('Tailwind v3', () => {
  const pkg = JSON.parse(read('package.json')) as { devDependencies: Record<string, string> }
  const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, { version?: string }> }

  it('déclare tailwindcss en 3.x', () => {
    expect(pkg.devDependencies.tailwindcss).toMatch(/^3\./)
  })

  it('n\'a que des tailwindcss 3.x dans le lockfile, sans paquet @tailwindcss/vite ni /postcss', () => {
    for (const [key, value] of Object.entries(lock.packages)) {
      if (key.endsWith('node_modules/tailwindcss')) expect(value.version).toMatch(/^3\./)
      expect(key).not.toMatch(/node_modules\/@tailwindcss\/(vite|postcss)$/)
    }
  })

  it('n\'utilise pas @import "tailwindcss" et a un tailwind.config.ts', () => {
    for (const f of listFiles('app', ['.css', '.vue'])) {
      expect(read(f), f).not.toMatch(/@import\s+["']tailwindcss/)
    }
    expect(existsSync(join(root, 'tailwind.config.ts'))).toBe(true)
  })
})

describe('pas de blanc pur', () => {
  const white = /#fff(?:fff)?\b|\b(?:bg|text|border|fill|stroke|from|to|via)-white\b|rgba?\(\s*255\s*,\s*255\s*,\s*255/i
  it.each(sourceFiles)('%s', (f) => {
    expect(read(f)).not.toMatch(white)
  })
})

describe('pas de secret', () => {
  const secret = /eyJ[\w-]{20,}\.[\w-]{20,}|sb_secret_/
  const files = [
    ...sourceFiles,
    '.env.example',
    '.github/workflows/ci.yml',
    ...listFiles('supabase', ['.toml', '.sql']),
  ].filter(f => existsSync(join(root, f)))

  it.each(files)('%s', (f) => {
    expect(read(f)).not.toMatch(secret)
  })

  it('.env.example ne contient que les deux variables, sans valeur', () => {
    const lines = read('.env.example').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'))
    expect(lines).toEqual(['NUXT_PUBLIC_SUPABASE_URL=', 'NUXT_PUBLIC_SUPABASE_KEY='])
  })
})

describe('hors-ligne', () => {
  it('offline.html est en français et sans script', () => {
    const html = read('public/offline.html')
    expect(html).toContain('lang="fr"')
    expect(html).not.toMatch(/<script/i)
  })
})
