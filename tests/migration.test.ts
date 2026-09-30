import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Garde statique de la migration et du seed, sans Docker. Les règles de fond (RLS, fonctions)
// sont vérifiées en pgTAP : `npx supabase test db`.

const root = fileURLToPath(new URL('..', import.meta.url))

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

const migrationDir = join(root, 'supabase/migrations')
const migrationFiles = readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort()
const migrations = migrationFiles.map(f => read(`supabase/migrations/${f}`)).join('\n')

describe('migrations', () => {
  it('contiennent au moins une migration', () => {
    expect(migrationFiles.length).toBeGreaterThan(0)
  })

  it('activent la RLS sur chaque table créée', () => {
    const tables = [...migrations.matchAll(/create table (?:if not exists )?public\.(\w+)/gi)].map(m => m[1]!)
    expect(tables.length).toBeGreaterThan(0)
    for (const table of tables) {
      expect(migrations, table).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    }
  })

  it('fixent le search_path de chaque fonction security definer', () => {
    const functions = migrations.split(/create (?:or replace )?function /i).slice(1)
    const definers = functions.filter(f => /security definer/i.test(f))
    expect(definers.length).toBeGreaterThan(0)
    for (const fn of definers) {
      const name = fn.slice(0, fn.indexOf('('))
      expect(fn, name).toMatch(/set search_path = ''/i)
    }
  })

  it('n\'ont ni force row level security ni politique pour anon', () => {
    expect(migrations).not.toMatch(/force row level security/i)
    expect(migrations).not.toMatch(/to anon/i)
  })

  it('ne plafonnent pas les rôles ni le nombre de membres', () => {
    expect(migrations).not.toMatch(/check\s*\(\s*role\b/i)
    expect(migrations).not.toMatch(/count\s*\(\s*\*\s*\)/i)
  })
})

describe('seed', () => {
  it('ne contient que des adresses fictives en @example.test', () => {
    const emails = read('supabase/seed.sql').match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? []
    expect(emails.length).toBeGreaterThan(0)
    for (const email of emails) {
      expect(email).toMatch(/@example\.test$/)
    }
  })
})

describe('gabarits d\'email', () => {
  const magicLink = read('supabase/templates/magic_link.html')
  const confirmation = read('supabase/templates/confirmation.html')

  it('sont identiques', () => {
    expect(confirmation).toBe(magicLink)
  })

  it('contiennent le code et le lien vers l\'app', () => {
    expect(magicLink).toContain('{{ .Token }}')
    expect(magicLink).toContain('token_hash={{ .TokenHash }}')
  })

  it('sont référencés par la configuration locale', () => {
    const config = read('supabase/config.toml')
    expect(config).toContain('supabase/templates/magic_link.html')
    expect(config).toContain('supabase/templates/confirmation.html')
    expect(existsSync(join(root, 'supabase/templates/magic_link.html'))).toBe(true)
  })
})
