import { Skeleton } from './ui'

export function FeaturedSkeleton() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <Skeleton className="sk-line" style={{ width: '40%' }} />
      <div className="sk-teams">
        <Skeleton className="sk-circle" />
        <Skeleton className="sk-line" style={{ width: 40 }} />
        <Skeleton className="sk-circle" />
      </div>
      <div className="sk-tiles">
        <Skeleton className="sk-tile" />
        <Skeleton className="sk-tile" />
      </div>
      <Skeleton className="sk-btn" />
    </div>
  )
}

export function ListSkeleton({ lignes = 4 }: { lignes?: number }) {
  return (
    <div className="card" aria-hidden="true">
      {Array.from({ length: lignes }, (_, i) => (
        <div className="sk-row" key={i}>
          <Skeleton className="sk-line" style={{ width: 40 }} />
          <div className="sk-col">
            <Skeleton className="sk-line" style={{ width: '55%' }} />
            <Skeleton className="sk-line" style={{ width: '40%' }} />
          </div>
          <Skeleton className="sk-chip" />
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="stack" aria-hidden="true">
      <FeaturedSkeleton />
      <Skeleton className="sk-block" />
      <Skeleton className="sk-block" />
      <Skeleton className="sk-block" />
    </div>
  )
}
