import type { Prediction } from '../../../src/domain/contracts.ts'

/**
 * La synthèse est du texte, rien d'autre. Les chiffres viennent du moteur ; l'IA
 * (Gemini Flash) ne fait que les mettre en phrases. Si elle invente un chiffre ou
 * échoue, on retombe sur un texte généré sans IA.
 */

const pct = (p: number): string => Math.round(p * 100) + ' %'

export function syntheseModele(f: Prediction): string {
  const p = f.pronostics
  if (!p) return ''
  const { domicile, exterieur } = f.equipes
  const phrases = [
    'Pour ' + domicile + ' – ' + exterieur + ', le modèle retient ' + p.issue.selection.replace(/^\S+ · /, '') + ' (' + pct(p.issue.probabilite) + ').',
    p.buts.selection + ' ressort à ' + pct(p.buts.probabilite) + (p.buts.frequence ? ' (' + p.buts.frequence + ').' : '.'),
  ]
  if (p.bonus) phrases.push('Côté bonus, le signal le plus net concerne les ' + p.bonus.categorie + ' : ' + p.bonus.justification.charAt(0).toLowerCase() + p.bonus.justification.slice(1))
  else phrases.push('Aucun signal assez net pour proposer un bonus sur ce match.')
  return phrases.join(' ')
}

function nombres(texte: string): string[] {
  return (texte.match(/\d+(?:[.,]\d+)?/g) ?? []).map(n => n.replace(',', '.'))
}

/** Les chiffres autorisés = ceux qui figurent dans la fiche (probabilités en %, cotes, lignes, moyennes…). */
export function chiffresAutorises(f: Prediction): Set<string> {
  const p = f.pronostics
  const permis = new Set<string>()
  if (!p) return permis
  const ajouter = (t: string | number | undefined) => nombres(String(t ?? '')).forEach(n => permis.add(n))
  for (const bloc of [p.issue, p.buts]) {
    ajouter(bloc.selection)
    ajouter(Math.round(bloc.probabilite * 100))
    ajouter(bloc.cote)
    ajouter(bloc.justification)
    ajouter((bloc as { frequence?: string }).frequence)
  }
  if (p.bonus) {
    ajouter(p.bonus.selection)
    ajouter(p.bonus.justification)
    ajouter(p.bonus.valeur_observee)
    ajouter(p.bonus.moyenne_ligue)
    ajouter(p.bonus.cote)
  }
  p.scores.forEach(s => {
    ajouter(s.score)
    ajouter(Math.round(s.probabilite * 100))
  })
  ;[f.forme?.domicile, f.forme?.exterieur].forEach(l => l && ajouter(l.filter(x => x === 'V').length))
  return permis
}

export function valider(texte: string, f: Prediction): boolean {
  const t = texte.trim()
  if (t.length < 40 || t.length > 650) return false
  const phrases = t.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (phrases.length < 2 || phrases.length > 4) return false
  if (/garanti|certain|sûr à 100|ne peut pas perdre/i.test(t)) return false
  const permis = chiffresAutorises(f)
  return nombres(t).every(n => permis.has(n))
}

type Fetch = typeof fetch

export async function syntheseGemini(f: Prediction, opts: { cle: string; modele: string; fetchImpl?: Fetch }): Promise<string | null> {
  const p = f.pronostics
  if (!p) return null
  const faits = {
    match: f.equipes.domicile + ' - ' + f.equipes.exterieur,
    competition: f.competition,
    issue: { choix: p.issue.selection, probabilite_pct: Math.round(p.issue.probabilite * 100), justification: p.issue.justification },
    buts: { choix: p.buts.selection, probabilite_pct: Math.round(p.buts.probabilite * 100), frequence: p.buts.frequence },
    bonus: p.bonus ? { choix: p.bonus.selection, justification: p.bonus.justification } : null,
    scores: p.scores.map(s => s.score),
    forme_domicile: f.forme?.domicile.join(' '),
    forme_exterieur: f.forme?.exterieur.join(' '),
  }
  const consigne =
    'Tu rédiges la synthèse d\'une fiche de pronostic football, en français, en 2 ou 3 phrases courtes, ton neutre et factuel. ' +
    'Utilise UNIQUEMENT les faits fournis ci-dessous : n\'invente aucun chiffre, aucune statistique, aucune blessure ni information extérieure. ' +
    'Ne promets rien (pas de « certain », « garanti »). Réponds par le texte seul, sans titre ni liste.\n\nFaits :\n' +
    JSON.stringify(faits)
  const appel = opts.fetchImpl ?? fetch
  const r = await appel('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(opts.modele) + ':generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.cle },
    body: JSON.stringify({ contents: [{ parts: [{ text: consigne }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 300 } }),
  })
  if (!r.ok) return null
  const data = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

/** Texte final : Gemini si une clé est fournie et que la réponse est valide, sinon le texte du modèle. */
export async function produireSynthese(f: Prediction, env: Record<string, string | undefined>, fetchImpl?: Fetch): Promise<string> {
  const cle = env.GEMINI_API_KEY
  if (cle) {
    try {
      const texte = await syntheseGemini(f, { cle, modele: env.GEMINI_MODEL || 'gemini-2.5-flash', fetchImpl })
      if (texte && valider(texte, f)) return texte.trim()
    } catch {
      /* repli ci-dessous */
    }
  }
  return syntheseModele(f)
}
