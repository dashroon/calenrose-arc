import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

// ── Constants ─────────────────────────────────────────────────
const CAT_COLORS = {
  'getting ready': '#9B8EC4',
  'ceremony':      '#C4A882',
  'portraits':     '#82A882',
  'reception':     '#C48182',
  'details':       '#82A4C4',
}
const CAT_ORDER = ['getting ready', 'ceremony', 'portraits', 'reception', 'details']
const SESSION_KEY  = 'calenrose_arc_session'
const TEMPLATES_KEY = 'calenrose_arc_templates'
const TIERS = ['hero', 'supporting', 'cut']

export { CAT_COLORS, CAT_ORDER, TIERS }

// ── Helpers ───────────────────────────────────────────────────
export function guessCategoryFromName(name) {
  const n = name.toLowerCase()
  if (n.match(/getting.ready|prep|ready|dress|hair|makeup|bridal/)) return 'getting ready'
  if (n.match(/cerem|aisle|vow|ring|kiss|altar/)) return 'ceremony'
  if (n.match(/portrait|couple|bride|groom|family/)) return 'portraits'
  if (n.match(/recep|dance|dinner|party|toast|cake/)) return 'reception'
  return 'details'
}

export async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
function loadLS(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }

// Shrink a photo to a small thumbnail data URL for localStorage persistence
async function photoToThumb(photo, maxSize = 200) {
  if (!photo.file) return photo.url
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      res(canvas.toDataURL('image/jpeg', 0.6))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => res(null)
    img.src = URL.createObjectURL(photo.file)
  })
}

function buildFullOrder(variationOrder, sampleIndices, totalCount) {
  if (!variationOrder?.length) return Array.from({ length: totalCount }, (_, i) => i)
  const valid = variationOrder.filter(i =>
    typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < totalCount
  )
  if (valid.length === totalCount) return valid
  const included = new Set(valid)
  const missing = Array.from({ length: totalCount }, (_, i) => i).filter(i => !included.has(i))
  for (let i = missing.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [missing[i], missing[j]] = [missing[j], missing[i]]
  }
  const result = [...valid]
  const step = Math.max(1, Math.floor(result.length / (missing.length + 1)))
  missing.forEach((idx, i) => {
    result.splice(Math.min((i + 1) * step, result.length), 0, idx)
  })
  return result
}

export function applyRulesToPhotos(rules, photos) {
  if (!rules || !photos.length) return photos.map((_, i) => i)
  const {
    opening_category = 'details',
    opening_energy = 'quiet',
    opening_count = 2,
    category_weights = {},
    energy_pattern = 'qmhqmh',
    prefer_alternating_orientation = true,
    closing_energy = 'quiet',
    closing_category = 'details',
    closing_count = 2,
  } = rules

  const openerPool = photos.map((p, i) => ({ p, i }))
    .filter(({ p }) => (p.category || 'details') === opening_category && (p.energy || 'medium') === opening_energy)
    .sort((a, b) => (b.p.hero_score || 5) - (a.p.hero_score || 5))
  const closerPool = photos.map((p, i) => ({ p, i }))
    .filter(({ p }) => (p.category || 'details') === closing_category && (p.energy || 'medium') === closing_energy)
    .sort((a, b) => (a.p.hero_score || 5) - (b.p.hero_score || 5))

  const openerIndices = openerPool.slice(0, opening_count).map(x => x.i)
  const closerIndices = closerPool.filter(x => !openerIndices.includes(x.i)).slice(0, closing_count).map(x => x.i)
  const usedSet = new Set([...openerIndices, ...closerIndices])
  const remaining = photos.map((p, i) => ({ p, i })).filter(({ i }) => !usedSet.has(i))

  const patternArr = energy_pattern.split('')
  const energyMap = { q: 'quiet', m: 'medium', h: 'high' }
  const buckets = { quiet: [], medium: [], high: [] }
  remaining.forEach(({ p, i }) => { (buckets[p.energy || 'medium'] || buckets.medium).push({ p, i }) })

  const getCatWeight = (p) => category_weights[p.category || 'details'] || 1
  Object.values(buckets).forEach(bucket => {
    bucket.sort((a, b) => {
      const wDiff = getCatWeight(b.p) - getCatWeight(a.p)
      return wDiff !== 0 ? wDiff : (b.p.hero_score || 5) - (a.p.hero_score || 5)
    })
  })

  const mainSequence = []
  let patternPos = 0
  let lastOrientation = null
  const totalRemaining = remaining.length

  while (mainSequence.length < totalRemaining) {
    const energyPref = energyMap[patternArr[patternPos % patternArr.length]] || 'medium'
    patternPos++
    let chosen = null
    const preferredBucket = buckets[energyPref]
    if (preferredBucket.length > 0) {
      if (prefer_alternating_orientation && lastOrientation) {
        const oppositeOri = lastOrientation === 'landscape' ? 'portrait' : 'landscape'
        const altIdx = preferredBucket.findIndex(x => (x.p.orientation || 'landscape') === oppositeOri)
        if (altIdx !== -1) chosen = preferredBucket.splice(altIdx, 1)[0]
      }
      if (!chosen) chosen = preferredBucket.shift()
    }
    if (!chosen) {
      for (const fb of ['medium', 'high', 'quiet'].filter(e => e !== energyPref)) {
        if (buckets[fb].length > 0) { chosen = buckets[fb].shift(); break }
      }
    }
    if (!chosen) break
    mainSequence.push(chosen.i)
    lastOrientation = chosen.p.orientation || 'landscape'
  }

  return [...openerIndices, ...mainSequence, ...closerIndices]
}

