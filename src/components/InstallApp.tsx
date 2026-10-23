import { useEffect, useState } from 'react'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let pendingInstall: InstallEvent | null = null
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  pendingInstall = event as InstallEvent
})
window.addEventListener('appinstalled', () => { pendingInstall = null })

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(pendingInstall)
  const [installed, setInstalled] = useState(false)
  const [error, setError] = useState(false)
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const update = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent) }
    const done = () => { setInstalled(true); setPrompt(null) }
    update()
    window.addEventListener('beforeinstallprompt', ready)
    window.addEventListener('appinstalled', done)
    media.addEventListener('change', update)
    return () => {
      window.removeEventListener('beforeinstallprompt', ready)
      window.removeEventListener('appinstalled', done)
      media.removeEventListener('change', update)
    }
  }, [])

  async function install() {
    if (!prompt) return
    setError(false)
    try {
      await prompt.prompt()
      await prompt.userChoice
    } catch { setError(true) }
    setPrompt(null)
    pendingInstall = null
  }

  return <section className="stack-sm" aria-labelledby="installation">
    <h2 id="installation">Installer Apex</h2>
    <div className="card state compact">
      {installed ? <p>Apex est ouvert en mode application.</p> : <>
        <p>Retrouvez Apex depuis votre écran d’accueil, dans sa propre fenêtre.</p>
        {prompt ? <button type="button" className="btn btn-secondary" onClick={() => void install()}>Installer Apex</button>
          : <p className="muted">{ios ? 'Dans Safari, ouvrez le menu Partager, puis « Sur l’écran d’accueil » et « Ajouter ».' : 'Ouvrez le menu de votre navigateur et choisissez « Installer Apex » ou « Installer cette application », si cette option est proposée.'}</p>}
        {error && <p role="status">L’installation n’a pas pu démarrer. Réessayez depuis le menu du navigateur.</p>}
      </>}
    </div>
  </section>
}
