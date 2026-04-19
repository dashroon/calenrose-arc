import { useState, useRef, useEffect } from 'react'
import { useGallery, CAT_COLORS } from './GalleryContext'

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

function InsightGroup({ group, allPhotos, photos }) {
  const sourcePhotos = allPhotos?.length ? allPhotos : photos
  const groupPhotos = (group.display_order || group.photo_indices)
    .map(idx => sourcePhotos[idx])
    .filter(Boolean)

  if (!groupPhotos.length) return null

  const color = GROUP_TYPE_COLORS[group.group_type] || '#CDC7BD'
  const label = GROUP_TYPE_LABELS[group.group_type] || group.group_type

  return (
    <div className="insight-group">
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

function InsightsPage({ insights, photos, allPhotos, isGenerating }) {
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
          <InsightGroup key={group.id} group={group} photos={photos} allPhotos={allPhotos} />
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
    savedTemplates,
    insights,
    basePhotosRef,
    handleFiles, clearAll,
    handleSelectVariation, handleTierClick, handleRestoreCut,
    saveTemplate, generateArc,
    setGalleryActive,
  } = useGallery()

  // Local UI state only
  const [draggingDrop, setDraggingDrop]   = useState(false)
  const [savingName, setSavingName]       = useState('')
  const [showSaveForm, setShowSaveForm]   = useState(false)
  const [activeTab, setActiveTab]         = useState('arc')
  const fileInputRef  = useRef(null)
  const addMoreRef    = useRef(null)

  // Tell context this tab is active (so it knows not to show the badge)
  useEffect(() => {
    setGalleryActive(true)
    return () => setGalleryActive(false)
  }, [setGalleryActive])

  function handleDropZone(e) { e.preventDefault(); setDraggingDrop(false); handleFiles(e.dataTransfer.files) }

  const hasPhotos  = photos.length > 0
  const hasArc     = variations.length > 0
  const isLoading  = status?.state === 'loading'
  const hasFiles   = photos.some(p => p.file) // false when restored from localStorage
  const selectedVariation = variations.find(v => v.id === selectedVariationId)

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
                onClick={() => generateArc(photos)}
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
                    if (e.key === 'Enter') { saveTemplate(savingName, displayPhotos, selectedVariationId); setSavingName(''); setShowSaveForm(false) }
                    if (e.key === 'Escape') setShowSaveForm(false)
                  }}
                  autoFocus />
                <button className="btn-primary" style={{ fontSize: 10 }} onClick={() => { saveTemplate(savingName, displayPhotos, selectedVariationId); setSavingName(''); setShowSaveForm(false) }}>Save</button>
                <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => setShowSaveForm(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn-cancel" style={{ fontSize: 11 }} onClick={() => setShowSaveForm(true)}>Save arc</button>
            )
          )}
        </div>
        {hasPhotos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="arc-photo-count">{photos.length} photos</span>
            <button className="btn-cancel" style={{ fontSize: 10 }} onClick={() => addMoreRef.current?.click()}>Add more</button>
            <input ref={addMoreRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          </div>
        )}
      </div>

      {/* Status / arc summary */}
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
          <button className={`gl-inner-tab${activeTab === 'arc' ? ' active' : ''}`} onClick={() => setActiveTab('arc')}>Arc</button>
          <button className={`gl-inner-tab${activeTab === 'insights' ? ' active' : ''}`} onClick={() => setActiveTab('insights')}>
            Insights{insights ? ` · ${insights.length}` : ''}
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
            allPhotos={basePhotosRef.current}
            isGenerating={isLoading && !insights}
          />
        </div>
      )}
    </div>
  )
}
