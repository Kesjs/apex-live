import type { ApexProvider } from '../domain/contracts'
import { demoProvider } from './demo-provider'
import { httpProvider } from './http-provider'

/**
 * Choix de la source de données.
 *   VITE_DATA_SOURCE=demo -> données de démonstration explicites pour le développement
 *   sinon                 -> ton back-end réel
 */
export const provider: ApexProvider = import.meta.env.VITE_DATA_SOURCE === 'demo' ? demoProvider : httpProvider
