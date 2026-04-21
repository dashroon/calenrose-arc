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
const VESPER_LINES = {
  'visual echo': [
    "these two are rhyming. did you catch it?",
    "same light. different moment. that's the whole day.",
    "visual echo. they don't know they're in conversation.",
  ],
  'emotional counterpoint': [
    "one holds the feeling. the other releases it.",
    "stillness makes the chaos louder. chaos makes the stillness matter.",
    "put these next to each other and watch what happens.",
  ],
  'narrative pair': [
    "before and after. question and answer.",
    "this is a sentence. two photos, one thought.",
    "the sequence does the work. trust it.",
  ],
  'unexpected connection': [
    "i know. i surprised myself too.",
    "different hours. same feeling. that's memory.",
    "nobody would have put these together. that's why it works.",
  ],
  'thematic cluster': [
    "three photos. one truth. that's the whole day right there.",
    "this is what the gallery is actually about.",
    "everything else is context. this is the thesis.",
  ],
  default: [
    "i see everything in here.",
    "the index is complete. the findings are significant.",
    "catalogued. annotated. ready for your consideration.",
    "memory is a library with no catalogue system. that's why you need me.",
  ],
}

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
const FORMAT_LABELS = {
  single:   'Single image',
  multi:    'Multi-image post',
  carousel: 'Carousel',
}

const FORMAT_COLORS = {
  single:   '#C4A882',
  multi:    '#82A882',
  carousel: '#9B8EC4',
}

