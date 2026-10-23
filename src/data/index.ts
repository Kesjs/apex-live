import type { ApexProvider } from '../domain/contracts'
import { demoProvider } from './demo-provider'
import { httpProvider } from './http-provider'
import { supabaseConfigure, supabaseProvider } from './supabase-provider'

/**
 * Choix de la source de données :
 *   VITE_DATA_SOURCE=demo -> données de démonstration (développement uniquement)
 *   VITE_DATA_SOURCE=api et VITE_API_URL renseigné -> back-end HTTP (backend/, npm run dev)
 *   sinon, si VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont renseignés -> lecture directe de Supabase (cas normal en production)
 *   sinon -> back-end HTTP même origine
 */
const source = import.meta.env.VITE_DATA_SOURCE as string | undefined
const apiUrl = import.meta.env.VITE_API_URL as string | undefined

export const provider: ApexProvider =
  source === 'demo' ? demoProvider : source === 'api' && apiUrl ? httpProvider : supabaseConfigure ? supabaseProvider : httpProvider
