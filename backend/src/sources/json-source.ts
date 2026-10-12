import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Contexte, Rencontre, ResultatReel, Source } from '../types.ts'

/**
 * Source par fichiers JSON : tu déposes les données (exportées de n'importe quel fournisseur)
 * dans un dossier, le moteur les lit. Pratique pour brancher une vraie source sans changer le moteur.
 *
 *   <dossier>/rencontres/AAAA-MM-JJ.json   { "rencontres": [ Rencontre, … ] }
 *   <dossier>/contextes.json               { "<competition>": Contexte, … }
 *   <dossier>/resultats.json               { "<match_id>": ResultatReel, … }
 *
 * Les formes exactes sont dans backend/src/types.ts.
 */
async function lire<T>(chemin: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(chemin, 'utf8')) as T
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw new Error('Fichier illisible : ' + chemin + ' (' + (e as Error).message + ')')
  }
}

export class JsonSource implements Source {
  readonly nom: string
  readonly nomCotes: string
  private dossier: string
  constructor(dossier: string, nom = 'fichiers JSON', nomCotes = 'fichiers JSON') {
    this.dossier = dossier
    this.nom = nom
    this.nomCotes = nomCotes
  }
  async rencontres(jour: string): Promise<Rencontre[]> {
    return (await lire<{ rencontres: Rencontre[] }>(join(this.dossier, 'rencontres', jour + '.json')))?.rencontres ?? []
  }
  async contexte(competition: string): Promise<Contexte> {
    const tous = await lire<Record<string, Contexte>>(join(this.dossier, 'contextes.json'))
    const c = tous?.[competition]
    if (!c) throw new Error('Contexte manquant pour la compétition « ' + competition + ' » dans contextes.json')
    return c
  }
  async resultat(matchId: string): Promise<ResultatReel | null> {
    return (await lire<Record<string, ResultatReel>>(join(this.dossier, 'resultats.json')))?.[matchId] ?? null
  }
}
