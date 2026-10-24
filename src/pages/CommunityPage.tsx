import { useState } from 'react'
import { Icon } from '../components/Icon'

type Post = { author: string; initials: string; time: string; title: string; body: string; image?: string; likes: number; comments: number; kind: string }

const POSTS: Post[] = [
  { author: 'LéoM', initials: 'LM', time: 'il y a 2 h', kind: 'Opinion membre', title: 'Un bon coup à jouer sur Lyon ce week-end', body: "Je trouve que l’OL arrive avec des signaux intéressants. Le jeu est plus fluide, on sent une vraie progression dans les enchaînements.", image: '/apex-kenken/tribunes.webp', likes: 42, comments: 17 },
  { author: 'CamilleF', initials: 'CF', time: 'il y a 4 h', kind: 'Coupon partagé', title: 'Mon coupon du soir', body: 'Petite sélection pour ce soir, raisonnable comme d’hab. Vous en pensez quoi ?', image: '/apex-kenken/stade.webp', likes: 28, comments: 9 },
]

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  return <article className="community-post card">
    <header className="community-post-head"><span className="community-avatar">{post.initials}</span><div><strong>{post.author}</strong><span className="muted small">{post.time}</span></div><span className="community-kind">{post.kind}</span><button className="icon-btn community-more" aria-label="Plus d’options"><Icon name="down" size={17} /></button></header>
    <h2>{post.title}</h2><p>{post.body}</p>
    {post.image && <img className="community-post-image" src={post.image} alt="Illustration de la publication" />}
    <footer className="community-post-actions"><button type="button" className={liked ? 'is-liked' : ''} onClick={() => setLiked(v => !v)}><Icon name="star" size={18} filled={liked} /> {post.likes + (liked ? 1 : 0)}</button><button type="button"><Icon name="card" size={18} /> {post.comments}</button><button type="button" className="community-save"><Icon name="check" size={18} /> Enregistrer</button></footer>
  </article>
}

export default function CommunityPage() {
  const [onglet, setOnglet] = useState<'fil' | 'discussion'>('fil')
  const [posts, setPosts] = useState(POSTS)
  const [draft, setDraft] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const publier = () => {
    const body = draft.trim()
    if (!body) return
    setPosts(current => [{ author: 'Vous', initials: 'VO', time: 'à l’instant', kind: 'Discussion', title: 'Nouvelle publication', body, likes: 0, comments: 0 }, ...current])
    setDraft('')
    setComposerOpen(false)
    setOnglet('fil')
  }
  return <div className="page-body community-page">
    <header className="community-heading"><div><p className="kicker">Apex</p><h1>Communauté</h1><p className="muted">Analyses, échanges et coupons partagés par les membres.</p></div><button className="icon-btn" aria-label="Rechercher dans la communauté"><Icon name="search" size={20} /></button></header>
    <div className="community-tabs" role="tablist"><button className={onglet === 'fil' ? 'is-active' : ''} onClick={() => setOnglet('fil')} role="tab" aria-selected={onglet === 'fil'}>Pour toi</button><button className={onglet === 'discussion' ? 'is-active' : ''} onClick={() => setOnglet('discussion')} role="tab" aria-selected={onglet === 'discussion'}><Icon name="card" size={16} /> Discussion</button><button role="tab" aria-selected="false">Récent</button></div>
    <section className="community-composer card"><span className="community-avatar">VO</span><button type="button" className="community-composer-input" onClick={() => setComposerOpen(true)}>Écrire dans la communauté <Icon name="card" size={19} /></button></section>
    {composerOpen && <section className="community-write card"><div className="community-write-head"><strong>Nouvelle discussion</strong><button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setComposerOpen(false)}>×</button></div><textarea autoFocus value={draft} onChange={event => setDraft(event.target.value)} placeholder="Partage ton analyse, ton coupon ou ton avis…" maxLength={1000} /><div className="community-write-foot"><span className="muted small">{draft.length}/1000</span><button type="button" className="primary-btn" onClick={publier} disabled={!draft.trim()}>Publier</button></div></section>}
    {onglet === 'discussion' && <section className="community-discussion card"><span className="community-avatar">TH</span><div><strong>Discussion générale</strong><span className="muted small"> Les membres parlent de tous les matchs</span><p>Quel match vous inspire le plus ce week-end ? Partagez vos lectures et vos arguments.</p><div className="community-replies"><span>12 réactions</span><span>5 commentaires</span><button type="button" onClick={() => setComposerOpen(true)}>Répondre</button></div></div></section>}
    <div className="community-feed">{posts.map((post, index) => <PostCard key={`${post.author}-${index}`} post={post} />)}</div>
  </div>
}
