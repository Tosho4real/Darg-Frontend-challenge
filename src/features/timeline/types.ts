export interface TimelineEvent {
  id: string
  event: string
  timestamp: string
  actorName: string
  details: string
}

export interface TimelinePage {
  events: TimelineEvent[]
  nextCursor: number | null
}
