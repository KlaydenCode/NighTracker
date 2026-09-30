import withNuxt from './.nuxt/eslint.config.mjs'

// database.ts est généré par `supabase gen types` : on ne le reformate pas.
export default withNuxt({ ignores: ['app/types/database.ts'] })
