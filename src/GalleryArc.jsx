import { useState, useRef, useEffect } from 'react'
import { useGallery, CAT_COLORS } from './GalleryContext'

// ── localStorage helpers (local to this file) ─────────────────
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const loadLS = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }

// ── Voice settings ────────────────────────────────────────────
const VOICE_KEY = 'calenrose_arc_voice'

const CALENROSE_DEFAULT_EXAMPLES = `energy. energy. energy.
well-suited to a little chaos: veils, dinner parties, Calenrose.
nonlinear memories from mexico.
midnight in the garden of cake and cotswolds
afters: last call isn't really a thing.
Slim called. He said bring the hot goss.
IN, forever: restaurant weddings.
visual feast: disco/disco nap landscapes
Oops, forgot to pace ourselves.
dear parties, we think about you all the time.
a wild mind and a disciplined eye
Nicole Kidman said it best: I love small dinner parties. But I also love a rave.
we write to taste life twice.
nonlinear love letter.
the way you remember love-not in order, but in waves of feeling that crash over you unexpectedly
because the dress remembers before the bride does
heartbeat first, story second
every moment radiates from I do`

const CALENROSE_DEFAULT_DESCRIPTION = `Visceral, instinctive, documentary with an editorial eye. Both former professional dancers — we think in rhythm, surprise, and release, not chronology. We find the moment before the moment. Published in Vogue, NYT, Over The Moon. We shoot on film AND digital AND iPhone. Our work feels like a cultural event, not documentation.`

const CALENROSE_DEFAULT_BANNED = `magical, timeless, beautiful, stunning, journey, forever, breathtaking, love story, cherished, dream wedding, perfect day, captured, beautiful couple, precious moments, unforgettable`

const DEFAULT_VOICE = {
  description: CALENROSE_DEFAULT_DESCRIPTION,
  examples: CALENROSE_DEFAULT_EXAMPLES,
  bannedWords: CALENROSE_DEFAULT_BANNED,
}

// ── Justified masonry layout ──────────────────────────────────
const getAspect = (p) => p.orientation === 'portrait' ? 2 / 3 : 3 / 2

function JustifiedRow({ photos, gap, containerWidth, onTierClick }) {
  if (!photos.length) return null
  const TARGET_HEIGHT = 320
  const naturalWidths = photos.map(p => TARGET_HEIGHT * getAspect(p))
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0)
  const totalGap = gap * (photos.length - 1)
  const scale = (containerWidth - totalGap) / totalNatural
  const rowHeight = Math.round(TARGET_HEIGHT * scale)
  const widths = naturalWidths.map(w => Math.round(w * scale))

  return (
    <div className="jm-row" style={{ display: 'flex', gap, marginBottom: gap }}>
      {photos.map((photo, i) => (
        <div
          key={photo.url + i}
          className={`jm-cell${photo.tier === 'cut' ? ' jm-cut' : ''}`}
          style={{ width: widths[i], height: rowHeight, flexShrink: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => onTierClick(photo)}
        >
          <img src={photo.url} alt={photo.notes || ''} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div className="jm-hover-overlay">
            <div className="jm-tier-badge" data-tier={photo.tier}>{photo.tier}</div>
            {photo.pairing_note && <div className="jm-pairing-note">{photo.pairing_note}</div>}
          </div>
          <div className="jm-cat-dot" style={{ background: CAT_COLORS[photo.category] || '#CDC7BD' }} />
        </div>
      ))}
    </div>
  )
}

function JustifiedMasonryLayout({ photos, gap = 6, onTierClick }) {
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(800)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  const TARGET_HEIGHT = 320
  const MIN_ROW_RATIO = 0.6
  const rows = []
  let currentRow = []
  let currentWidth = 0
  const visible = photos.filter(p => p.tier !== 'cut')

  visible.forEach((photo, i) => {
    const naturalW = TARGET_HEIGHT * getAspect(photo)
    currentRow.push(photo)
    currentWidth += naturalW + gap
    const filled = currentWidth / containerWidth
    if (filled >= MIN_ROW_RATIO || i === visible.length - 1) {
      rows.push([...currentRow])
      currentRow = []
      currentWidth = 0
    }
  })

  return (
    <div ref={containerRef} className="jm-layout">
      {rows.map((rowPhotos, ri) => (
        <JustifiedRow key={ri} photos={rowPhotos} gap={gap} containerWidth={containerWidth} onTierClick={onTierClick} />
      ))}
    </div>
  )
}

function VariationCard({ variation, isSelected, onSelect }) {
  return (
    <button className={`var-card${isSelected ? ' selected' : ''}`} onClick={onSelect}>
      <div className="var-card-header">
        <span className="var-card-id">{variation.id}</span>
        <span className="var-card-name">{variation.name}</span>
      </div>
      <div className="var-card-desc">{variation.description}</div>
      <div className="var-card-direction">{variation.creative_direction}</div>
    </button>
  )
}

