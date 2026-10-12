import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SupabaseStore } from '../src/supabase-store.ts'
import type { Prediction } from '../../src/domain/contracts.ts'

const fiche = { match_id: 'm1', date_heure: '2026-10-12T17:00:00Z', competition: 'T', equipes: { domicile: 'A', exterieur: 'B' }, pronostics: null, meta: {}, resultat: { statut: 'non_evalue' } } as unknown as Prediction

function faux(reponses: Array<{ status?: number; corps: unknown }>) {
  const appels: Array<{ url: string; init: RequestInit }> = []
  const f = (async (url: string, init: RequestInit) => {
    appels.push({ url, init })
    const r = reponses.shift() ?? { corps: [] }
    return new Response(JSON.stringify(r.corps), { status: r.status ?? 200 })
  }) as unknown as typeof fetch
  return { f, appels }
}

test('Supabase : enregistrer passe par la fonction SQL qui protège les fiches évaluées', async () => {
  const { f, appels } = faux([{ corps: null }])
  await new SupabaseStore('https://x.supabase.co/', 'sb_secret_abc', f).enregistrer('2026-10-12', fiche, null)
  assert.equal(appels[0].url, 'https://x.supabase.co/rest/v1/rpc/enregistrer_fiche')
  assert.equal(appels[0].init.method, 'POST')
  const body = JSON.parse(appels[0].init.body as string)
  assert.equal(body.p_match_id, 'm1')
  assert.equal(body.p_jour, '2026-10-12')
  const h = appels[0].init.headers as Record<string, string>
  assert.equal(h.apikey, 'sb_secret_abc')
  assert.equal(h.authorization, undefined) // nouvelles clés : pas de Bearer
})

test('Supabase : anciennes clés (JWT) envoyées aussi en Authorization', async () => {
  const { f, appels } = faux([{ corps: [] }])
  await new SupabaseStore('https://x.supabase.co', 'eyJabc', f).parJour('2026-10-12')
  assert.equal((appels[0].init.headers as Record<string, string>).authorization, 'Bearer eyJabc')
})

test('Supabase : lecture par jour, par id, absent → null', async () => {
  const { f, appels } = faux([{ corps: [{ fiche }] }, { corps: [{ fiche }] }, { corps: [] }])
  const s = new SupabaseStore('https://x.supabase.co', 'k', f)
  assert.equal((await s.parJour('2026-10-12')).length, 1)
  assert.match(appels[0].url, /\/fiches\?select=fiche&jour=eq\.2026-10-12&order=date_heure\.asc,match_id\.asc$/)
  assert.equal((await s.parId('m1'))?.match_id, 'm1')
  assert.equal(await s.parId('inconnu'), null)
})

test('Supabase : plus de 1000 lignes → lecture par tranches', async () => {
  const ligne = { jour: '2026-10-01', fiche }
  const { f, appels } = faux([{ corps: Array(1000).fill(ligne) }, { corps: Array(250).fill(ligne) }])
  const r = await new SupabaseStore('https://x.supabase.co', 'k', f).evaluees('2026-09-01')
  assert.equal(r.length, 1250)
  assert.equal(appels.length, 2)
  assert.equal((appels[1].init.headers as Record<string, string>).range, '1000-1999')
})

test('Supabase : une erreur du serveur remonte avec un message clair', async () => {
  const { f } = faux([{ status: 401, corps: { message: 'Invalid API key' } }])
  await assert.rejects(new SupabaseStore('https://x.supabase.co', 'k', f).parJour('2026-10-12'), /Supabase 401 sur \/fiches/)
})

test('Supabase : marquer évalué met à jour la fiche et le drapeau', async () => {
  const { f, appels } = faux([{ corps: [{ fiche }] }, { corps: null }])
  await new SupabaseStore('https://x.supabase.co', 'k', f).marquerEvalue('m1', { statut: 'evalue', issue: true, buts: false, bonus: null, score: false, score_final: '2-1' })
  assert.equal(appels[1].init.method, 'PATCH')
  const body = JSON.parse(appels[1].init.body as string)
  assert.equal(body.evalue, true)
  assert.equal(body.fiche.resultat.score_final, '2-1')
})
