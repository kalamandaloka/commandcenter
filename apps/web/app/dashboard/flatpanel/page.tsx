"use client"

import { useEffect, useRef, useState } from 'react'
import { CommandDashboardShell, type DashboardMapProps } from '@/app/dashboard/command/CommandDashboardShell'

type AoiStatus = 'secure' | 'monitored' | 'danger'
type Aoi = { id: string; name: string; status: AoiStatus; polygon: Array<[number, number]>; center: [number, number] }

const INDONESIA_AOIS: Aoi[] = [
  {
    id: 'natuna',
    name: 'Natuna',
    status: 'danger',
    polygon: [
      [107.0, 2.7],
      [110.0, 2.7],
      [110.0, 5.4],
      [107.0, 5.4]
    ],
    center: [108.6, 4.1]
  },
  {
    id: 'malacca',
    name: 'Selat Malaka',
    status: 'monitored',
    polygon: [
      [98.2, 1.4],
      [102.2, 1.4],
      [102.2, 5.8],
      [98.2, 5.8]
    ],
    center: [100.2, 3.6]
  },
  {
    id: 'java_sea',
    name: 'Laut Jawa',
    status: 'secure',
    polygon: [
      [106.0, -7.5],
      [115.0, -7.5],
      [115.0, -3.0],
      [106.0, -3.0]
    ],
    center: [110.5, -5.2]
  },
  {
    id: 'papua',
    name: 'Papua',
    status: 'monitored',
    polygon: [
      [133.0, -9.5],
      [141.0, -9.5],
      [141.0, -1.0],
      [133.0, -1.0]
    ],
    center: [137.3, -5.0]
  },
  {
    id: 'kalimantan_border',
    name: 'Perbatasan Kalimantan',
    status: 'secure',
    polygon: [
      [112.0, 0.2],
      [118.0, 0.2],
      [118.0, 4.5],
      [112.0, 4.5]
    ],
    center: [115.0, 2.4]
  },
  {
    id: 'sulawesi',
    name: 'Sulawesi',
    status: 'secure',
    polygon: [
      [119.0, -5.2],
      [125.5, -5.2],
      [125.5, 1.6],
      [119.0, 1.6]
    ],
    center: [122.3, -1.9]
  }
]

function aoiColor(status: AoiStatus) {
  if (status === 'danger') return { fill: '#fb7185', outline: '#fb7185' }
  if (status === 'monitored') return { fill: '#f59e0b', outline: '#f59e0b' }
  return { fill: '#38bdf8', outline: '#38bdf8' }
}

function altitudeForBranch(branch: DashboardMapProps['units'][number]['branch']) {
  if (branch === 'air') return 12000
  return 0
}