function CutTray({ photos, onRestore }) {
  const [open, setOpen] = useState(false)
  const cutPhotos = photos.filter(p => p.tier === 'cut')
  if (!cutPhotos.length) return null
  return (
    <div className="cut-tray">
      <button className="cut-tray-toggle" onClick={() => setOpen(v => !v)}>
        {cutPhotos.length} cut {open ? '▲' : '▾'}
      </button>
      {open && (
        <div className="cut-tray-grid">
          {cutPhotos.map((photo, i) => (
            <div key={photo.url + i} className="cut-thumb" onClick={() => onRestore(photo)} title="Click to restore">
              <img src={photo.url} alt="" />
              <div className="cut-thumb-restore">restore</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ArcStats({ photos }) {
  const heroes     = photos.filter(p => p.tier === 'hero').length
  const supporting = photos.filter(p => p.tier === 'supporting').length
  const cut        = photos.filter(p => p.tier === 'cut').length
  const total      = photos.length
  return (
    <div className="arc-stats">
      <span className="arc-stat"><span className="arc-stat-num">{heroes}</span> hero</span>
      <span className="arc-stat-sep">·</span>
      <span className="arc-stat"><span className="arc-stat-num">{supporting}</span> supporting</span>
      <span className="arc-stat-sep">·</span>
      <span className="arc-stat arc-stat-cut"><span className="arc-stat-num">{cut}</span> cut</span>
      <span className="arc-stat-sep">·</span>
      <span className="arc-stat arc-stat-muted"><span className="arc-stat-num">{total}</span> total</span>
      <span className="arc-stat-hint">click any photo to change its role</span>
    </div>
  )
}

// ── Insights components ───────────────────────────────────────
const GROUP_TYPE_LABELS = {
  'visual echo':           'Visual echo',
  'emotional counterpoint':'Emotional counterpoint',
  'narrative pair':        'Narrative pair',
  'unexpected connection': 'Unexpected connection',
  'thematic cluster':      'Thematic cluster',
}

const GROUP_TYPE_COLORS = {
  'visual echo':           '#82A4C4',
  'emotional counterpoint':'#C4A882',
  'narrative pair':        '#82A882',
  'unexpected connection': '#9B8EC4',
  'thematic cluster':      '#C48182',
}

function InsightGroup({ group, allPhotos, photos, onVisible }) {
  const ref = useRef(null)
  const sourcePhotos = allPhotos?.length ? allPhotos : photos
  const groupPhotos = (group.display_order || group.photo_indices)
    .map(idx => sourcePhotos[idx])
    .filter(Boolean)

  useEffect(() => {
    const el = ref.current
    if (!el || !onVisible) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible(group.group_type, entry.boundingClientRect)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, []) // eslint-disable-line

  if (!groupPhotos.length) return null

  const color = GROUP_TYPE_COLORS[group.group_type] || '#CDC7BD'
  const label = GROUP_TYPE_LABELS[group.group_type] || group.group_type

  return (
    <div className="insight-group" ref={ref}>
      <div className="insight-group-header">
        <span className="insight-type-badge" style={{ borderColor: color, color }}>{label}</span>
        <span className="insight-title">{group.title}</span>
      </div>
      <div className={`insight-photos insight-photos-${groupPhotos.length}`}>
        {groupPhotos.map((photo, i) => (
          <div key={i} className="insight-photo">
            <img
              src={photo.url}
              alt={photo.notes || ''}
              loading="lazy"
            />
            {photo.notes && <div className="insight-photo-note">{photo.notes}</div>}
          </div>
        ))}
      </div>
      <p className="insight-reasoning">{group.reasoning}</p>
    </div>
  )
}

function InsightsPage({ insights, photos, allPhotos, isGenerating, onGroupVisible }) {
  if (isGenerating) {
    return (
      <div className="insights-loading">
        <span className="gl-status-spinner" style={{ width: 10, height: 10 }} />
        <span>Analyzing photo relationships...</span>
      </div>
    )
  }

  if (!insights?.length) {
    return (
      <div className="insights-empty">
        Generate an arc first to see photo insights.
      </div>
    )
  }

  return (
    <div className="insights-page">
      <div className="insights-intro">
        <span className="insights-intro-label">editorial analysis</span>
        <span className="insights-intro-text">
          {insights.length} groupings identified across visual, emotional, and narrative dimensions.
        </span>
      </div>
      <div className="insights-grid">
        {insights.map(group => (
          <InsightGroup key={group.id} group={group} photos={photos} allPhotos={allPhotos} onVisible={onGroupVisible} />
        ))}
      </div>
    </div>
  )
}

// ── Vesper ────────────────────────────────────────────────────

function Vesper({ mood, onSpeak, speech, showBubble }) {
  return (
    <div className="vesper-wrap" onClick={onSpeak} title="click vesper">
      {showBubble && speech && (
        <div className="vesper-bubble">
          <span className="vesper-bubble-label">vesper says</span>
          {speech}
        </div>
      )}
      <svg className="vesper-svg" viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
        <g className="v-float">
          <g className="v-wtl1">
            <path d="M80 88 Q54 62 36 50 Q20 40 18 54 Q16 70 38 74 Q60 78 78 90Z" fill="#F5F0E8" stroke="#1A1814" strokeWidth="1.2" strokeLinejoin="round" opacity="0.92"/>
            <path d="M78 88 Q56 66 42 56 Q30 50 30 62 Q30 72 50 74 Q66 76 76 88Z" fill="none" stroke="#C4A882" strokeWidth="0.7" opacity="0.4"/>
          </g>
          <g className="v-wtl2">
            <path d="M80 96 Q58 78 44 72 Q30 68 28 80 Q26 92 46 94 Q64 96 78 98Z" fill="#F5F0E8" stroke="#1A1814" strokeWidth="1.1" strokeLinejoin="round" opacity="0.82"/>
          </g>
          <g className="v-wtr1">
            <path d="M120 88 Q146 62 164 50 Q180 40 182 54 Q184 70 162 74 Q140 78 122 90Z" fill="#F5F0E8" stroke="#1A1814" strokeWidth="1.2" strokeLinejoin="round" opacity="0.92"/>
            <path d="M122 88 Q144 66 158 56 Q170 50 170 62 Q170 72 150 74 Q134 76 124 88Z" fill="none" stroke="#C4A882" strokeWidth="0.7" opacity="0.4"/>
          </g>
          <g className="v-wtr2">
            <path d="M120 96 Q142 78 156 72 Q170 68 172 80 Q174 92 154 94 Q136 96 122 98Z" fill="#F5F0E8" stroke="#1A1814" strokeWidth="1.1" strokeLinejoin="round" opacity="0.82"/>
          </g>
          <circle cx="100" cy="115" r="56" fill="none" stroke="#1A1814" strokeWidth="3.5"/>
          <circle cx="100" cy="115" r="54" fill="#F5F2EC"/>
          <circle cx="100" cy="115" r="50" fill="none" stroke="#1A1814" strokeWidth="0.7" opacity="0.12"/>
          <ellipse cx="76" cy="90" rx="15" ry="8" fill="white" opacity="0.18" transform="rotate(-30 76 90)"/>
          <g className={`v-face v-face-${mood}`}>
            <path d={mood === 'smug' ? 'M78 104 Q88 100 94 102' : mood === 'pensive' ? 'M78 104 Q88 102 94 104' : mood === 'intrigued' ? 'M78 99 Q88 94 94 99' : 'M78 102 Q88 97 94 102'}
              fill="none" stroke="#1A1814" strokeWidth="2.2" strokeLinecap="round"/>
            <path d={mood === 'smug' ? 'M106 99 Q112 95 122 100' : mood === 'pensive' ? 'M106 104 Q112 102 122 104' : mood === 'intrigued' ? 'M106 102 Q112 98 122 101' : 'M106 102 Q112 97 122 102'}
              fill="none" stroke="#1A1814" strokeWidth="2.2" strokeLinecap="round"/>
            <circle cx="88" cy="114" r={mood === 'smug' ? 6 : mood === 'pensive' ? 7 : 8.5} fill="#1A1814"/>
            <circle cx="112" cy="114" r={mood === 'smug' ? 6 : mood === 'pensive' ? 7 : 8.5} fill="#1A1814"/>
            <circle cx="85" cy="111" r="2.8" fill="white"/>
            <circle cx="109" cy="111" r="2.8" fill="white"/>
            <circle cx="100" cy="124" r="3.5" fill="#C4A882" stroke="#1A1814" strokeWidth="1.2"/>
            <path d={mood === 'pensive' ? 'M90 136 Q100 136 110 136' : mood === 'smug' ? 'M92 133 Q100 140 108 134' : 'M90 134 Q100 141 110 134'}
              fill="none" stroke="#1A1814" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="72" cy="120" r="9" fill="#E8936A" opacity="0.18"/>
            <circle cx="128" cy="120" r="9" fill="#E8936A" opacity="0.18"/>
          </g>
          <rect x="72" y="107" width="22" height="14" rx="7" fill="none" stroke="#1A1208" strokeWidth="2"/>
          <rect x="106" y="107" width="22" height="14" rx="7" fill="none" stroke="#1A1208" strokeWidth="2"/>
          <line x1="94" y1="114" x2="106" y2="114" stroke="#1A1208" strokeWidth="1.8"/>
          <line x1="50" y1="112" x2="72" y2="112" stroke="#1A1208" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="128" y1="112" x2="150" y2="112" stroke="#1A1208" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="72" y="107" width="22" height="14" rx="7" fill="#8BB8D4" opacity="0.1"/>
          <rect x="106" y="107" width="22" height="14" rx="7" fill="#8BB8D4" opacity="0.1"/>
        </g>
      </svg>
    </div>
  )
}

// ── Instagram components ──────────────────────────────────────
function InstagramPage({ instagram, allPhotos, displayPhotos, isGenerating }) {
  const [activePost, setActivePost] = useState(0)
  const [copied, setCopied] = useState(false)
  const [slideshowIdx, setSlideshowIdx] = useState(null)
  const sourcePhotos = allPhotos?.length ? allPhotos : displayPhotos

  if (isGenerating && !instagram?.length) {
    return (
      <div className="ig2-loading">
        <span className="gl-status-spinner" />
        <span>Building Instagram suggestions...</span>
      </div>
    )
  }

  if (!instagram?.length) {
    return <div className="ig2-empty">Generate an arc to see Instagram suggestions.</div>
  }

  const post = instagram[activePost]
  const photos = (post?.photo_indices || []).map(i => sourcePhotos[i]).filter(Boolean)

  const FORMAT_LABELS = { single: 'Single image', multi: 'Multi-image', carousel: 'Carousel' }
  const FORMAT_COLORS = { single: '#C4A882', multi: '#82A882', carousel: '#9B8EC4' }

  function copyCaption() {
    const text = `${post.caption}\n\n${post.hashtags || ''}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (slideshowIdx === null) return
    function onKey(e) {
      if (e.key === 'ArrowRight') setSlideshowIdx(i => i < photos.length - 1 ? i + 1 : i)
      if (e.key === 'ArrowLeft') setSlideshowIdx(i => Math.max(0, i - 1))
      if (e.key === 'Escape') setSlideshowIdx(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideshowIdx, photos.length])

  return (
    <div className="ig2-page">

      {/* Selector */}
      <div className="ig2-selector">
        {instagram.map((p, i) => (
          <button
            key={p.id}
            className={`ig2-selector-btn${activePost === i ? ' active' : ''}`}
            onClick={() => { setActivePost(i); setCopied(false); setSlideshowIdx(null) }}
            style={activePost === i ? {
              borderBottomColor: FORMAT_COLORS[p.format],
              color: FORMAT_COLORS[p.format]
            } : {}}
          >
            <span className="ig2-selector-format">{FORMAT_LABELS[p.format] || p.format}</span>
            <span className="ig2-selector-title">{p.title}</span>
          </button>
        ))}
      </div>

      {/* Photos — top half */}
      <div className="ig2-photos-area">
        <div className={`ig2-photos-wrap${post.format === 'single' ? ' ig2-single' : ''}`}>
          {photos.map((photo, i) => (
            <div
              key={i}
              className="ig2-photo-item"
              onClick={() => setSlideshowIdx(i)}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={photo.url}
                alt={photo.notes || ''}
                loading="lazy"
              />
              {photo.notes && (
                <div className="ig2-photo-note">{photo.notes}</div>
              )}
              {post.format !== 'single' && (
                <div className="ig2-photo-num">{i + 1}</div>
              )}
            </div>
          ))}
        </div>
        <div className="ig2-photo-count-row">
          <span className="ig2-photo-count">{photos.length} image{photos.length !== 1 ? 's' : ''}</span>
          {post.format !== 'single' && (
            <button className="ig2-slideshow-btn" onClick={() => setSlideshowIdx(0)}>
              ▷ slideshow
            </button>
          )}
        </div>
      </div>

      {/* Caption — bottom half */}
      <div className="ig2-caption-area">
        <div className="ig2-caption-main">
          <div className="ig2-caption-text">
            {post.caption?.split('\\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </div>
          <div className="ig2-caption-row">
            {post.hashtags && (
              <div className="ig2-hashtags">{post.hashtags}</div>
            )}
            <button className="ig2-copy-btn" onClick={copyCaption}>
              {copied ? '✓ copied' : 'copy caption'}
            </button>
          </div>
        </div>

        {(post.reasoning || post.posting_tip) && (
          <div className="ig2-meta">
            {post.reasoning && (
              <p className="ig2-reasoning">{post.reasoning}</p>
            )}
            {post.posting_tip && (
              <div className="ig2-tip">
                <span className="ig2-tip-label">tip</span>
                <span className="ig2-tip-text">{post.posting_tip}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slideshow overlay */}
      {slideshowIdx !== null && (
        <div className="ig2-slideshow-overlay" onClick={() => setSlideshowIdx(null)}>
          <div className="ig2-slideshow-inner" onClick={e => e.stopPropagation()}>

            <button className="ig2-slideshow-close" onClick={() => setSlideshowIdx(null)}>×</button>

            <div className="ig2-slideshow-photo" onClick={() => {
              if (slideshowIdx < photos.length - 1) setSlideshowIdx(i => i + 1)
              else setSlideshowIdx(null)
            }}>
              <img
                src={photos[slideshowIdx]?.url}
                alt={photos[slideshowIdx]?.notes || ''}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
              />
              {photos[slideshowIdx]?.notes && (
                <div className="ig2-slideshow-note">{photos[slideshowIdx].notes}</div>
              )}
            </div>

            <div className="ig2-slideshow-nav">
              <button
                className="ig2-slideshow-prev"
                onClick={() => setSlideshowIdx(i => Math.max(0, i - 1))}
                disabled={slideshowIdx === 0}
              >← prev</button>

              <span className="ig2-slideshow-count">
                {slideshowIdx + 1} / {photos.length}
              </span>

              <button
                className="ig2-slideshow-next"
                onClick={() => {
                  if (slideshowIdx < photos.length - 1) setSlideshowIdx(i => i + 1)
                  else setSlideshowIdx(null)
                }}
              >
                {slideshowIdx < photos.length - 1 ? 'next →' : 'done ✓'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

// ── Vesper page ───────────────────────────────────────────────
const VP_LINES = {
  'visual echo': [
    "these two are rhyming. did you catch it?",
    "same light. different moment. that's the whole day.",
    "visual echo. they don't know they're in conversation — but they are.",
    "the archive notes: repetition is not accident.",
  ],
  'emotional counterpoint': [
    "one holds the feeling. the other releases it.",
    "stillness makes the chaos louder. chaos makes the stillness matter.",
    "put these next to each other and watch what happens.",
    "this is the whole emotional arc in two frames.",
  ],
  'narrative pair': [
    "before and after. question and answer.",
    "this is a sentence. two photos, one thought.",
    "the sequence does the work. trust it.",
    "i call this: the thing that happened, and the thing it meant.",
  ],
  'unexpected connection': [
    "i know. i surprised myself too.",
    "different hours. same feeling. that's memory.",
    "nobody would have put these together. that's exactly why it works.",
    "the filing system doesn't care about chronology. neither do i.",
  ],
  'thematic cluster': [
    "three photos. one truth. that's the whole day right there.",
    "this is what the gallery is actually about.",
    "everything else is context. this is the thesis.",
    "i kept coming back to these. the archive agrees.",
  ],
}

const VP_MOOD_MAP = {
  'visual echo': 'pensive',
  'emotional counterpoint': 'intrigued',
  'narrative pair': 'archival',
  'unexpected connection': 'smug',
  'thematic cluster': 'archival',
}

const VP_TYPE_COLORS = {
  'visual echo':            '#82A4C4',
  'emotional counterpoint': '#C4A882',
  'narrative pair':         '#82A882',
  'unexpected connection':  '#9B8EC4',
  'thematic cluster':       '#C48182',
}

function VesperPage({ insights, allPhotos, displayPhotos }) {
  const [slideIdx, setSlideIdx]   = useState(0)
  const [speech, setSpeech]       = useState('')
  const [showBubble, setShowBubble] = useState(false)
  const [vesperMood, setVesperMood] = useState('archival')
  const speechTimeout = useRef(null)

  const sourcePhotos = allPhotos?.length ? allPhotos : displayPhotos
  const group = insights?.[slideIdx]

  useEffect(() => {
    if (!group) return
    setVesperMood(VP_MOOD_MAP[group.group_type] || 'archival')
    const pool = VP_LINES[group.group_type] || ['i have notes on this one.']
    const line = pool[Math.floor(Math.random() * pool.length)]
    setSpeech(line)
    setShowBubble(true)
    if (speechTimeout.current) clearTimeout(speechTimeout.current)
    speechTimeout.current = setTimeout(() => {
      setSpeech(group.reasoning)
      setShowBubble(true)
    }, 2800)
    return () => clearTimeout(speechTimeout.current)
  }, [slideIdx, group?.id]) // eslint-disable-line

  function prev() { if (slideIdx > 0) setSlideIdx(i => i - 1) }
  function next() { if (slideIdx < (insights?.length || 0) - 1) setSlideIdx(i => i + 1) }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideIdx, insights?.length]) // eslint-disable-line

  if (!insights?.length) {
    return (
      <div className="vesper-page-empty">
        <Vesper mood="pensive" speech="generate an arc first. i'll have thoughts." showBubble={true} onSpeak={() => {}} />
        <p>generate an arc to see vesper's analysis</p>
      </div>
    )
  }

  const groupPhotos = (group?.display_order || group?.photo_indices || [])
    .map(idx => sourcePhotos[idx]).filter(Boolean)
  const color = VP_TYPE_COLORS[group?.group_type] || '#CDC7BD'

  return (
    <div className="vesper-page">
      <div className="vesper-slide-header">
        <div className="vesper-slide-meta">
          <span className="vesper-type-badge" style={{ borderColor: color, color }}>{group?.group_type}</span>
          <span className="vesper-slide-title">{group?.title}</span>
        </div>
        <div className="vesper-slide-count">{slideIdx + 1} / {insights.length}</div>
      </div>

      <div className="vesper-photos">
        {groupPhotos.map((photo, i) => (
          <div
            key={i}
            className="vesper-photo"
            onClick={next}
            title={slideIdx < insights.length - 1 ? 'click to continue →' : ''}
            style={{ cursor: slideIdx < insights.length - 1 ? 'pointer' : 'default' }}
          >
            <img src={photo.url} alt={photo.notes || ''} loading="lazy" />
            {photo.notes && <div className="vesper-photo-note">{photo.notes}</div>}
          </div>
        ))}
        {slideIdx < insights.length - 1 && (
          <div className="vesper-click-hint">click to continue</div>
        )}
      </div>

      <div className="vesper-nav">
        <button className="vesper-nav-btn" onClick={prev} disabled={slideIdx === 0}>← prev</button>
        <div className="vesper-dots">
          {insights.map((_, i) => (
            <button key={i} className={`vesper-dot${i === slideIdx ? ' active' : ''}`} onClick={() => setSlideIdx(i)} />
          ))}
        </div>
        <button className="vesper-nav-btn" onClick={next} disabled={slideIdx === insights.length - 1}>next →</button>
      </div>

      <div className="vesper-presenter">
        {showBubble && speech && (
          <div className="vesper-presenter-bubble">
            <span className="vesper-bubble-label">vesper says</span>
            {speech}
          </div>
        )}
        <Vesper
          mood={vesperMood}
          speech={speech}
          showBubble={false}
          onSpeak={() => {
            const pool = VP_LINES[group?.group_type] || ['the index is complete.']
            setSpeech(pool[Math.floor(Math.random() * pool.length)])
            setShowBubble(true)
          }}
        />
      </div>
    </div>
  )
}

// ── Saved projects ────────────────────────────────────────────
function SavedProjectsPage({ projects, onLoad, onDelete }) {
  if (!projects.length) {
    return (
      <div className="projects-empty">
        <span>No saved arcs yet — generate an arc and hit Save arc to keep it.</span>
      </div>
    )
  }

  return (
    <div className="projects-page">
      <div className="projects-grid">
        {projects.map(project => (
          <div key={project.id} className="project-card">
            <div className="project-thumbs">
              {project.previewThumbs?.slice(0, 4).map((t, i) => (
                <div key={i} className="project-thumb">
                  <img src={t.url} alt="" />
                </div>
              ))}
            </div>
            <div className="project-info">
              <div className="project-name">{project.name}</div>
              <div className="project-meta">
                {project.photoCount} photos · {new Date(project.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              {project.arcSummary && (
                <div className="project-summary">{project.arcSummary.slice(0, 100)}{project.arcSummary.length > 100 ? '…' : ''}</div>
              )}
            </div>
            <div className="project-actions">
              <button className="btn-primary" style={{ fontSize: 10 }} onClick={() => onLoad(project)}>Load</button>
              <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => onDelete(project.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function GalleryArc() {
  const {
    photos, setPhotosRaw,
    variations, selectedVariationId,
    displayPhotos, status,
    insights,
    instagram,
    basePhotosRef,
    handleFiles, clearAll,
    handleSelectVariation, handleTierClick, handleRestoreCut,
    savedProjects, saveProject, deleteProject, loadProject,
    generateArc,
    setGalleryActive,
  } = useGallery()

  // Local UI state only
  const [draggingDrop, setDraggingDrop]   = useState(false)
  const [savingName, setSavingName]       = useState('')
  const [showSaveForm, setShowSaveForm]   = useState(false)
  const [voiceSettings, setVoiceSettings] = useState(() => loadLS(VOICE_KEY) || DEFAULT_VOICE)
  const [showSettings, setShowSettings]   = useState(false)
  const [activeTab, setActiveTab] = useState('arc')
  const fileInputRef = useRef(null)
  const addMoreRef   = useRef(null)

  function buildVoiceContext() {
    const { description, examples, bannedWords } = voiceSettings
    const exampleLines = (examples || '')
      .split('\n').map(l => l.trim()).filter(Boolean).slice(0, 20)
    return `You are writing in the voice of CALENROSE (@calenrose on Instagram), a NYC wedding photography duo. Travis and Kim — both former professional dancers, published in Vogue, NYT, Over The Moon.

${description ? `Their voice: ${description}` : ''}

${exampleLines.length ? `Real examples of their Instagram captions — match this voice exactly:\n${exampleLines.map(l => `"${l}"`).join('\n')}` : ''}

${bannedWords ? `Never use these words or phrases: ${bannedWords}` : ''}

Write all text — arc summaries, variation descriptions, creative directions, insights, and Instagram captions — in this voice. Short. Specific. Lowercase. Terse. Find the specific weird or funny angle. Sound like a cool NYC photographer texting a friend, not a wedding blog.`
  }

  function handleTabChange(tab) {
    setActiveTab(tab)
  }

  function handleLoadProject(project) {
    loadProject(project)
    handleTabChange('arc')
  }

  useEffect(() => {
    setGalleryActive(true)
    return () => setGalleryActive(false)
  }, [setGalleryActive])

  function handleDropZone(e) { e.preventDefault(); setDraggingDrop(false); handleFiles(e.dataTransfer.files) }

  const hasPhotos  = photos.length > 0
  const hasArc     = variations.length > 0
  const isLoading  = status?.state === 'loading'
  const hasFiles   = photos.some(p => p.file)
  const selectedVariation = variations.find(v => v.id === selectedVariationId)
  const allPhotos  = basePhotosRef.current?.length ? basePhotosRef.current : displayPhotos

  return (
    <div className="gallery-layout-page">

      {/* Toolbar */}
      <div className="gl-toolbar">
        <div className="gl-toolbar-left">
          {hasPhotos && (
            <>
              <button
                className="btn-primary"
                style={{ fontSize: 11 }}
                onClick={() => generateArc(photos, buildVoiceContext())}
                disabled={isLoading || !hasFiles}
                title={!hasFiles ? 'Re-upload photos to regenerate' : ''}
              >
                {isLoading
                  ? (status?.msg?.includes('Analyzing') ? 'Analyzing…' : 'Reading…')
                  : hasArc ? 'Regenerate arc' : 'Generate arc'}
              </button>
              <button className="btn-cancel" style={{ fontSize: 11 }} onClick={() => clearAll(photos)}>Clear all</button>
            </>
          )}
          {hasArc && (
            showSaveForm ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="gl-template-input" placeholder="Save arc as…" value={savingName}
                  onChange={e => setSavingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { saveProject(savingName); setSavingName(''); setShowSaveForm(false) }
                    if (e.key === 'Escape') setShowSaveForm(false)
                  }}
                  autoFocus />
                <button className="btn-primary" style={{ fontSize: 10 }} onClick={() => { saveProject(savingName); setSavingName(''); setShowSaveForm(false) }}>Save</button>
                <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => setShowSaveForm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-cancel" style={{ fontSize: 11 }} onClick={() => setShowSaveForm(true)}>Save arc</button>
            )
          )}
          <button className="settings-btn" onClick={() => setShowSettings(v => !v)} title="Voice settings">⚙</button>
        </div>
        {hasPhotos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="arc-photo-count">{photos.length} photos</span>
            <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => addMoreRef.current?.click()}>Add more</button>
            <input ref={addMoreRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          </div>
        )}
      </div>

      {/* Inner tabs — immediately below toolbar */}
      {hasArc && (
        <div className="gl-inner-tabs">
          <button className={`gl-inner-tab${activeTab === 'arc' ? ' active' : ''}`} onClick={() => handleTabChange('arc')}>Arc</button>
          <button className={`gl-inner-tab${activeTab === 'insights' ? ' active' : ''}`} onClick={() => handleTabChange('insights')}>
            Insights{insights ? ` · ${insights.length}` : ''}
          </button>
          <button className={`gl-inner-tab${activeTab === 'vesper' ? ' active' : ''}`} onClick={() => handleTabChange('vesper')}>
            Vesper{insights?.length ? ` · ${insights.length}` : ''}
          </button>
          <button className={`gl-inner-tab${activeTab === 'instagram' ? ' active' : ''}`} onClick={() => handleTabChange('instagram')}>
            Instagram{instagram ? ' · 3' : ''}
          </button>
          <button className={`gl-inner-tab${activeTab === 'projects' ? ' active' : ''}`} onClick={() => handleTabChange('projects')}>
            Saved{savedProjects.length > 0 ? ` · ${savedProjects.length}` : ''}
          </button>
        </div>
      )}

      {/* Pre-arc saved tab — accessible before generating */}
      {!hasArc && savedProjects.length > 0 && (
        <div className="gl-inner-tabs">
          <button className={`gl-inner-tab${activeTab === 'projects' ? ' active' : ''}`} onClick={() => handleTabChange('projects')}>
            Saved · {savedProjects.length}
          </button>
        </div>
      )}

      {/* Status */}
      {status && activeTab !== 'vesper' && (
        <div className={`gl-status${status.state === 'error' ? ' gl-status-error' : status.state === 'warn' ? ' gl-status-warn' : ''}`}>
          {isLoading && <span className="gl-status-spinner" />}
          <span className="gl-status-text">{status.msg}</span>
        </div>
      )}

      {/* Upload zone */}
      {!hasPhotos && (
        <div className={`gl-drop-zone${draggingDrop ? ' gl-drop-zone-active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDraggingDrop(true) }}
          onDragLeave={() => setDraggingDrop(false)}
          onDrop={handleDropZone}
          onClick={() => fileInputRef.current?.click()}
          role="button" tabIndex={0}>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          <div className="gl-drop-icon">↑</div>
          <div className="gl-drop-label">Drop your selects here</div>
          <div className="gl-drop-sub">150–400 photos from the shoot · jpg, png, raw previews</div>
        </div>
      )}

      {/* Photos loaded bar (pre-arc) */}
      {hasPhotos && !hasArc && !isLoading && (
        <div className="arc-loaded-bar">
          <span>{photos.length} photos ready</span>
        </div>
      )}

      {/* Arc tab — variations + photos */}
      {hasArc && activeTab === 'arc' && (
        <>
          <div className="var-strip">
            <span className="var-strip-label">story arc</span>
            <div className="var-cards">
              {variations.map(v => (
                <VariationCard
                  key={v.id}
                  variation={v}
                  isSelected={selectedVariationId === v.id}
                  onSelect={() => handleSelectVariation(v.id, variations)}
                />
              ))}
            </div>
          </div>
          {displayPhotos.length > 0 && (
            <>
              <ArcStats photos={displayPhotos} />
              <div className="arc-scroll">
                {selectedVariation?.creative_direction && (
                  <div className="arc-creative-direction">{selectedVariation.creative_direction}</div>
                )}
                <JustifiedMasonryLayout photos={displayPhotos} gap={6} onTierClick={handleTierClick} />
                <CutTray photos={displayPhotos} onRestore={handleRestoreCut} />
              </div>
            </>
          )}
        </>
      )}

      {/* Insights tab */}
      {hasArc && activeTab === 'insights' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <InsightsPage
            insights={insights}
            photos={displayPhotos}
            allPhotos={allPhotos}
            isGenerating={isLoading && !insights}
          />
        </div>
      )}

      {/* Instagram tab */}
      {hasArc && activeTab === 'instagram' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <InstagramPage
            instagram={instagram}
            allPhotos={allPhotos}
            displayPhotos={displayPhotos}
            isGenerating={isLoading && !instagram}
          />
        </div>
      )}

      {/* Vesper tab */}
      {activeTab === 'vesper' && (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <VesperPage
            insights={insights}
            allPhotos={allPhotos}
            displayPhotos={displayPhotos}
          />
        </div>
      )}

      {/* Saved projects tab */}
      {activeTab === 'projects' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <SavedProjectsPage
            projects={savedProjects}
            onLoad={handleLoadProject}
            onDelete={deleteProject}
          />
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <span className="settings-title">Voice Settings</span>
              <button className="settings-close" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-body">
              <div className="settings-section">
                <label className="settings-label">Style description</label>
                <p className="settings-hint">How would you describe your photographic voice?</p>
                <textarea
                  className="settings-textarea"
                  rows={4}
                  value={voiceSettings.description}
                  onChange={e => {
                    const next = { ...voiceSettings, description: e.target.value }
                    setVoiceSettings(next)
                    saveLS(VOICE_KEY, next)
                  }}
                />
              </div>
              <div className="settings-section">
                <label className="settings-label">Example captions</label>
                <p className="settings-hint">One per line. The AI matches this voice exactly. Pre-filled with your real Instagram captions.</p>
                <textarea
                  className="settings-textarea"
                  rows={12}
                  value={voiceSettings.examples}
                  onChange={e => {
                    const next = { ...voiceSettings, examples: e.target.value }
                    setVoiceSettings(next)
                    saveLS(VOICE_KEY, next)
                  }}
                />
              </div>
              <div className="settings-section">
                <label className="settings-label">Words to never use</label>
                <p className="settings-hint">Comma-separated.</p>
                <textarea
                  className="settings-textarea"
                  rows={3}
                  value={voiceSettings.bannedWords}
                  onChange={e => {
                    const next = { ...voiceSettings, bannedWords: e.target.value }
                    setVoiceSettings(next)
                    saveLS(VOICE_KEY, next)
                  }}
                />
              </div>
              <div className="settings-actions">
                <button className="btn-primary" style={{ fontSize: 10 }} onClick={() => setShowSettings(false)}>Done</button>
                <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => {
                  setVoiceSettings(DEFAULT_VOICE)
                  saveLS(VOICE_KEY, DEFAULT_VOICE)
                }}>Reset to defaults</button>
              </div>
              <div className="settings-status">✓ voice active — regenerate arc to apply changes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
