import type { ApexProvider } from '../domain/contracts'
import { demoProvider } from './demo-provider'
import { httpProvider } from './http-provider'

/**
 * Choix de la source de données.
 *   VITE_DATA_SOURCE=api  -> ton back-end (voir .env.example)
 *   sinon                 -> données de démonstration
 */
export const provider: ApexProvider = import.meta.env.VITE_DATA_SOURCE === 'api' ? httpProvider : demoProvider
