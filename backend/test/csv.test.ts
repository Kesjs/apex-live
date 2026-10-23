import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FootballDataSource } from '../src/sources/football-data-source.ts'
import { StatsCsv, ligneDepuisCsv, memeEquipe, parseCsv } from '../src/sources/stats-csv.ts'

const ENTETE = 'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,HF,AF,HC,AC,HY,AY,HR,AR,AvgH,AvgD,AvgA,Avg>2.5,Avg<2.5'
const ligne = (date: string, d: string, e: string) => `E0,${date},15:00,${d},${e},2,1,10,12,6,4,2,3,0,1,2.00,3.40,3.80,1.90,1.95`
// 40 matchs fictifs entre « Man United » et « Wolves » pour dépasser le minimum de la moyenne de ligue.
const matchsFictifs = Array.from({ length: 40 }, (_, i) => ligne('0' + ((i % 9) + 1) + '/08/2026', i % 2 ? 'Man United' : 'Wolves', i % 2 ? 'Wolves' : 'Man United'))
const CSV = [ENTETE, ligne('10/10/2026', 'Man United', "Nott'm Forest"), ...matchsFictifs].join('\r\n')

test('CSV : lecture, cartons/corners/fautes et cotes', () => {
  const l = ligneDepuisCsv(parseCsv(CSV)[0])!
  assert.equal(l.date, '2026-10-10')
  assert.deepEqual(l.bonus, { cartons: 6, corners: 10, fautes: 22 })
  assert.equal(l.cotes['1'], 2)
  assert.equal(l.cotes['O2.5'], 1.9)
  assert.ok(Math.abs(l.cotes['1X'] - 1 / (1 / 2 + 1 / 3.4)) < 0.01)
})

test('CSV : rapprochement des noms entre les deux sources', () => {
  assert.ok(memeEquipe('Man United', 'Manchester United FC'))
  assert.ok(memeEquipe('Wolves', 'Wolverhampton Wanderers FC'))
  assert.ok(memeEquipe("Nott'm Forest", 'Nottingham Forest FC'))
  assert.ok(memeEquipe('Paris SG', 'Paris Saint-Germain FC'))
  assert.ok(memeEquipe('Ein Frankfurt', 'Eintracht Frankfurt'))
  assert.ok(!memeEquipe('Man City', 'Manchester United FC'))
  assert.ok(!memeEquipe('Real Madrid', 'Real Sociedad de Fútbol'))
})

const reponse = (corps: string, statut = 200) => new Response(corps, { status: statut })

test('StatsCsv : bonus, cotes (±1 jour), moyennes sans fuite du futur, tolérance aux pannes', async () => {
  const csv = new StatsCsv((async (url: string | URL) => (String(url).includes('/E0.csv') ? reponse(CSV) : reponse('', 404))) as never)
  await csv.chargerSaison(2026)
  assert.deepEqual(csv.bonus('Premier League', '2026-10-11', 'Manchester United FC', 'Nottingham Forest FC'), { cartons: 6, corners: 10, fautes: 22 })
  assert.equal(csv.cotes('Premier League', '2026-10-10', 'Manchester United FC', 'Nottingham Forest FC')['2'], 3.8)
  assert.equal(csv.bonus('Premier League', '2026-10-20', 'Manchester United FC', 'Nottingham Forest FC'), undefined)
  assert.equal(csv.moyennes('Premier League', '2026-10-24').cartons, 6)
  assert.deepEqual(csv.moyennes('Premier League', '2026-08-02'), {}) // trop peu de matchs avant cette date
  assert.ok(csv.erreurs.length > 0 && csv.aDesCotes)
  const vide = new StatsCsv((async () => { throw new Error('réseau') }) as never)
  await vide.chargerSaison(2026)
  assert.deepEqual(vide.moyennes('Premier League'), {})
})

