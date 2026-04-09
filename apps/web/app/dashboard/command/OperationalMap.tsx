"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'

export type UnitForMap = {
  id: string
  name: string
  code: string
  branch: string
  status: string
  xCoord: number
  yCoord: number
  readinessScore?: number
  supplyScore?: number
  moraleScore?: number
}

export type ThreatForMap = {
  id: string
  name: string
  threatType: string
  severity: number
  confidence: number
  xCoord: number
  yCoord: number
  status: string | null
}

export type LogisticsMissionForMap = {
  id: string
  scenarioRunId: string
  transportMode: string
  status: string | null
  etaMinutes: number
  createdAt: string
  fromNode?: { id: string; name: string; xCoord: number; yCoord: number } | null
  toNode?: { id: string; name: string; xCoord: number; yCoord: number } | null
}

export type OrderForMap = {
  id: string
  orderType: string
  priority: number
  detailsJson: string | null
  description?: string | null
  unitId?: string | null
  unit?: { id: string } | null
  targetUnit?: { id: string } | null
}

function branchColor(branch: string) {
  switch (branch) {
    case 'land':
      return '#166534'
    case 'sea':
      return '#1e3a8a'
    case 'air':
      return '#38bdf8'
    case 'logistics':
      return '#f97316'
    default:
      return '#e5e7eb'
  }
}

function branchIconUrl(branch: string) {
  switch (branch) {
    case 'land':
      return 'https://cdn-icons-png.flaticon.com/512/14247/14247072.png'
    case 'sea':
      return 'https://cdn-icons-png.flaticon.com/512/2646/2646893.png'
    case 'air':
      return 'https://cdn-icons-png.flaticon.com/512/77/77147.png'
    case 'logistics':
      return 'https://cdn-icons-png.flaticon.com/512/11252/11252565.png'
    default:
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="white"/></svg>'
  }
}

function computeBounds(points: Array<{ xCoord: number; yCoord: number }>) {
  if (!points.length) return null
  let minX = points[0].xCoord
  let maxX = points[0].xCoord
  let minY = points[0].yCoord
  let maxY = points[0].yCoord
  for (const p of points) {
    minX = Math.min(minX, p.xCoord)
    maxX = Math.max(maxX, p.xCoord)
    minY = Math.min(minY, p.yCoord)
    maxY = Math.max(maxY, p.yCoord)
  }
  return { minX, minY, maxX, maxY }
}

type LayerToggles = {
  units: boolean
  threats: boolean
  routes: boolean
  threatZones: boolean
  radar: boolean
  ao: boolean
  weather: boolean
}

export type OperationalMapMode = 'default' | 'command'

type GeoJsonFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, any>>

function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let x = h >>> 0
  return () => {
    x ^= x << 13
    x ^= x >>> 17
    x ^= x << 5
    return (x >>> 0) / 4294967296
  }
}