function InstagramPost({ post, allPhotos, index }) {
  const [copied, setCopied] = useState(false)
  const photos = (post.photo_indices || []).map(i => allPhotos[i]).filter(Boolean)
  const color = FORMAT_COLORS[post.format] || '#CDC7BD'
  const label = FORMAT_LABELS[post.format] || post.format

  function copyCaption() {
    const text = `${post.caption}\n\n${post.hashtags || ''}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const captionLines = post.caption?.split('\\n') || []

  return (
    <div className="ig-post">
      <div className="ig-post-header">
        <div className="ig-post-meta">
          <span className="ig-format-badge" style={{ borderColor: color, color }}>{label}</span>
          <span className="ig-post-count">{photos.length} image{photos.length !== 1 ? 's' : ''}</span>
          <span className="ig-post-title">{post.title}</span>
        </div>
        <span className="ig-post-num">0{index + 1}</span>
      </div>

      {post.format === 'carousel' ? (
        <div className="ig-carousel-scroll">
          {photos.map((photo, i) => (
            <div key={i} className="ig-carousel-cell">
              <img src={photo.url} alt={photo.notes || ''} loading="lazy" />
              {photo.notes && <div className="ig-photo-note">{photo.notes}</div>}
            </div>
          ))}
        </div>
      ) : (
        <div className={`ig-photos ig-photos-${post.format}`}>
          {photos.map((photo, i) => (
            <div key={i} className={`ig-photo${i === 0 ? ' ig-photo-lead' : ''}`}>
              <img src={photo.url} alt={photo.notes || ''} loading="lazy" />
              {photo.notes && <div className="ig-photo-note">{photo.notes}</div>}
              {i === 0 && photos.length > 1 && (
                <div className="ig-photo-badge">1 / {photos.length}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="ig-caption-block">
        <div className="ig-caption-label">caption</div>
        <div className="ig-caption-text">
          {captionLines.map((line, i) => (
            <span key={i}>{line}{i < captionLines.length - 1 && <br />}</span>
          ))}
        </div>
        {post.hashtags && <div className="ig-hashtags">{post.hashtags}</div>}
        <button className="ig-copy-btn" onClick={copyCaption}>
          {copied ? 'Copied ✓' : 'Copy caption'}
        </button>
      </div>

      <div className="ig-reasoning-block">
        <p className="ig-reasoning">{post.reasoning}</p>
        {post.posting_tip && (
          <div className="ig-tip">
            <span className="ig-tip-label">tip</span>
            <span className="ig-tip-text">{post.posting_tip}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function InstagramPage({ instagram, allPhotos, isGenerating }) {
  if (isGenerating) {
    return (
      <div className="insights-loading">
        <span className="gl-status-spinner" style={{ width: 10, height: 10 }} />
        <span>Building Instagram suggestions...</span>
      </div>
    )
  }

  if (!instagram?.length) {
    return <div className="insights-empty">Generate an arc first to see Instagram suggestions.</div>
  }

  return (
    <div className="ig-page">
      <div className="ig-page-intro">
        <span className="insights-intro-label">Instagram</span>
        <span className="insights-intro-text">3 post suggestions — single, multi-image, and carousel.</span>
      </div>
      <div className="ig-posts">
        {instagram.map((post, i) => (
          <InstagramPost key={post.id} post={post} allPhotos={allPhotos || []} index={i} />
        ))}
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
  const [activeTab, setActiveTab]         = useState('arc')
  const [vesperDismissed, setVesperDismissed] = useState(false)
  const [vesperPos, setVesperPos]         = useState(null)
  const [vesperAnchored, setVesperAnchored] = useState(false)
  const [vesperMood, setVesperMood]       = useState('archival')
  const [vesperSpeech, setVesperSpeech]   = useState('i see everything in here. every detail, every connection.')
  const [vesperBubble, setVesperBubble]   = useState(true)
  const fileInputRef       = useRef(null)
  const addMoreRef         = useRef(null)
  const vesperTimeout      = useRef(null)
  const vesperMoveTimeout  = useRef(null)
  const lastVesperGroup    = useRef(null)

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
    lastVesperGroup.current = null
    if (tab !== 'insights') {
      setVesperAnchored(false)
      setVesperPos(null)
    }
  }

  function handleLoadProject(project) {
    loadProject(project)
    handleTabChange('arc')
  }

  function speakVesper(groupType, rect) {
    const key = groupType + String(rect?.top?.toFixed(0))
    if (lastVesperGroup.current === key) return
    lastVesperGroup.current = key

    const pool = VESPER_LINES[groupType] || VESPER_LINES.default
    const line = pool[Math.floor(Math.random() * pool.length)]
    const moodMap = {
      'visual echo': 'pensive',
      'emotional counterpoint': 'intrigued',
      'narrative pair': 'archival',
      'unexpected connection': 'smug',
      'thematic cluster': 'archival',
    }
    setVesperMood(moodMap[groupType] || 'archival')
    setVesperSpeech(line)
    setVesperBubble(true)
    if (vesperTimeout.current) clearTimeout(vesperTimeout.current)
    vesperTimeout.current = setTimeout(() => setVesperBubble(false), 4000)

    if (vesperMoveTimeout.current) clearTimeout(vesperMoveTimeout.current)
    vesperMoveTimeout.current = setTimeout(() => {
      if (rect) {
        const right = Math.max(12, window.innerWidth - rect.right + 16)
        const top = Math.max(60, rect.top + 8)
        setVesperPos({ right, top })
        setVesperAnchored(true)
      }
    }, 300)
  }

  function handleVesperClick() {
    const pool = VESPER_LINES.default
    setVesperSpeech(pool[Math.floor(Math.random() * pool.length)])
    setVesperBubble(true)
    if (vesperTimeout.current) clearTimeout(vesperTimeout.current)
    vesperTimeout.current = setTimeout(() => setVesperBubble(false), 4000)
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

      {/* Status */}
      {status && (
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

      {/* Variations */}
      {hasArc && (
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
      )}

      {/* Inner tabs */}
      {hasArc && (
        <div className="gl-inner-tabs">
          <button className={`gl-inner-tab${activeTab === 'arc' ? ' active' : ''}`} onClick={() => handleTabChange('arc')}>Arc</button>
          <button className={`gl-inner-tab${activeTab === 'insights' ? ' active' : ''}`} onClick={() => handleTabChange('insights')}>
            Insights{insights ? ` · ${insights.length}` : ''}
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

      {/* Arc tab */}
      {hasArc && activeTab === 'arc' && displayPhotos.length > 0 && (
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

      {/* Insights tab */}
      {hasArc && activeTab === 'insights' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <InsightsPage
            insights={insights}
            photos={displayPhotos}
            allPhotos={allPhotos}
            isGenerating={isLoading && !insights}
            onGroupVisible={speakVesper}
          />
        </div>
      )}

      {/* Instagram tab */}
      {hasArc && activeTab === 'instagram' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <InstagramPage
            instagram={instagram}
            allPhotos={allPhotos}
            isGenerating={isLoading && !instagram}
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

      {/* Vesper — fixed overlay, visible on all tabs when arc is generated */}
      {hasArc && (
        <div
          className={`vesper-fixed${vesperDismissed ? ' vesper-hidden' : ''}`}
          style={vesperAnchored && vesperPos
            ? {
                right: vesperPos.right,
                top: vesperPos.top,
                bottom: 'auto',
                transition: 'right 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }
            : {
                right: 28,
                bottom: 28,
                top: 'auto',
                transition: 'right 0.55s cubic-bezier(0.34, 1.56, 0.64, 1), bottom 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }
          }
        >
          {vesperBubble && vesperSpeech && (
            <div className="vesper-bubble">
              <span className="vesper-bubble-label">vesper says</span>
              {vesperSpeech}
            </div>
          )}
          <div className="vesper-controls">
            <button
              className="vesper-dismiss-btn"
              onClick={() => setVesperDismissed(v => !v)}
              title={vesperDismissed ? 'bring back vesper' : 'dismiss vesper'}
            >
              {vesperDismissed ? '◎' : '×'}
            </button>
          </div>
          <Vesper
            mood={vesperMood}
            speech={vesperSpeech}
            showBubble={false}
            onSpeak={handleVesperClick}
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