test('FootballDataSource + CSV : cotes sur la rencontre, bonus dans l’historique, moyennes de ligue', async () => {
  const equipe = (id: number, name: string) => ({ id, name })
  const ancien = { id: 1, utcDate: '2026-10-10T15:00:00Z', status: 'FINISHED', competition: { code: 'PL', name: 'Premier League' }, homeTeam: equipe(66, 'Manchester United FC'), awayTeam: equipe(351, 'Nottingham Forest FC'), score: { fullTime: { home: 2, away: 1 } } }
  const aVenir = { id: 2, utcDate: '2026-10-24T15:00:00Z', status: 'TIMED', competition: { code: 'PL', name: 'Premier League' }, homeTeam: equipe(66, 'Manchester United FC'), awayTeam: equipe(351, 'Nottingham Forest FC'), score: { fullTime: { home: null, away: null } } }
  const api = (async (url: string | URL) => {
    const u = new URL(String(url))
    if (u.hostname.includes('football-data.co.uk')) {
      if (u.pathname.endsWith('/fixtures.csv')) return reponse("Div,Date,Time,HomeTeam,AwayTeam,AvgH,AvgD,AvgA\nE0,24/10/2026,15:00,Man United,Nott'm Forest,1.8,3.6,4.5")
      return u.pathname.endsWith('/E0.csv') ? reponse(CSV) : reponse('', 404)
    }
    if (u.pathname === '/v4/matches') return reponse(JSON.stringify({ matches: [u.searchParams.has('ids') ? ancien : aVenir] }))
    if (u.pathname === '/v4/competitions/PL/matches') return reponse(JSON.stringify({ matches: [ancien] }))
    return reponse(JSON.stringify({ matches: [] }))
  }) as never
  const source = new FootballDataSource('cle', api, 0, new StatsCsv(api))
  const [r] = await source.rencontres('2026-10-24')
  assert.equal(r.cotes['1'], 1.8)
  assert.equal(r.domicile.matchs[0].bonus?.corners, 10)
  assert.equal((await source.contexte('Premier League', '2026-10-24')).moy_bonus.fautes, 22)
  assert.equal(source.nomCotes, 'football-data.co.uk (moyenne des bookmakers)')
  const reel = (await source.resultats(['1'])).get('1')!
  assert.deepEqual(reel.bonus, { cartons: 6, corners: 10, fautes: 22 })
})

test('Rétro-calcul : l’historique d’un match n’inclut jamais ce match ni les suivants', async () => {
  const equipe = (id: number, name: string) => ({ id, name })
  const base = { status: 'FINISHED', competition: { code: 'PL', name: 'Premier League' }, homeTeam: equipe(66, 'Manchester United FC'), awayTeam: equipe(351, 'Nottingham Forest FC'), score: { fullTime: { home: 3, away: 0 } } }
  const avant = { ...base, id: 1, utcDate: '2026-10-03T15:00:00Z' }
  const lejour = { ...base, id: 2, utcDate: '2026-10-10T15:00:00Z' }
  const apres = { ...base, id: 3, utcDate: '2026-10-17T15:00:00Z' }
  const api = (async (url: string | URL) => {
    const u = new URL(String(url))
    if (u.pathname === '/v4/matches') return reponse(JSON.stringify({ matches: [lejour] }))
    if (u.pathname === '/v4/competitions/PL/matches') return reponse(JSON.stringify({ matches: [avant, lejour, apres] }))
    return reponse(JSON.stringify({ matches: [] }))
  }) as never
  const [r] = await new FootballDataSource('cle', api, 0).rencontres('2026-10-10')
  assert.deepEqual(r.domicile.matchs.map(m => m.date), ['2026-10-03'])
})

test('Historique toutes compétitions : un match d’Eredivisie compte dans la forme, sans être pronostiqué', async () => {
  const equipe = (id: number, name: string) => ({ id, name })
  const nl = { id: 7, utcDate: '2026-10-05T18:00:00Z', status: 'FINISHED', competition: { code: 'DED', name: 'Eredivisie' }, homeTeam: equipe(674, 'PSV'), awayTeam: equipe(675, 'Ajax'), score: { fullTime: { home: 4, away: 0 } } }
  const cl = { id: 8, utcDate: '2026-10-21T19:00:00Z', status: 'TIMED', competition: { code: 'CL', name: 'UEFA Champions League' }, homeTeam: equipe(674, 'PSV'), awayTeam: equipe(66, 'Manchester United FC'), score: { fullTime: { home: null, away: null } } }
  const eredivisie = { ...nl, id: 9, utcDate: '2026-10-21T19:00:00Z', status: 'TIMED' }
  const api = (async (url: string | URL) => {
    const u = new URL(String(url))
    if (u.pathname === '/v4/matches') return reponse(JSON.stringify({ matches: [cl, eredivisie].filter(m => u.searchParams.get('competitions')?.split(',').includes(m.competition.code)) }))
    if (u.pathname === '/v4/competitions/DED/matches') return reponse(JSON.stringify({ matches: [nl] }))
    if (u.pathname === '/v4/competitions/ELC/matches') return reponse('', 403)
    return reponse(JSON.stringify({ matches: [] }))
  }) as never
  const rencontres = await new FootballDataSource('cle', api, 0).rencontres('2026-10-21')
  assert.equal(rencontres.length, 1)
  assert.equal(rencontres[0].competition, 'UEFA Champions League')
  assert.deepEqual(rencontres[0].domicile.matchs.map(m => m.buts_pour), [4])
})