function CesiumOperationalMap(props: DashboardMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<any>(null)
  const handlerRef = useRef<any>(null)
  const [layerTab, setLayerTab] = useState<'all' | 'units' | 'threats' | 'routes' | 'aoi'>('all')
  const [selected, setSelected] = useState<{ kind: 'unit' | 'aoi' | 'threat'; title: string; sub?: string } | null>(null)

  useEffect(() => {
    let disposed = false
    const init = async () => {
      if (!containerRef.current) return
      if (viewerRef.current) return

      const Cesium = await import('cesium')
      if (disposed) return

      const unpkgBase = 'https://unpkg.com/cesium@1.140.0/Build/Cesium/'
      ;(Cesium as any).buildModuleUrl.setBaseUrl(unpkgBase)

      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        vrButton: false,
        shouldAnimate: true,
        requestRenderMode: true
      } as any)

      viewerRef.current = viewer

      viewer.imageryLayers.removeAll()
      viewer.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({
          url: 'https://a.tile.openstreetmap.org/'
        })
      )

      viewer.scene.globe.enableLighting = true
      viewer.scene.globe.depthTestAgainstTerrain = true
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true
      viewer.scene.fog.enabled = true

      viewer.camera.setView({
        destination: Cesium.Rectangle.fromDegrees(94.0, -12.0, 141.0, 8.0),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-55),
          roll: 0
        }
      })

      const indonesiaRect = Cesium.Rectangle.fromDegrees(94.0, -12.0, 141.0, 8.0)
      const controller = viewer.scene.screenSpaceCameraController
      controller.minimumZoomDistance = 20000
      controller.maximumZoomDistance = 12000000

      let clamping = false
      const clampCamera = () => {
        const c = viewer.camera.positionCartographic
        if (!c) return
        const height = Cesium.Math.clamp(c.height, controller.minimumZoomDistance, controller.maximumZoomDistance)
        const inside = Cesium.Rectangle.contains(indonesiaRect, c)
        if (inside && height === c.height) return
        if (clamping) return
        clamping = true
        const lon = Cesium.Math.clamp(c.longitude, indonesiaRect.west, indonesiaRect.east)
        const lat = Cesium.Math.clamp(c.latitude, indonesiaRect.south, indonesiaRect.north)
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromRadians(lon, lat, height),
          orientation: {
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: viewer.camera.roll
          }
        })
        viewer.scene.requestRender()
        clamping = false
      }

      const onMoveEnd = () => clampCamera()
      ;(viewer as any).__indoMoveEnd = onMoveEnd
      viewer.camera.moveEnd.addEventListener(onMoveEnd)
      clampCamera()

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
      handlerRef.current = handler

      handler.setInputAction((movement: any) => {
        const picked = viewer.scene.pick(movement.position)
        const entity = picked?.id
        const kind = entity?.properties?.kind?.getValue?.()
        if (!kind) return
        const title = entity?.name ? String(entity.name) : 'Selection'
        const sub = entity?.properties?.sub?.getValue?.()
        setSelected({ kind, title, sub: sub ? String(sub) : undefined })

        const focus = entity?.position?.getValue?.(Cesium.JulianDate.now())
        if (focus) {
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromElements(focus.x, focus.y, focus.z),
            duration: 0.9
          })
        } else if (kind === 'aoi') {
          const center = entity?.properties?.center?.getValue?.()
          if (Array.isArray(center) && center.length === 2) {
            viewer.camera.flyTo({
              destination: Cesium.Cartesian3.fromDegrees(center[0], center[1], 1400000),
              duration: 0.9
            })
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      viewer.scene.requestRender()
    }

    void init()
    return () => {
      disposed = true
      try {
        if (handlerRef.current) handlerRef.current.destroy()
      } catch {}
      handlerRef.current = null
      try {
        if (viewerRef.current && (viewerRef.current as any).__indoMoveEnd) {
          viewerRef.current.camera.moveEnd.removeEventListener((viewerRef.current as any).__indoMoveEnd)
        }
        if (viewerRef.current) viewerRef.current.destroy()
      } catch {}
      viewerRef.current = null
    }
  }, [])

  useEffect(() => {
    const apply = async () => {
      const viewer = viewerRef.current
      if (!viewer) return
      const Cesium = await import('cesium')

      const showUnits = layerTab === 'all' || layerTab === 'units'
      const showThreats = layerTab === 'all' || layerTab === 'threats'
      const showAoi = layerTab === 'all' || layerTab === 'aoi'

      const toRemove: any[] = []
      viewer.entities.values.forEach((e: any) => {
        const k = e?.properties?.kind?.getValue?.()
        if (k === 'unit' || k === 'threat' || k === 'aoi') toRemove.push(e)
      })
      toRemove.forEach((e: any) => viewer.entities.remove(e))

      if (showAoi) {
        for (const aoi of INDONESIA_AOIS) {
          const c = aoiColor(aoi.status)
          viewer.entities.add({
            id: `aoi:${aoi.id}`,
            name: `AOI ${aoi.name}`,
            properties: {
              kind: 'aoi',
              sub: `${aoi.status.toUpperCase()}`,
              center: aoi.center
            },
            polygon: {
              hierarchy: Cesium.Cartesian3.fromDegreesArray(aoi.polygon.flat()),
              material: Cesium.Color.fromCssColorString(c.fill).withAlpha(0.14),
              outline: true,
              outlineColor: Cesium.Color.fromCssColorString(c.outline).withAlpha(0.85),
              outlineWidth: 2,
              height: 0
            },
            position: Cesium.Cartesian3.fromDegrees(aoi.center[0], aoi.center[1], 0),
            label: {
              text: aoi.name.toUpperCase(),
              font: '700 12px system-ui, -apple-system, Segoe UI, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#e2e8f0').withAlpha(0.88),
              outlineColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.8),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.55),
              backgroundPadding: new Cesium.Cartesian2(8, 4),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
            }
          })
        }
      }

      const pin = new Cesium.PinBuilder()
      const unitIcon = (branch: DashboardMapProps['units'][number]['branch']) => {
        const color = branch === 'air' ? '#60a5fa' : branch === 'sea' ? '#38bdf8' : branch === 'logistics' ? '#a3e635' : '#22c55e'
        const letter = branch === 'air' ? 'AIR' : branch === 'sea' ? 'SEA' : branch === 'logistics' ? 'LOG' : 'LAND'
        return pin.fromText(letter, Cesium.Color.fromCssColorString(color), 48).toDataURL()
      }
      const threatIcon = pin.fromText('EN', Cesium.Color.fromCssColorString('#fb7185'), 48).toDataURL()

      if (showUnits) {
        for (const u of props.units) {
          const lon = typeof u.xCoord === 'number' ? u.xCoord : null
          const lat = typeof u.yCoord === 'number' ? u.yCoord : null
          if (lon == null || lat == null) continue
          const alt = altitudeForBranch(u.branch)
          const pos = Cesium.Cartesian3.fromDegrees(lon, lat, alt)
          viewer.entities.add({
            id: `unit:${u.id}`,
            name: u.name ?? u.code ?? 'UNIT',
            properties: {
              kind: 'unit',
              sub: `${u.branch.toUpperCase()} • ${u.status ?? '-'}`
            },
            position: pos,
            billboard: {
              image: unitIcon(u.branch),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              scale: 0.9
            },
            label: {
              text: u.code ?? u.name ?? 'UNIT',
              font: '700 12px system-ui, -apple-system, Segoe UI, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#e2e8f0').withAlpha(0.9),
              outlineColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.8),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -44),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.55),
              backgroundPadding: new Cesium.Cartesian2(8, 4),
              heightReference: alt > 0 ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND
            }
          })
        }
      }

      if (showThreats) {
        for (const t of props.threats) {
          const lon = typeof t.xCoord === 'number' ? t.xCoord : null
          const lat = typeof t.yCoord === 'number' ? t.yCoord : null
          if (lon == null || lat == null) continue
          const pos = Cesium.Cartesian3.fromDegrees(lon, lat, 11000)
          viewer.entities.add({
            id: `threat:${t.id}`,
            name: t.name ?? 'ENEMY',
            properties: {
              kind: 'threat',
              sub: `${t.threatType} • sev ${t.severity} • conf ${t.confidence}`
            },
            position: pos,
            billboard: {
              image: threatIcon,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
              scale: 0.9
            },
            label: {
              text: t.name ?? 'ENEMY',
              font: '800 12px system-ui, -apple-system, Segoe UI, sans-serif',
              fillColor: Cesium.Color.fromCssColorString('#fecdd3').withAlpha(0.95),
              outlineColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.85),
              outlineWidth: 3,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -44),
              showBackground: true,
              backgroundColor: Cesium.Color.fromCssColorString('#0b1220').withAlpha(0.55),
              backgroundPadding: new Cesium.Cartesian2(8, 4)
            }
          })
        }
      }

      viewer.scene.requestRender()
    }

    void apply()
  }, [props.units, props.threats, layerTab])

  return (
    <div className="map-shell map-shell-command" style={{ height: props.height }}>
      <div ref={containerRef} className="map-canvas" style={{ width: '100%', height: '100%' }} />
      <div className="cmd-map-reticle" />
      <div className="cmd-map-layers map-overlay">
        <div className="cmd-map-layers-title">MAP LAYERS</div>
        <div className="cmd-map-tabs">
          {(
            [
              ['all', 'ALL'],
              ['units', 'UNITS'],
              ['threats', 'THREATS'],
              ['routes', 'ROUTES'],
              ['aoi', 'AO']
            ] as const
          ).map(([key, label]) => (
            <button key={key} className="cmd-map-tab" data-active={layerTab === key} onClick={() => setLayerTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {selected ? (
        <div className="map-overlay" style={{ left: 12, bottom: 12, right: 'auto', top: 'auto', pointerEvents: 'none' }}>
          <div className="cmd-item" style={{ width: 340, background: 'rgba(7,10,18,0.72)', borderColor: 'rgba(56,189,248,0.28)' }}>
            <div className="cmd-item-row">
              <div className="cmd-item-name">{selected.title}</div>
              <span className="chip">{selected.kind.toUpperCase()}</span>
            </div>
            {selected.sub ? <div className="cmd-item-sub">{selected.sub}</div> : null}
            <div className="cmd-item-meta">Click entity untuk focus. Cesium viewport: Indonesia</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function FlatpanelDashboardPage() {
  return <CommandDashboardShell Map={CesiumOperationalMap} mapWidth={800} mapHeight={600} />
}
