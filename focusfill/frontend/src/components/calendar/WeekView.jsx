import React, { useMemo } from 'react'
import EventBlock from './EventBlock'
import SuggestionBlock from './SuggestionBlock'

const DAY_START_HOUR = 6   // 6 AM
const DAY_END_HOUR   = 22  // 10 PM
const HOUR_HEIGHT    = 60  // px per hour
const TOTAL_HOURS    = DAY_END_HOUR - DAY_START_HOUR
const TOTAL_HEIGHT   = TOTAL_HOURS * HOUR_HEIGHT

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START_HOUR + i)
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function getEventStyle(startTime, endTime) {
  const start = new Date(startTime)
  const end   = new Date(endTime)
  const startMins = start.getHours() * 60 + start.getMinutes()
  const endMins   = end.getHours()   * 60 + end.getMinutes()
  const top    = (startMins - DAY_START_HOUR * 60) * (HOUR_HEIGHT / 60)
  const height = Math.max((endMins - startMins) * (HOUR_HEIGHT / 60), 18)
  return {
    position: 'absolute',
    top:    `${top}px`,
    height: `${height}px`,
    left:   '2px',
    right:  '2px',
  }
}

function isSameDay(dt, date) {
  const d = new Date(dt)
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth()    === date.getMonth() &&
    d.getDate()     === date.getDate()
  )
}

function isToday(date) {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth() &&
    date.getDate()     === now.getDate()
  )
}

function fmtDayLabel(date) {
  return date.getDate()
}

function getMinutes(dtStr) {
  const d = new Date(dtStr)
  return d.getHours() * 60 + d.getMinutes()
}

function buildSuggestionLanes(daySuggestions) {
  const withTimes = daySuggestions
    .filter(s => s?.time_block?.start_time && s?.time_block?.end_time)
    .map(s => ({
      suggestion: s,
      start: getMinutes(s.time_block.start_time),
      end: getMinutes(s.time_block.end_time),
    }))
    .sort((a, b) => (a.start - b.start) || (a.end - b.end))

  const styleBySuggestionId = {}
  if (withTimes.length === 0) return styleBySuggestionId

  const clusters = []
  let current = []
  let currentClusterEnd = -1

  withTimes.forEach(item => {
    if (current.length === 0 || item.start < currentClusterEnd) {
      current.push(item)
      currentClusterEnd = Math.max(currentClusterEnd, item.end)
      return
    }
    clusters.push(current)
    current = [item]
    currentClusterEnd = item.end
  })
  if (current.length > 0) clusters.push(current)

  clusters.forEach(cluster => {
    const active = [] // { end, lane }
    const laneAssignments = [] // { suggestionId, lane }
    let maxLane = -1

    cluster.forEach(item => {
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].end <= item.start) active.splice(i, 1)
      }

      const used = new Set(active.map(a => a.lane))
      let lane = 0
      while (used.has(lane)) lane += 1

      active.push({ end: item.end, lane })
      laneAssignments.push({ suggestionId: item.suggestion.id, lane })
      maxLane = Math.max(maxLane, lane)
    })

    const laneCount = maxLane + 1
    laneAssignments.forEach(x => {
      styleBySuggestionId[x.suggestionId] = { lane: x.lane, laneCount }
    })
  })

  return styleBySuggestionId
}

