import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGeminiContents,
  buildSystemInstruction,
  candidateModelsList,
  extractGeminiText,
  streamApexChat,
  type ChatStreamEvent,
} from '../../api/_lib/chat-engine.ts'

test('Chat IA : systemInstruction naturel sans forçage d’angle Libre/Général', () => {
  const free = buildSystemInstruction({ prompt: 'Salut !', tab: 'Libre' })
  assert.match(free, /Salutation, remerciement ou phrase brève/)
  assert.doesNotMatch(free, /Angle suggéré/i)
  assert.doesNotMatch(free, /Préférence d'angle/)

  const matchSys = buildSystemInstruction({
    prompt: 'Analyse ce match',
    tab: 'Tactique',
    match: {
      domicile: 'PSG',
      exterieur: 'OM',
      competition: 'Ligue 1',
      buts_attendus: { domicile: 2.15, exterieur: 1.05 },
    },
  })
  assert.match(matchSys, /Préférence d'angle pour une question d'analyse : Tactique/)
  assert.match(matchSys, /PSG \(Domicile\) vs OM \(Extérieur\)/)
  assert.match(matchSys, /2\.15 - 1\.05/)
})

test('Chat IA : buildGeminiContents produit des tours alternés finissant par user', () => {
  const turns = buildGeminiContents(
    [
      { role: 'assistant', text: 'Ignoré au début' },
      { role: 'user', text: 'Salut' },
      { role: 'assistant', text: 'Bonjour !' },
      { role: 'user', text: 'Dernier brouillon' },
    ],
    'Combien font 2+2 ?',
  )
  assert.deepEqual(
    turns.map(t => t.role),
    ['user', 'model', 'user'],
  )
  assert.equal(turns[0].parts[0].text, 'Salut')
  assert.equal(turns[1].parts[0].text, 'Bonjour !')
  assert.equal(turns[2].parts[0].text, 'Combien font 2+2 ?')
})

test('Chat IA : extractGeminiText ignore les fragments de réflexion interne (thought)', () => {
  const out = extractGeminiText({
    candidates: [
      {
        content: {
          parts: [
            { text: 'Je réfléchis étape par étape...', thought: true },
            { text: 'Salut ! ' },
            { text: 'Comment ça va ?' },
          ],
        },
      },
    ],
  })
  assert.equal(out, 'Salut ! Comment ça va ?')
})

test('Chat IA : candidateModelsList déduplique sans inclure gemini-2.5-* déprécié', () => {
  const list = candidateModelsList('gemini-3.5-flash-lite')
  assert.equal(list[0], 'gemini-3.5-flash-lite')
  assert.equal(new Set(list).size, list.length)
  assert.ok(list.every(m => !m.includes('2.5')))
})

test('Chat IA : streamApexChat bascule au modèle suivant sur 503 puis streame les deltas SSE', async () => {
  let callCount = 0
  const fakeFetch = (async () => {
    callCount++
    if (callCount === 1) {
      return new Response('{"error":{"code":503}}', { status: 503 })
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"Ça "}]}}]}\n'))
        controller.enqueue(encoder.encode('data: {"candidates":[{"content":{"parts":[{"text":"fait 4 !"}]}}]}\n'))
        controller.close()
      },
    })
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
  }) as unknown as typeof fetch

  const events: ChatStreamEvent[] = []
  const res = await streamApexChat(
    { prompt: 'Combien font 2+2 ?' },
    { apiKey: 'test-key', preferredModel: 'gemini-3.8-flash', fetchImpl: fakeFetch },
    ev => events.push(ev),
  )

  assert.equal(res.ok, true)
  if (res.ok) {
    assert.equal(res.model, 'gemini-3.5-flash-lite')
    assert.equal(res.text, 'Ça fait 4 !')
  }
  assert.equal(events[0].type, 'start')
  assert.deepEqual(
    events.filter(e => e.type === 'delta').map(e => e.text),
    ['Ça ', 'fait 4 !'],
  )
  assert.equal(events[events.length - 1].type, 'done')
})