function circlePolygon(lng: number, lat: number, radiusMeters: number, steps = 64): GeoJSON.Polygon {
  const coords: Array<[number, number]> = []
  const latRad = (lat * Math.PI) / 180
  const metersPerDegLat = 111320
  const metersPerDegLng = Math.max(1, metersPerDegLat * Math.cos(latRad))
  const dLat = radiusMeters / metersPerDegLat
  const dLng = radiusMeters / metersPerDegLng
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    coords.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function tryParseJson(s: string | null): any | null {
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

function extractCoord(obj: any): [number, number] | null {
  if (!obj || typeof obj !== 'object') return null
  const x = obj.xCoord ?? obj.lng ?? obj.lon ?? obj.longitude ?? obj.x
  const y = obj.yCoord ?? obj.lat ?? obj.latitude ?? obj.y
  if (typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)) return [x, y]
  if (typeof x === 'string' && typeof y === 'string') {
    const nx = Number(x)
    const ny = Number(y)
    if (Number.isFinite(nx) && Number.isFinite(ny)) return [nx, ny]
  }
  return null
}

function extractLineStringsFromOrder(o: OrderForMap, unitsById: Map<string, UnitForMap>): Array<{ coords: Array<[number, number]>; kind: string }> {
  const out: Array<{ coords: Array<[number, number]>; kind: string }> = []
  const parsed = tryParseJson(o.detailsJson)
  const unitId = o.targetUnit?.id ?? o.unit?.id ?? o.unitId ?? null
  const unit = unitId ? unitsById.get(unitId) : null

  const paths: any[] = []
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.path)) paths.push(parsed.path)
    if (Array.isArray(parsed.waypoints)) paths.push(parsed.waypoints)
    if (Array.isArray(parsed.route)) paths.push(parsed.route)
  }

  for (const p of paths) {
    const coords: Array<[number, number]> = []
    for (const item of p as any[]) {
      if (Array.isArray(item) && item.length >= 2) {
        const lng = Number(item[0])
        const lat = Number(item[1])
        if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat])
        continue
      }
      const c = extractCoord(item)
      if (c) coords.push(c)
    }
    if (coords.length >= 2) out.push({ coords, kind: 'order' })
  }

  const from = parsed ? extractCoord(parsed.from) : null
  const to = parsed ? extractCoord(parsed.to ?? parsed.destination ?? parsed.target) : null
  if (!out.length && unit && to) out.push({ coords: [[unit.xCoord, unit.yCoord], to], kind: 'order' })
  if (!out.length && from && to) out.push({ coords: [from, to], kind: 'order' })

  if (!out.length && o.description) {
    const m = [...o.description.matchAll(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/g)]
    const coords: Array<[number, number]> = []
    for (const mm of m.slice(0, 10)) {
      const lng = Number(mm[1])
      const lat = Number(mm[2])
      if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat])
    }
    if (coords.length >= 2) out.push({ coords, kind: 'order' })
  }

  return out
}