// ── Context ───────────────────────────────────────────────────
const GalleryContext = createContext(null)

export function GalleryProvider({ children }) {
  const [photos, setPhotosRaw]           = useState([])
  const [variations, setVariations]       = useState([])
  const [selectedVariationId, setSelectedVariationId] = useState(null)
  const [displayPhotos, setDisplayPhotos] = useState([])
  const [status, setStatus]               = useState(null)
  const [savedTemplates, setSavedTemplates] = useState(() => loadLS(TEMPLATES_KEY) || [])
  // notifyReady: null = nothing, { count } = processing done while user was away
  const [notifyReady, setNotifyReady]     = useState(null)

  const basePhotosRef  = useRef([])
  const galleryActiveRef = useRef(false) // true while GalleryLayout is mounted

  // ── Restore from localStorage ────────────────────────────────
  useEffect(() => {
    const saved = loadLS(SESSION_KEY)
    if (!saved?.photos?.length) return
    try {
      setPhotosRaw(saved.photos)
      if (saved.variations?.length) {
        setVariations(saved.variations)
        basePhotosRef.current = saved.photos
        applyVariationFullInner(saved.variations[0], saved.photos)
        setSelectedVariationId(saved.variations[0].id)
      }
      const age = saved.savedAt ? Math.round((Date.now() - saved.savedAt) / 60000) : null
      const ageStr = age !== null
        ? (age < 60 ? `${age}m ago` : `${Math.round(age / 60)}h ago`)
        : ''
      setStatus({
        state: 'done',
        msg: `${saved.photos.length} photos restored${ageStr ? ` · saved ${ageStr}` : ''} · re-upload files to re-analyze`,
      })
    } catch (e) {
      console.warn('Gallery restore failed:', e)
      localStorage.removeItem(SESSION_KEY)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(photosArr, variationsArr) {
    try {
      const persistablePhotos = await Promise.all(
        photosArr.map(async (p) => {
          const thumb = p.file ? await photoToThumb(p) : p.url
          return {
            url: thumb,
            name: p.name,
            category: p.category,
            orientation: p.orientation,
            hero_score: p.hero_score,
            tier: p.tier,
            notes: p.notes,
            pairing_note: p.pairing_note,
            energy: p.energy,
          }
        })
      )
      saveLS(SESSION_KEY, {
        photos: persistablePhotos,
        variations: variationsArr,
        savedAt: Date.now(),
      })
    } catch (e) {
      console.warn('Gallery persist failed:', e)
    }
  }

  // Inner helper — doesn't depend on external state so safe to call inside effects
  function applyVariationFullInner(variation, basePhotos) {
    const order = variation.fullOrder || Array.from({ length: basePhotos.length }, (_, i) => i)
    const ordered = []
    const included = new Set()
    for (const idx of order) {
      if (idx >= 0 && idx < basePhotos.length && !included.has(idx)) {
        ordered.push(basePhotos[idx])
        included.add(idx)
      }
    }
    basePhotos.forEach((p, i) => { if (!included.has(i)) ordered.push(p) })
    const result = ordered.map(photo => {
      const origIdx = basePhotos.indexOf(photo)
      const tier = variation.tiers?.[String(origIdx)]
      return {
        ...photo,
        tier: tier || (
          (photo.hero_score || 5) >= 8 ? 'hero' :
          (photo.hero_score || 5) <= 3 ? 'cut' :
          'supporting'
        ),
      }
    })
    setDisplayPhotos(result)
  }

  // ── File handling ────────────────────────────────────────────
  const handleFiles = useCallback((incoming) => {
    const imageFiles = [...incoming].filter(f => f.type.startsWith('image/'))
    if (!imageFiles.length) return
    const entries = imageFiles.map(f => ({
      file: f, url: URL.createObjectURL(f), name: f.name,
      category: guessCategoryFromName(f.name),
      orientation: 'landscape', hero_score: 5,
      tier: 'supporting', notes: '', pairing_note: '',
    }))
    setPhotosRaw(prev => {
      const next = [...prev, ...entries]
      setStatus({ state: 'done', msg: `${next.length} photos loaded · click Generate arc` })
      return next
    })
  }, [])

  const clearAll = useCallback((currentPhotos) => {
    currentPhotos.forEach(p => { try { URL.revokeObjectURL(p.url) } catch {} })
    setPhotosRaw([]); setVariations([]); setSelectedVariationId(null)
    setDisplayPhotos([]); setStatus(null); setNotifyReady(null)
    basePhotosRef.current = []
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const applyVariationFull = useCallback((variation, basePhotos) => {
    applyVariationFullInner(variation, basePhotos)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectVariation = useCallback((variationId, currentVariations) => {
    const variation = currentVariations.find(v => v.id === variationId)
    if (!variation) return
    setSelectedVariationId(variationId)
    applyVariationFullInner(variation, basePhotosRef.current)
  }, [])

  const handleTierClick = useCallback((photo) => {
    setDisplayPhotos(prev => prev.map(p => p === photo ? { ...p, tier: TIERS[(TIERS.indexOf(p.tier) + 1) % TIERS.length] } : p))
  }, [])

  const handleRestoreCut = useCallback((photo) => {
    setDisplayPhotos(prev => prev.map(p => p === photo ? { ...p, tier: 'supporting' } : p))
  }, [])

  // ── Save arc template ─────────────────────────────────────────
  const saveTemplate = useCallback((name, currentDisplayPhotos, currentSelectedVariationId) => {
    if (!name.trim() || !currentDisplayPhotos.length) return
    const t = {
      id: Date.now().toString(),
      name: name.trim(),
      tiers: Object.fromEntries(currentDisplayPhotos.map(p => [p.name, p.tier])),
      variationId: currentSelectedVariationId,
    }
    setSavedTemplates(prev => {
      const updated = [t, ...prev]
      saveLS(TEMPLATES_KEY, updated)
      return updated
    })
  }, [])

  // ── Tell context when Gallery tab is active ───────────────────
  const setGalleryActive = useCallback((active) => {
    galleryActiveRef.current = active
  }, [])

  const clearNotify = useCallback(() => {
    setNotifyReady(null)
  }, [])

  // ── AI arc generation (survives tab switches) ─────────────────
  const generateArc = useCallback(async (photos) => {
    if (!photos.length) return

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      setStatus({ state: 'error', msg: 'Missing VITE_ANTHROPIC_API_KEY — check Vercel env vars' })
      return
    }

    // Clear any previous notify
    setNotifyReady(null)

    const BATCH_SIZE = 20
    const batches = []
    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
      batches.push(photos.slice(i, i + BATCH_SIZE).map((p, j) => ({ photo: p, globalIndex: i + j })))
    }

    const estimatedMinutes = Math.ceil((batches.length * 15) / 60)
    setStatus({
      state: 'loading',
      msg: `Analyzing ${photos.length} photos — this will take about ${estimatedMinutes} minutes. Do not close this tab.`,
    })

    // ── Pass 1: Analyze every batch ────────────────────────────
    const allPhotoAnalysis = []

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b]
      const validBatch = batch.filter(item => item.photo.file)

      if (!validBatch.length) {
        batch.forEach(item => {
          allPhotoAnalysis.push({
            global_index: item.globalIndex,
            category: guessCategoryFromName(item.photo.name),
            orientation: item.photo.orientation || 'landscape',
            hero_score: item.photo.hero_score || 5,
            energy: 'medium',
            notes: item.photo.notes || '',
          })
        })
        continue
      }

      setStatus({
        state: 'loading',
        msg: `Analyzing batch ${b + 1} of ${batches.length} — ${Math.round((b / batches.length) * 100)}% complete`,
      })

      const contentBlocks = []
      for (let i = 0; i < validBatch.length; i++) {
        const b64 = await fileToBase64(validBatch[i].photo.file)
        const mt = validBatch[i].photo.file.type || 'image/jpeg'
        contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: b64 } })
        contentBlocks.push({ type: 'text', text: `Photo ${i} (global index ${validBatch[i].globalIndex}): "${validBatch[i].photo.name}"` })
      }

      contentBlocks.push({
        type: 'text',
        text: `Analyze these ${validBatch.length} wedding photos. Return ONLY a JSON array. Start with [ and end with ]. No wrapper object, no markdown, no extra text.

[
  {
    "global_index": ${validBatch[0].globalIndex},
    "category": "ceremony",
    "orientation": "landscape",
    "hero_score": 8,
    "energy": "high",
    "notes": "short lowercase description"
  }
]

category: "getting ready" | "ceremony" | "portraits" | "reception" | "details"
orientation: "landscape" | "portrait"
hero_score: 1-10 (10 = would lead a CALENROSE Instagram post, 1 = pure supporting detail)
energy: "quiet" | "medium" | "high"
notes: 3-5 words lowercase plain ASCII only

Return exactly ${validBatch.length} objects in the same order as presented.`,
      })

      let batchResult = null
      let attempts = 0
      const MAX_ATTEMPTS = 5

      while (attempts < MAX_ATTEMPTS && !batchResult) {
        attempts++
        try {
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              messages: [{ role: 'user', content: contentBlocks }],
            }),
          })

          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}))
            const msg = err?.error?.message || `API ${resp.status}`
            if (resp.status === 429 && attempts < MAX_ATTEMPTS) {
              setStatus({ state: 'loading', msg: `Rate limit hit on batch ${b + 1} — waiting 60 seconds...` })
              await new Promise(resolve => setTimeout(resolve, 60000))
              continue
            }
            throw new Error(msg)
          }

          const data = await resp.json()
          const raw = data.content?.map(c => c.text || '').join('') || ''
          const start = raw.indexOf('[')
          const end = raw.lastIndexOf(']')
          if (start === -1 || end <= start) throw new Error('No JSON array in response')

          const normalized = raw.slice(start, end + 1)
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\u2014|\u2013/g, '-')

          batchResult = JSON.parse(normalized)

        } catch (err) {
          if (attempts >= MAX_ATTEMPTS) {
            console.warn(`Batch ${b + 1} failed after ${MAX_ATTEMPTS} attempts:`, err.message)
            batchResult = batch.map(item => ({
              global_index: item.globalIndex,
              category: guessCategoryFromName(item.photo.name),
              orientation: 'landscape',
              hero_score: 5,
              energy: 'medium',
              notes: '',
            }))
          } else {
            setStatus({ state: 'loading', msg: `Batch ${b + 1} retrying...` })
            await new Promise(resolve => setTimeout(resolve, 15000))
          }
        }
      }

      if (batchResult) allPhotoAnalysis.push(...batchResult)

      if (b < batches.length - 1) {
        setStatus({
          state: 'loading',
          msg: `Batch ${b + 1} of ${batches.length} complete — ${Math.round(((b + 1) / batches.length) * 100)}% · pausing to respect rate limits...`,
        })
        await new Promise(resolve => setTimeout(resolve, 15000))
      }
    }

    // ── Build enriched photos ─────────────────────────────────
    const enriched = photos.map((p, i) => {
      const analysis = allPhotoAnalysis.find(a => a.global_index === i)
      return {
        ...p,
        category: analysis?.category || p.category || guessCategoryFromName(p.name),
        orientation: analysis?.orientation || p.orientation || 'landscape',
        hero_score: analysis?.hero_score || p.hero_score || 5,
        energy: analysis?.energy || 'medium',
        notes: analysis?.notes || p.notes || '',
      }
    })

    basePhotosRef.current = enriched
    setPhotosRaw(enriched)

    // ── Pass 2: Creative sequencing (text only) ───────────────
    setStatus({ state: 'loading', msg: `All batches complete — waiting 60 seconds before building sequences...` })
    await new Promise(resolve => setTimeout(resolve, 60000))
    setStatus({ state: 'loading', msg: `Creating story arc variations for ${enriched.length} photos...` })

    let aiResult = null
    let rawText

    try {
      const catChar = { 'getting ready':'g', 'ceremony':'c', 'portraits':'p', 'reception':'r', 'details':'d' }
      const engChar = { 'high':'h', 'medium':'m', 'quiet':'q' }

      const photoSummary = enriched.map((p, i) => {
        const cat = catChar[p.category] || 'd'
        const ori = p.orientation === 'portrait' ? 'v' : 'l'
        const score = p.hero_score || 5
        const eng = engChar[p.energy] || 'm'
        return `${i}:${cat}${ori}${score}${eng}`
      }).join(' ')

      const stats = { categories: {}, energies: {}, orientations: {} }
      enriched.forEach(p => {
        stats.categories[p.category] = (stats.categories[p.category] || 0) + 1
        stats.energies[p.energy] = (stats.energies[p.energy] || 0) + 1
        stats.orientations[p.orientation] = (stats.orientations[p.orientation] || 0) + 1
      })

      const sequencingPrompt = `You are the creative director for CALENROSE, a NYC wedding photography duo. Editorial, documentary, visceral. Published in Vogue. Both former professional dancers. Philosophy: memory is non-linear. Sequence by feeling not clock.

You have analyzed all ${enriched.length} photos from this wedding. Here is the breakdown:
Categories: ${JSON.stringify(stats.categories)}
Energy levels: ${JSON.stringify(stats.energies)}
Orientations: ${JSON.stringify(stats.orientations)}

Full analysis (format: index:category orientation score energy):
g=getting ready c=ceremony p=portraits r=reception d=details
l=landscape v=portrait  score=1-10  h=high m=medium q=quiet
${photoSummary}

Instead of returning a numbered sequence, return SEQUENCING RULES that describe HOW to arrange these photos. The app will apply your rules algorithmically to all ${enriched.length} photos.

Return ONLY a JSON object. Start with { end with }. No markdown. No backticks.

{
  "arc_summary": "2-3 sentences about the emotional shape of this wedding day",
  "variations": [
    {
      "id": "A",
      "name": "short lowercase title",
      "description": "2 sentences: editorial argument + why it fits CALENROSE",
      "creative_direction": "one sentence in their Instagram voice",
      "rules": {
        "opening_category": "details",
        "opening_energy": "quiet",
        "opening_count": 2,
        "category_weights": {"getting ready": 1, "ceremony": 5, "portraits": 4, "reception": 3, "details": 2},
        "energy_pattern": "qmhqmhqmh",
        "hero_min_score": 8,
        "hero_categories": ["ceremony", "portraits"],
        "cut_max_score": 3,
        "prefer_alternating_orientation": true,
        "closing_energy": "quiet",
        "closing_category": "details",
        "closing_count": 2
      }
    },
    {
      "id": "B",
      "name": "different title",
      "description": "different editorial argument",
      "creative_direction": "different sentence",
      "rules": {
        "opening_category": "reception",
        "opening_energy": "high",
        "opening_count": 1,
        "category_weights": {"getting ready": 2, "ceremony": 3, "portraits": 3, "reception": 5, "details": 2},
        "energy_pattern": "hmqhmqhmq",
        "hero_min_score": 7,
        "hero_categories": ["reception", "ceremony"],
        "cut_max_score": 4,
        "prefer_alternating_orientation": false,
        "closing_energy": "medium",
        "closing_category": "portraits",
        "closing_count": 3
      }
    },
    {
      "id": "C",
      "name": "different title",
      "description": "different editorial argument",
      "creative_direction": "different sentence",
      "rules": {
        "opening_category": "ceremony",
        "opening_energy": "high",
        "opening_count": 1,
        "category_weights": {"getting ready": 3, "ceremony": 5, "portraits": 2, "reception": 4, "details": 1},
        "energy_pattern": "hqmhqmhqm",
        "hero_min_score": 9,
        "hero_categories": ["ceremony"],
        "cut_max_score": 3,
        "prefer_alternating_orientation": true,
        "closing_energy": "quiet",
        "closing_category": "getting ready",
        "closing_count": 2
      }
    }
  ]
}

Rules explanation:
- opening_category/energy/count: which photos open the gallery
- category_weights: relative preference per category (higher = surfaces earlier and more often)
- energy_pattern: string of q/m/h defining repeating energy rhythm across full sequence
- hero_min_score: minimum score to assign hero tier (full-width display)
- hero_categories: categories that get priority for hero promotion
- cut_max_score: maximum score to assign cut tier (hidden)
- prefer_alternating_orientation: try to alternate landscape/portrait
- closing_energy/category/count: which photos close the gallery

Make each variation genuinely different. Variation A: unexpected opener, non-linear memory, CALENROSE signature. Variation B: pure visual rhythm, energy and contrast driving everything. Variation C: start at peak emotion and work outward in both directions.`

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          messages: [{ role: 'user', content: sequencingPrompt }],
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API ${resp.status}`)
      }

      const data = await resp.json()
      rawText = data.content?.map(c => c.text || '').join('') || ''
      console.log('Sequencing response (first 300 chars):', rawText.slice(0, 300))

      const normalized = rawText
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2014|\u2013/g, '-')

      const start = normalized.indexOf('{')
      const end = normalized.lastIndexOf('}')
      if (start === -1 || end <= start) throw new Error('No JSON in sequencing response')

      aiResult = JSON.parse(normalized.slice(start, end + 1))

    } catch (err) {
      console.error('Pass 2 sequencing failed:', err.message)
      try { console.error('Pass 2 raw (first 300):', rawText?.slice(0, 300)) } catch {}
      setStatus({ state: 'warn', msg: `Analyzed ${enriched.length} photos — sequencing failed (${err.message}), using smart fallback` })
    }

    // ── Apply results ─────────────────────────────────────────
    let finalVariations

    if (aiResult?.variations?.length) {
      finalVariations = aiResult.variations.map(v => {
        const fullOrder = v.rules
          ? applyRulesToPhotos(v.rules, enriched)
          : buildFullOrder(v.order || [], [], enriched.length)
        const tiers = {}
        enriched.forEach((p, i) => {
          const score = p.hero_score || 5
          const r = v.rules || {}
          const isCut = score <= (r.cut_max_score || 3)
          const isHeroScore = score >= (r.hero_min_score || 8)
          const isHeroCat = (r.hero_categories || []).includes(p.category)
          tiers[String(i)] = isCut ? 'cut' : (isHeroScore || isHeroCat) ? 'hero' : 'supporting'
        })
        return { ...v, fullOrder, tiers }
      })
      setVariations(finalVariations)
      setSelectedVariationId('A')
      applyVariationFullInner(finalVariations[0], enriched)
      await persist(enriched, finalVariations)
      setStatus({ state: 'done', msg: aiResult.arc_summary || `${enriched.length} photos sequenced` })
    } else {
      // Fallback: generate 3 meaningful variations from batch analysis data
      const byScore = [...enriched.keys()].sort((a, b) =>
        (enriched[b].hero_score || 5) - (enriched[a].hero_score || 5)
      )
      const high  = enriched.map((_, i) => i).filter(i => enriched[i].energy === 'high')
      const quiet = enriched.map((_, i) => i).filter(i => enriched[i].energy !== 'high')
      const varB = []
      const maxB = Math.max(high.length, quiet.length)
      for (let i = 0; i < maxB; i++) {
        if (high[i]  !== undefined) varB.push(high[i])
        if (quiet[i] !== undefined) varB.push(quiet[i])
      }
      const inB = new Set(varB)
      enriched.forEach((_, i) => { if (!inB.has(i)) varB.push(i) })

      const catSeq = ['ceremony', 'portraits', 'getting ready', 'reception', 'details']
      const varC = catSeq.flatMap(cat =>
        enriched.map((_, i) => i)
          .filter(i => (enriched[i].category || 'details') === cat)
          .sort((a, b) => (enriched[b].hero_score || 5) - (enriched[a].hero_score || 5))
      )
      const inC = new Set(varC)
      enriched.forEach((_, i) => { if (!inC.has(i)) varC.push(i) })

      const makeTiers = (order) => Object.fromEntries(
        order.map(idx => {
          const s = enriched[idx]?.hero_score || 5
          return [String(idx), s >= 8 ? 'hero' : s <= 3 ? 'cut' : 'supporting']
        })
      )

      finalVariations = [
        {
          id: 'A', name: 'strongest first',
          description: 'Photos ordered by the emotional impact scores from AI analysis. Your highest-scoring frames lead, building the gallery around what the analysis found most compelling.',
          creative_direction: 'the strongest frames, let forward',
          fullOrder: byScore, tiers: makeTiers(byScore),
        },
        {
          id: 'B', name: 'energy rhythm',
          description: 'High and quiet energy frames alternate throughout — intensity balanced by stillness, movement balanced by calm. A visual rhythm across all frames.',
          creative_direction: 'tension and release, all the way through',
          fullOrder: varB, tiers: makeTiers(varB),
        },
        {
          id: 'C', name: 'ceremony anchor',
          description: 'The ceremony leads, followed by portraits, getting ready, reception, and details. A non-chronological arc that puts the most sacred moment first and radiates outward.',
          creative_direction: 'the vows at the center of everything',
          fullOrder: varC, tiers: makeTiers(varC),
        },
      ]
      setVariations(finalVariations)
      setSelectedVariationId('A')
      applyVariationFullInner(finalVariations[0], enriched)
      await persist(enriched, finalVariations)
    }

    const summary = aiResult?.arc_summary || `${enriched.length} photos analyzed`
    setStatus({ state: 'done', msg: summary })

    // If the user navigated away, trigger the ready notification
    if (!galleryActiveRef.current) {
      setNotifyReady({ count: enriched.length })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    // State
    photos, setPhotosRaw,
    variations,
    selectedVariationId, setSelectedVariationId,
    displayPhotos,
    status,
    savedTemplates, setSavedTemplates,
    notifyReady,
    // Actions
    handleFiles,
    clearAll,
    applyVariationFull,
    handleSelectVariation,
    handleTierClick,
    handleRestoreCut,
    saveTemplate,
    generateArc,
    setGalleryActive,
    clearNotify,
  }

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  )
}

export function useGallery() {
  const ctx = useContext(GalleryContext)
  if (!ctx) throw new Error('useGallery must be used inside GalleryProvider')
  return ctx
}