export default function WeekView({
  events = [],
  suggestions = [],
  selectedId,
  selectedType,
  onSelectEvent,
  onSelectSuggestion,
  onAccept,
  onReject,
  weekStart,
  showSuggestions = true,
}) {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])

  // Now-indicator position
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const nowTop  = (nowMins - DAY_START_HOUR * 60) * (HOUR_HEIGHT / 60)
  const todayIdx = weekDates.findIndex(d => isToday(d))

  // Group events / suggestions by day index
  const eventsByDay = useMemo(() => {
    const map = {}
    for (let i = 0; i < 7; i++) map[i] = []
    events.forEach(ev => {
      const idx = weekDates.findIndex(d => isSameDay(ev.start_time, d))
      if (idx >= 0) map[idx].push(ev)
    })
    return map
  }, [events, weekDates])

  const suggsByDay = useMemo(() => {
    const map = {}
    for (let i = 0; i < 7; i++) map[i] = []
    if (!showSuggestions) return map

    // Per time block: show accepted if any, otherwise only the top-scored pending one
    const blockBest = {}
    suggestions.forEach(s => {
      if (s.status === 'rejected') return
      const blockId = s.time_block?.id
      if (!blockId) return
      const cur = blockBest[blockId]
      if (!cur) {
        blockBest[blockId] = s
      } else if (s.status === 'accepted') {
        blockBest[blockId] = s
      } else if (cur.status !== 'accepted' && (s.score || 0) > (cur.score || 0)) {
        blockBest[blockId] = s
      }
    })

    Object.values(blockBest).forEach(s => {
      const startTime = s.time_block?.start_time
      if (!startTime) return
      const idx = weekDates.findIndex(d => isSameDay(startTime, d))
      if (idx >= 0) map[idx].push(s)
    })
    return map
  }, [suggestions, weekDates, showSuggestions])

  const suggLaneByDay = useMemo(() => {
    const map = {}
    for (let i = 0; i < 7; i++) {
      map[i] = buildSuggestionLanes(suggsByDay[i] || [])
    }
    return map
  }, [suggsByDay])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day header row */}
      <div className="flex border-b border-stone-200 bg-white sticky top-0 z-20" style={{ paddingLeft: '48px' }}>
        {weekDates.map((date, i) => (
          <div
            key={i}
            className={`flex-1 text-center py-2 border-l border-stone-100 first:border-l-0
              ${isToday(date) ? 'bg-stone-50' : ''}
            `}
          >
            <div className="text-xs text-stone-500 font-medium">{DAYS[i]}</div>
            <div className={`text-sm font-semibold mt-0.5 w-7 h-7 rounded-full mx-auto flex items-center justify-center
              ${isToday(date) ? 'bg-stone-800 text-white' : 'text-stone-700'}
            `}>
              {fmtDayLabel(date)}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${TOTAL_HEIGHT}px` }}>
          {/* Time axis */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: `${TOTAL_HEIGHT}px` }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-xs text-stone-400 leading-none"
                style={{ top: `${(h - DAY_START_HOUR) * HOUR_HEIGHT - 7}px` }}
              >
                {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, dayIdx) => (
            <div
              key={dayIdx}
              className={`flex-1 relative border-l border-stone-100
                ${isToday(date) ? 'bg-stone-50/50' : 'bg-white'}
              `}
              style={{ height: `${TOTAL_HEIGHT}px` }}
            >
              {/* Hour grid lines */}
              {HOURS.map(h => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-stone-100"
                  style={{ top: `${(h - DAY_START_HOUR) * HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Events */}
              {eventsByDay[dayIdx].map(ev => (
                <EventBlock
                  key={ev.id}
                  event={ev}
                  style={getEventStyle(ev.start_time, ev.end_time)}
                  onClick={onSelectEvent}
                  isSelected={selectedType === 'event' && selectedId === ev.id}
                />
              ))}

              {/* Suggestion blocks */}
              {suggsByDay[dayIdx].map(s => {
                const block = s.time_block
                if (!block) return null
                const baseStyle = getEventStyle(block.start_time, block.end_time)
                const laneInfo = suggLaneByDay[dayIdx]?.[s.id] || { lane: 0, laneCount: 1 }
                const laneWidth = 100 / laneInfo.laneCount
                const laneLeft = laneInfo.lane * laneWidth
                const lanePadPx = 2
                const suggestionStyle = {
                  ...baseStyle,
                  left: `calc(${laneLeft}% + ${lanePadPx}px)`,
                  width: `calc(${laneWidth}% - ${lanePadPx * 2}px)`,
                  right: 'auto',
                }
                return (
                  <SuggestionBlock
                    key={s.id}
                    suggestion={s}
                    style={suggestionStyle}
                    onClick={onSelectSuggestion}
                    onAccept={onAccept}
                    onReject={onReject}
                    isSelected={selectedType === 'suggestion' && selectedId === s.id}
                  />
                )
              })}

              {/* Now indicator */}
              {todayIdx === dayIdx && nowTop >= 0 && nowTop <= TOTAL_HEIGHT && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: `${nowTop}px` }}
                >
                  <div className="relative flex items-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
