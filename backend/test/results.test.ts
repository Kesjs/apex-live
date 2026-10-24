import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Store } from '../src/store.ts'
import { evaluerTermines } from '../src/evaluate.ts'
import type { Prediction } from '../../src/domain/contracts.ts'
import type { Source, ResultatReel } from '../src/types.ts'
import { matchStatus } from '../../src/lib/match-status.ts'

const fiche = {match_id:'score-test', date_heure:'2026-10-23T18:30:00Z', equipes:{domicile:'A',exterieur:'B'}, resultat:{statut:'non_evalue',issue:null,buts:null,bonus:null,score:null}} as Prediction

test('Un score final est publié sans attendre le bonus puis le bonus est complété sans recalculer le pronostic', async () => {
 const store = new Store()
 const interne = {issue:'1',buts:'O1.5',scores:['2-0'],bonus:{categorie:'cartons' as const,ligne:3.5}}
 await store.enregistrer('2026-10-23',fiche,interne)
 let reel:ResultatReel={match_id:fiche.match_id,statut:'termine',score_domicile:2,score_exterieur:0}
 const source:Source={nom:'test',nomCotes:'aucune',rencontres:async()=>[],contexte:async()=>{throw new Error('Aucun recalcul attendu')},resultat:async()=>reel,resultats:async()=>new Map([[fiche.match_id,reel]])}
 const now=new Date('2026-10-24T04:00:00Z')
 try {
  assert.equal(await evaluerTermines(store,source,now),1)
  const saved=await store.parId(fiche.match_id)
  assert.equal(saved?.resultat.score_final,'2-0')
  assert.equal(saved?.resultat.issue,true)
  assert.equal(saved?.resultat.bonus,null)
  assert.equal(saved?.resultat.bonus_en_attente,true)
  assert.equal((await store.evaluees('2026-10-23')).length,1)
  reel={...reel,bonus:{cartons:5}}
  assert.equal(await evaluerTermines(store,source,now),1)
  assert.equal((await store.parId(fiche.match_id))?.resultat.bonus,true)
  assert.equal((await store.aEvaluer(now.toISOString())).length,0)
 } finally { await store.fermer() }
})

test('Un match passé sans confirmation ne devient ni imminent ni terminé ; un 0-0 reste un score final',()=>{
 assert.equal(matchStatus(fiche,Date.parse('2026-10-24T04:00:00Z')).label,'Résultat indisponible')
 assert.equal(matchStatus(fiche,Date.parse('2026-10-23T17:00:00Z')).label,'À venir')
 assert.equal(matchStatus({...fiche,resultat:{...fiche.resultat,statut:'annule'}}).label,'Annulé ou reporté')
 assert.equal(matchStatus({...fiche,resultat:{...fiche.resultat,score_final:'0-0'}}).score,'0-0')
})
