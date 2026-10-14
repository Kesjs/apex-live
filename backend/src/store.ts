import { DatabaseSync } from 'node:sqlite'
import type { NewsArticle, Prediction, ResultatFiche } from '../../src/domain/contracts.ts'
import type { Interne } from './types.ts'

export interface LigneAEvaluer {
  match_id: string
  date_heure: string
  fiche: Prediction
  interne: Interne | null
}

/** Ce dont le moteur a besoin pour stocker les fiches. Deux versions : SQLite (fichier local) et Supabase. */
export interface Stockage {
  /** Ajoute ou rafraîchit une fiche, sauf si elle a déjà été évaluée. */
  enregistrer(jour: string, fiche: Prediction, interne: Interne | null): Promise<void>
  parJour(jour: string): Promise<Prediction[]>
  parId(id: string): Promise<Prediction | null>
  /** Fiches pas encore évaluées dont le coup d'envoi est avant `avantIso`. */
  aEvaluer(avantIso: string): Promise<LigneAEvaluer[]>
  marquerEvalue(id: string, resultat: ResultatFiche): Promise<void>
  /** Fiches évaluées depuis un jour donné (AAAA-MM-JJ), les plus récentes d'abord. */
  evaluees(depuisJour: string): Promise<Array<{ jour: string; fiche: Prediction }>>
  enregistrerActualites(articles: NewsArticle[]): Promise<void>
  actualites(categorie?: NewsArticle['categorie']): Promise<NewsArticle[]>
  fermer(): Promise<void>
}

/** Stockage SQLite (un fichier). */
export class Store implements Stockage {
  private db: DatabaseSync
  constructor(chemin = ':memory:') {
    this.db = new DatabaseSync(chemin)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fiches (
        match_id   TEXT PRIMARY KEY,
        jour       TEXT NOT NULL,
        date_heure TEXT NOT NULL,
        fiche      TEXT NOT NULL,
        interne    TEXT,
        evalue     INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_fiches_jour ON fiches(jour);
      CREATE TABLE IF NOT EXISTS actualites (
        id TEXT PRIMARY KEY,
        categorie TEXT NOT NULL,
        article TEXT NOT NULL,
        publie_le TEXT NOT NULL,
        maj_le TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_actualites_date ON actualites(publie_le DESC);
    `)
  }

  async enregistrer(jour: string, fiche: Prediction, interne: Interne | null): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO fiches (match_id, jour, date_heure, fiche, interne) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(match_id) DO UPDATE SET jour=excluded.jour, date_heure=excluded.date_heure, fiche=excluded.fiche, interne=excluded.interne
         WHERE fiches.evalue = 0`,
      )
      .run(fiche.match_id, jour, fiche.date_heure, JSON.stringify(fiche), interne ? JSON.stringify(interne) : null)
  }

  async parJour(jour: string): Promise<Prediction[]> {
    const lignes = this.db.prepare('SELECT fiche FROM fiches WHERE jour = ? ORDER BY date_heure, match_id').all(jour) as Array<{ fiche: string }>
    return lignes.map(l => JSON.parse(l.fiche) as Prediction)
  }

  async parId(id: string): Promise<Prediction | null> {
    const l = this.db.prepare('SELECT fiche FROM fiches WHERE match_id = ?').get(id) as { fiche: string } | undefined
    return l ? (JSON.parse(l.fiche) as Prediction) : null
  }

  async aEvaluer(avantIso: string): Promise<LigneAEvaluer[]> {
    const lignes = this.db
      .prepare('SELECT match_id, date_heure, fiche, interne FROM fiches WHERE evalue = 0 AND date_heure < ? ORDER BY date_heure')
      .all(avantIso) as Array<{ match_id: string; date_heure: string; fiche: string; interne: string | null }>
    return lignes.map(l => ({
      match_id: l.match_id,
      date_heure: l.date_heure,
      fiche: JSON.parse(l.fiche) as Prediction,
      interne: l.interne ? (JSON.parse(l.interne) as Interne) : null,
    }))
  }

  async marquerEvalue(id: string, resultat: ResultatFiche): Promise<void> {
    const fiche = await this.parId(id)
    if (!fiche) return
    fiche.resultat = resultat
    this.db.prepare('UPDATE fiches SET fiche = ?, evalue = 1 WHERE match_id = ?').run(JSON.stringify(fiche), id)
  }

  async evaluees(depuisJour: string): Promise<Array<{ jour: string; fiche: Prediction }>> {
    const lignes = this.db
      .prepare('SELECT jour, fiche FROM fiches WHERE evalue = 1 AND jour >= ? ORDER BY jour DESC, date_heure DESC')
      .all(depuisJour) as Array<{ jour: string; fiche: string }>
    return lignes.map(l => ({ jour: l.jour, fiche: JSON.parse(l.fiche) as Prediction }))
  }

  async enregistrerActualites(articles: NewsArticle[]): Promise<void> {
    const statement = this.db.prepare(`INSERT INTO actualites (id, categorie, article, publie_le, maj_le)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET categorie=excluded.categorie, article=excluded.article, publie_le=excluded.publie_le, maj_le=CURRENT_TIMESTAMP`)
    for (const article of articles) statement.run(article.id, article.categorie, JSON.stringify(article), article.publie_le)
  }

  async actualites(categorie?: NewsArticle['categorie']): Promise<NewsArticle[]> {
    const rows = categorie
      ? this.db.prepare('SELECT article FROM actualites WHERE categorie = ? ORDER BY publie_le DESC LIMIT 50').all(categorie) as Array<{ article: string }>
      : this.db.prepare('SELECT article FROM actualites ORDER BY publie_le DESC LIMIT 50').all() as Array<{ article: string }>
    return rows.map(row => JSON.parse(row.article) as NewsArticle)
  }

  async fermer(): Promise<void> {
    this.db.close()
  }
}
