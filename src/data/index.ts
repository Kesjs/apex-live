import type { ApexProvider } from '../domain/contracts'
import { demoProvider } from './demo-provider'
import { httpProvider } from './http-provider'
import { supabaseConfigure, supabaseProvider } from './supabase-provider'

/**
 * Choix de la source de données :
 *   VITE_DATA_SOURCE=demo -> données de démonstration
 *   VITE_DATA_SOURCE=supabase (si configuré) -> lecture directe de Supabase
 *   par défaut -> back-end HTTP (/api/* sur Vercel ou VITE_API_URL en local)
 */
const source = import.meta.env.VITE_DATA_SOURCE as string | undefined

export const provider: ApexProvider =
  source === 'demo'
    ? demoProvider
    : source === 'supabase' && supabaseConfigure
      ? supabaseProvider
      : httpProvider