export function OperationalMap({
  units,
  threats,
  scenarioId,
  scenarioRunId,
  orders,
  logisticsMissions,
  height,
  mode = 'default',
  showControls,
  showLegend,
  initialToggles
}: {
  units: UnitForMap[]
  threats: ThreatForMap[]
  scenarioId?: string | null
  scenarioRunId?: string | null
  orders?: OrderForMap[] | null
  logisticsMissions?: LogisticsMissionForMap[] | null
  height?: number | string
  mode?: OperationalMapMode
  showControls?: boolean
  showLegend?: boolean
  initialToggles?: Partial<LayerToggles>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const unitMarkersRef = useRef<maplibregl.Marker[]>([])
  const threatMarkersRef = useRef<maplibregl.Marker[]>([])
  const didFitRef = useRef(false)

  const [toggles, setToggles] = useState<LayerToggles>(() => ({
    units: true,
    threats: true,
    routes: true,
    threatZones: true,
    radar: true,
    ao: true,
    weather: false,
    ...(initialToggles ?? {})
  }))

  const resolvedShowControls = showControls ?? mode !== 'command'
  const resolvedShowLegend = showLegend ?? mode !== 'command'
  const [layerTab, setLayerTab] = useState<'ALL' | 'UNITS' | 'THREATS' | 'ROUTES' | 'AO'>('ALL')

  const center = useMemo<[number, number]>(() => {
    const points = [...units, ...threats]
    if (!points.length) return [110.0, -2.0]
    const avgX = points.reduce((acc, u) => acc + u.xCoord, 0) / points.length
    const avgY = points.reduce((acc, u) => acc + u.yCoord, 0) / points.length
    return [avgX, avgY]
  }, [units, threats])

  const seedKey = useMemo(() => scenarioRunId ?? scenarioId ?? `${center[0].toFixed(4)}:${center[1].toFixed(4)}`, [scenarioRunId, scenarioId, center])

  const geo = useMemo(() => {
    const unitsById = new Map(units.map((u) => [u.id, u]))
    const routeFeatures: GeoJSON.Feature<GeoJSON.LineString, Record<string, any>>[] = []
    for (const lm of logisticsMissions ?? []) {
      const a = lm.fromNode ? [lm.fromNode.xCoord, lm.fromNode.yCoord] : null
      const b = lm.toNode ? [lm.toNode.xCoord, lm.toNode.yCoord] : null
      if (!a || !b) continue
      routeFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [a, b] },
        properties: { kind: 'logistics', color: '#f97316', width: 3, dash: 'solid', label: `${lm.transportMode}` }
      })
    }
    for (const o of orders ?? []) {
      const lines = extractLineStringsFromOrder(o, unitsById)
      for (const line of lines) {
        routeFeatures.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: line.coords },
          properties: { kind: line.kind, color: '#38bdf8', width: 2, dash: 'dash', label: `${o.orderType} prio ${o.priority}` }
        })
      }
    }

    const threatZoneFeatures: GeoJSON.Feature<GeoJSON.Polygon, Record<string, any>>[] = threats.map((t) => {
      const radius = 6000 + clamp(t.severity, 1, 5) * 4500
      return {
        type: 'Feature',
        geometry: circlePolygon(t.xCoord, t.yCoord, radius, 72),
        properties: { severity: t.severity, color: '#ef4444', outline: '#fb7185', label: t.name }
      }
    })

    const radarFeatures: GeoJSON.Feature<GeoJSON.Polygon, Record<string, any>>[] = units.map((u) => {
      const base = u.branch === 'air' ? 24000 : u.branch === 'sea' ? 18000 : u.branch === 'land' ? 12000 : u.branch === 'logistics' ? 9000 : 10000
      return {
        type: 'Feature',
        geometry: circlePolygon(u.xCoord, u.yCoord, base, 72),
        properties: { branch: u.branch, color: branchColor(u.branch) }
      }
    })

    const bounds = computeBounds([...units, ...threats])
    const aoFeatures: GeoJSON.Feature<GeoJSON.Polygon, Record<string, any>>[] = []
    if (bounds) {
      const padX = Math.max(0.08, (bounds.maxX - bounds.minX) * 0.2)
      const padY = Math.max(0.08, (bounds.maxY - bounds.minY) * 0.2)
      const minX = bounds.minX - padX
      const maxX = bounds.maxX + padX
      const minY = bounds.minY - padY
      const maxY = bounds.maxY + padY
      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2
      const sectors: Array<{ id: string; poly: Array<[number, number]>; color: string }> = [
        { id: 'NW', poly: [[minX, midY], [midX, midY], [midX, maxY], [minX, maxY], [minX, midY]], color: '#fca5a5' },
        { id: 'NE', poly: [[midX, midY], [maxX, midY], [maxX, maxY], [midX, maxY], [midX, midY]], color: '#fdba74' },
        { id: 'SW', poly: [[minX, minY], [midX, minY], [midX, midY], [minX, midY], [minX, minY]], color: '#bbf7d0' },
        { id: 'SE', poly: [[midX, minY], [maxX, minY], [maxX, midY], [midX, midY], [midX, minY]], color: '#bae6fd' }
      ]
      for (const s of sectors) {
        aoFeatures.push({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [s.poly] },
          properties: { sector: s.id, outline: s.color }
        })
      }
      aoFeatures.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]] },
        properties: { sector: 'AO', outline: '#e5e7eb' }
      })
    }

    const weatherFeatures: GeoJSON.Feature<GeoJSON.Polygon, Record<string, any>>[] = []
    const rng = seededRng(seedKey)
    const weatherCount = 10
    for (let i = 0; i < weatherCount; i++) {
      const r = 12000 + rng() * 38000
      const dx = (rng() - 0.5) * 0.8
      const dy = (rng() - 0.5) * 0.6
      const intensity = clamp(rng(), 0.05, 1)
      weatherFeatures.push({
        type: 'Feature',
        geometry: circlePolygon(center[0] + dx, center[1] + dy, r, 64),
        properties: { intensity }
      })
    }

    return {
      routes: { type: 'FeatureCollection', features: routeFeatures } as GeoJsonFeatureCollection,
      threatZones: { type: 'FeatureCollection', features: threatZoneFeatures } as GeoJsonFeatureCollection,
      radar: { type: 'FeatureCollection', features: radarFeatures } as GeoJsonFeatureCollection,
      ao: { type: 'FeatureCollection', features: aoFeatures } as GeoJsonFeatureCollection,
      weather: { type: 'FeatureCollection', features: weatherFeatures } as GeoJsonFeatureCollection
    }
  }, [units, threats, orders, logisticsMissions, seedKey, center])

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    const rasterPaint =
      mode === 'command'
        ? ({
            'raster-opacity': 0.82,
            'raster-saturation': -1,
            'raster-contrast': 0.35,
            'raster-brightness-min': 0.12,
            'raster-brightness-max': 0.7
          } as const)
        : ({
            'raster-opacity': 0.86,
            'raster-saturation': -0.25,
            'raster-contrast': 0.1
          } as const)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0b1220' }
          },
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            paint: rasterPaint as any
          }
        ]
      },
      center,
      zoom: 5
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map

    const ensure = () => {
      const srcIds = ['cop-routes', 'cop-threatZones', 'cop-radar', 'cop-ao', 'cop-weather']
      if (!map.getSource('cop-routes')) {
        map.addSource('cop-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('cop-routes-line')) {
        map.addLayer({
          id: 'cop-routes-line',
          type: 'line',
          source: 'cop-routes',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#38bdf8'],
            'line-width': ['coalesce', ['get', 'width'], 2],
            'line-opacity': 0.9
          }
        })
      }

      if (!map.getSource('cop-threatZones')) {
        map.addSource('cop-threatZones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('cop-threatZones-fill')) {
        map.addLayer({
          id: 'cop-threatZones-fill',
          type: 'fill',
          source: 'cop-threatZones',
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#ef4444'],
            'fill-opacity': 0.16
          }
        })
      }
      if (!map.getLayer('cop-threatZones-line')) {
        map.addLayer({
          id: 'cop-threatZones-line',
          type: 'line',
          source: 'cop-threatZones',
          paint: {
            'line-color': ['coalesce', ['get', 'outline'], '#fb7185'],
            'line-width': 1.4,
            'line-opacity': 0.7
          }
        })
      }

      if (!map.getSource('cop-radar')) {
        map.addSource('cop-radar', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('cop-radar-fill')) {
        map.addLayer({
          id: 'cop-radar-fill',
          type: 'fill',
          source: 'cop-radar',
          paint: {
            'fill-color': ['coalesce', ['get', 'color'], '#38bdf8'],
            'fill-opacity': 0.1
          }
        })
      }
      if (!map.getLayer('cop-radar-line')) {
        map.addLayer({
          id: 'cop-radar-line',
          type: 'line',
          source: 'cop-radar',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#38bdf8'],
            'line-width': 1,
            'line-opacity': 0.35
          }
        })
      }

      if (!map.getSource('cop-ao')) {
        map.addSource('cop-ao', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('cop-ao-line')) {
        map.addLayer({
          id: 'cop-ao-line',
          type: 'line',
          source: 'cop-ao',
          paint: {
            'line-color': ['coalesce', ['get', 'outline'], '#e5e7eb'],
            'line-width': 1.6,
            'line-opacity': 0.8,
            'line-dasharray': [2, 2]
          }
        })
      }

      if (!map.getSource('cop-weather')) {
        map.addSource('cop-weather', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      }
      if (!map.getLayer('cop-weather-fill')) {
        map.addLayer({
          id: 'cop-weather-fill',
          type: 'fill',
          source: 'cop-weather',
          paint: {
            'fill-color': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'intensity'], 0],
              0,
              '#0ea5e9',
              0.4,
              '#38bdf8',
              0.7,
              '#a78bfa',
              1,
              '#e879f9'
            ],
            'fill-opacity': 0.12
          }
        })
      }

      for (const id of srcIds) {
        const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined
        if (src && typeof (src as any).setData !== 'function') {
          ;(src as any).setData = (data: any) => {
            map.removeSource(id)
            map.addSource(id, { type: 'geojson', data })
          }
        }
      }
    }

    if (map.isStyleLoaded()) ensure()
    else map.once('load', ensure)

    return () => {
      unitMarkersRef.current.forEach((m) => m.remove())
      threatMarkersRef.current.forEach((m) => m.remove())
      unitMarkersRef.current = []
      threatMarkersRef.current = []
      map.remove()
      mapRef.current = null
      didFitRef.current = false
    }
  }, [center, mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    unitMarkersRef.current.forEach((m) => m.remove())
    threatMarkersRef.current.forEach((m) => m.remove())
    unitMarkersRef.current = []
    threatMarkersRef.current = []

    for (const u of units) {
      const el = document.createElement('div')
      el.className = 'marker-unit-icon'
      el.style.display = toggles.units ? '' : 'none'
      const glyph = document.createElement('span')
      glyph.className = 'marker-unit-glyph'
      ;(glyph.style as unknown as { WebkitMaskImage?: string }).WebkitMaskImage = `url("${branchIconUrl(u.branch)}")`
      glyph.style.maskImage = `url("${branchIconUrl(u.branch)}")`
      glyph.style.background = branchColor(u.branch)
      el.appendChild(glyph)
      el.title = `${u.code} - ${u.name} (${u.branch}/${u.status})`

      const marker = new maplibregl.Marker({ element: el }).setLngLat([u.xCoord, u.yCoord]).addTo(map)
      unitMarkersRef.current.push(marker)
    }
    for (const t of threats) {
      const el = document.createElement('div')
      el.className = 'marker-threat'
      el.style.display = toggles.threats ? '' : 'none'
      el.title = `${t.name} (${t.threatType}) sev:${t.severity} conf:${t.confidence}`
      const marker = new maplibregl.Marker({ element: el }).setLngLat([t.xCoord, t.yCoord]).addTo(map)
      threatMarkersRef.current.push(marker)
    }

    if (!didFitRef.current) {
      const bounds = computeBounds([...units, ...threats])
      if (bounds) {
        map.fitBounds(
          [
            [bounds.minX, bounds.minY],
            [bounds.maxX, bounds.maxY]
          ],
          { padding: 80, maxZoom: 9, duration: 0 }
        )
        didFitRef.current = true
      }
    }
  }, [units, threats, toggles.units, toggles.threats])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const applyData = () => {
      const routesSrc = map.getSource('cop-routes') as maplibregl.GeoJSONSource | undefined
      const zonesSrc = map.getSource('cop-threatZones') as maplibregl.GeoJSONSource | undefined
      const radarSrc = map.getSource('cop-radar') as maplibregl.GeoJSONSource | undefined
      const aoSrc = map.getSource('cop-ao') as maplibregl.GeoJSONSource | undefined
      const weatherSrc = map.getSource('cop-weather') as maplibregl.GeoJSONSource | undefined
      routesSrc?.setData(geo.routes as any)
      zonesSrc?.setData(geo.threatZones as any)
      radarSrc?.setData(geo.radar as any)
      aoSrc?.setData(geo.ao as any)
      weatherSrc?.setData(geo.weather as any)
    }

    if (map.isStyleLoaded()) applyData()
    else map.once('load', applyData)
  }, [geo])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const setVis = (layerId: string, on: boolean) => {
      if (!map.getLayer(layerId)) return
      map.setLayoutProperty(layerId, 'visibility', on ? 'visible' : 'none')
    }
    setVis('cop-routes-line', toggles.routes)
    setVis('cop-threatZones-fill', toggles.threatZones)
    setVis('cop-threatZones-line', toggles.threatZones)
    setVis('cop-radar-fill', toggles.radar)
    setVis('cop-radar-line', toggles.radar)
    setVis('cop-ao-line', toggles.ao)
    setVis('cop-weather-fill', toggles.weather)
  }, [toggles])

  useEffect(() => {
    if (mode !== 'command') return
    const applyTab = (tab: typeof layerTab) => {
      if (tab === 'ALL') {
        setToggles((p) => ({ ...p, units: true, threats: true, routes: true, threatZones: true, radar: true, ao: true }))
        return
      }
      if (tab === 'UNITS') {
        setToggles((p) => ({ ...p, units: true, threats: false, routes: false, threatZones: false, radar: true, ao: false }))
        return
      }
      if (tab === 'THREATS') {
        setToggles((p) => ({ ...p, units: false, threats: true, routes: false, threatZones: true, radar: false, ao: false }))
        return
      }
      if (tab === 'ROUTES') {
        setToggles((p) => ({ ...p, units: true, threats: false, routes: true, threatZones: false, radar: false, ao: true }))
        return
      }
      if (tab === 'AO') {
        setToggles((p) => ({ ...p, units: false, threats: false, routes: false, threatZones: false, radar: false, ao: true }))
      }
    }
    applyTab(layerTab)
  }, [layerTab, mode])

  const resolvedHeight = height ?? 540

  return (
    <div className={mode === 'command' ? 'map-shell map-shell-command' : 'map-shell'} style={{ height: resolvedHeight }}>
      <div ref={containerRef} className="map-canvas" style={{ width: '100%', height: '100%' }} />
      {mode === 'command' ? <div className="cmd-map-reticle" /> : null}
      {mode === 'command' ? (
        <div className="cmd-map-layers map-overlay">
          <div className="cmd-map-layers-title">MAP LAYERS</div>
          <div className="cmd-map-layers-tabs">
            {(['ALL', 'UNITS', 'THREATS', 'ROUTES', 'AO'] as const).map((t) => (
              <button key={t} type="button" className="cmd-tab" data-active={layerTab === t} onClick={() => setLayerTab(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {resolvedShowControls ? (
        <div className="map-overlay" style={{ position: 'absolute', left: 12, top: 12, zIndex: 5, background: 'rgba(15, 23, 42, 0.88)', border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 10, color: '#e5e7eb', width: 220 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Layers</div>
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Units</span>
              <input type="checkbox" checked={toggles.units} onChange={(e) => setToggles((p) => ({ ...p, units: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Threats</span>
              <input type="checkbox" checked={toggles.threats} onChange={(e) => setToggles((p) => ({ ...p, threats: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Routes</span>
              <input type="checkbox" checked={toggles.routes} onChange={(e) => setToggles((p) => ({ ...p, routes: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Threat zones</span>
              <input type="checkbox" checked={toggles.threatZones} onChange={(e) => setToggles((p) => ({ ...p, threatZones: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Radar circles</span>
              <input type="checkbox" checked={toggles.radar} onChange={(e) => setToggles((p) => ({ ...p, radar: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>AO sectors</span>
              <input type="checkbox" checked={toggles.ao} onChange={(e) => setToggles((p) => ({ ...p, ao: e.target.checked }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span>Weather</span>
              <input type="checkbox" checked={toggles.weather} onChange={(e) => setToggles((p) => ({ ...p, weather: e.target.checked }))} />
            </label>
          </div>
        </div>
      ) : null}
      {resolvedShowLegend ? (
        <div className="legend map-overlay">
        <div style={{ fontWeight: 700, letterSpacing: 0.2 }}>Legend</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="marker-unit-icon" style={{ width: 22, height: 22 }}>
            <span
              className="marker-unit-glyph"
              style={{
                background: branchColor('land'),
                maskImage: `url("${branchIconUrl('land')}")`,
                WebkitMaskImage: `url("${branchIconUrl('land')}")`
              }}
            />
          </span>
          <span>Land</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="marker-unit-icon" style={{ width: 22, height: 22 }}>
            <span
              className="marker-unit-glyph"
              style={{
                background: branchColor('sea'),
                maskImage: `url("${branchIconUrl('sea')}")`,
                WebkitMaskImage: `url("${branchIconUrl('sea')}")`
              }}
            />
          </span>
          <span>Sea</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="marker-unit-icon" style={{ width: 22, height: 22 }}>
            <span
              className="marker-unit-glyph"
              style={{
                background: branchColor('air'),
                maskImage: `url("${branchIconUrl('air')}")`,
                WebkitMaskImage: `url("${branchIconUrl('air')}")`
              }}
            />
          </span>
          <span>Air</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="marker-unit-icon" style={{ width: 22, height: 22 }}>
            <span
              className="marker-unit-glyph"
              style={{
                background: branchColor('logistics'),
                maskImage: `url("${branchIconUrl('logistics')}")`,
                WebkitMaskImage: `url("${branchIconUrl('logistics')}")`
              }}
            />
          </span>
          <span>Logistics</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="marker-threat" style={{ width: 10, height: 10 }} />
          <span>Threat</span>
        </div>
        <div style={{ height: 1, background: 'rgba(148, 163, 184, 0.18)', margin: '10px 0' }} />
        <div style={{ fontSize: 12, opacity: 0.85, display: 'grid', gap: 4 }}>
          <div>
            <span style={{ display: 'inline-block', width: 18, height: 2, background: '#38bdf8', verticalAlign: 'middle', marginRight: 8 }} />
            Routes (orders)
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 18, height: 2, background: '#f97316', verticalAlign: 'middle', marginRight: 8 }} />
            Routes (logistics)
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 99, background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(251,113,133,0.7)', verticalAlign: 'middle', marginRight: 8 }} />
            Threat zones
          </div>
          <div>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 99, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', verticalAlign: 'middle', marginRight: 8 }} />
            Radar circles
          </div>
        </div>
        </div>
      ) : null}
    </div>
  )
}
