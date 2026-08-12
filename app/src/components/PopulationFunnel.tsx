import { useId } from 'react'
import { formatCount, type ModelResult } from '../engine/modelEngine'

const PERSON_COUNT = 24

export function PopulationFunnel({ result }: { result: ModelResult }) {
  const captionId = useId()
  const ratio = result.population.base > 0
    ? Math.max(0, Math.min(1, result.population.estimate / result.population.base))
    : 0
  const visible = result.population.estimate > 0 ? Math.max(1, Math.round(ratio * PERSON_COUNT)) : 0

  return (
    <figure className="population-funnel" aria-labelledby={captionId}>
      <div aria-hidden="true" className="people-grid">
        {Array.from({ length: PERSON_COUNT }, (_, index) => (
          <span data-state={index < visible ? 'remaining' : 'filtered'} key={index} />
        ))}
      </div>
      <figcaption id={captionId}>
        <span>{formatCount(result.population.base)} 的基础范围</span>
        <span aria-hidden="true">→</span>
        <b>{formatCount(result.population.estimate)} 满足硬条件</b>
      </figcaption>
    </figure>
  )
}
