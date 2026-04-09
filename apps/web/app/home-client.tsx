"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default function HomeClient() {
  const router = useRouter()
  const mountRef = useRef<HTMLDivElement | null>(null)
  const leftCardRef = useRef<HTMLDivElement | null>(null)
  const centerCardRef = useRef<HTMLDivElement | null>(null)
  const rightCardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const mountEl = mount
    const leftCardEl = leftCardRef.current
    const centerCardEl = centerCardRef.current
    const rightCardEl = rightCardRef.current

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.zIndex = '2'

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#070a12', 140, 420)

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 2000)
    camera.position.set(0, 85, 160)
    camera.lookAt(0, 25, 0)

    const ambient = new THREE.AmbientLight('#ffffff', 0.55)
    scene.add(ambient)

    const key = new THREE.DirectionalLight('#ffffff', 1.05)
    key.position.set(110, 140, 90)
    key.castShadow = true
    key.shadow.mapSize.width = 2048
    key.shadow.mapSize.height = 2048
    key.shadow.camera.near = 1
    key.shadow.camera.far = 420
    key.shadow.camera.left = -180
    key.shadow.camera.right = 180
    key.shadow.camera.top = 180
    key.shadow.camera.bottom = -180
    scene.add(key)

    const fill = new THREE.DirectionalLight('#a5f3fc', 0.25)
    fill.position.set(-120, 60, -120)
    scene.add(fill)

    const loader = new GLTFLoader()
    let frame = 0

    let terrainBox: THREE.Box3 | null = null
    const terrainPivot = new THREE.Group()
    const terrainGroup = new THREE.Group()
    terrainPivot.add(terrainGroup)
    scene.add(terrainPivot)

    let starfighter: THREE.Object3D | null = null
    let tank: THREE.Object3D | null = null
    let vessel: THREE.Object3D | null = null

    let disposed = false

    function resize() {
      const w = mountEl.clientWidth
      const h = mountEl.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = Math.max(1e-6, w / Math.max(1, h))
      camera.updateProjectionMatrix()
      if (terrainBox) fitCameraToBox(terrainBox)
      leftPreview?.resize()
      centerPreview?.resize()
      rightPreview?.resize()
    }

    type Preview = {
      renderer: THREE.WebGLRenderer
      scene: THREE.Scene
      camera: THREE.PerspectiveCamera
      pivot: THREE.Group
      resize: () => void
      dispose: () => void
    }

    let leftPreview: Preview | null = null
    let centerPreview: Preview | null = null
    let rightPreview: Preview | null = null

    mountEl.appendChild(renderer.domElement)
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(mountEl)

    function disposeObject(obj: THREE.Object3D) {
      obj.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const material = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })
    }

    function snapToGround(obj: THREE.Object3D, groundY: number) {
      const box = new THREE.Box3().setFromObject(obj)
      const delta = groundY - box.min.y
      obj.position.y += delta
    }

    function loadModel(url: string) {
      return new Promise<THREE.Object3D>((resolve, reject) => {
        loader.load(
          url,
          (gltf: GLTF) => resolve(gltf.scene),
          undefined,
          (e: unknown) => reject(e)
        )
      })
    }

    function fitCameraToBox(box: THREE.Box3) {
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const vFov = THREE.MathUtils.degToRad(camera.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      const distWidth = Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))
      const distHeight = size.y / (2 * Math.tan(vFov / 2))
      const dist = Math.max(distWidth, distHeight * 0.65) * 0.92

      const dir = camera.position.clone().sub(center).normalize()
      camera.position.copy(center).add(dir.multiplyScalar(dist))
      camera.near = Math.max(0.1, dist / 100)
      camera.far = Math.max(2000, dist * 20)
      camera.lookAt(center)
      camera.updateProjectionMatrix()
    }

    function createPreview(mountNode: HTMLDivElement, model: THREE.Object3D, baseRotationY = 0) {
      const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))
      previewRenderer.setClearColor(0x000000, 0)
      previewRenderer.domElement.style.position = 'absolute'
      previewRenderer.domElement.style.inset = '0'
      previewRenderer.domElement.style.width = '100%'
      previewRenderer.domElement.style.height = '100%'
      previewRenderer.domElement.style.display = 'block'
      previewRenderer.domElement.style.zIndex = '1'
      mountNode.appendChild(previewRenderer.domElement)

      const previewScene = new THREE.Scene()
      const previewCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000)
      const amb = new THREE.AmbientLight('#ffffff', 0.78)
      previewScene.add(amb)
      const dir = new THREE.DirectionalLight('#ffffff', 0.9)
      dir.position.set(6, 10, 7)
      previewScene.add(dir)

      const pivot = new THREE.Group()
      pivot.rotation.y = baseRotationY
      pivot.add(model)
      previewScene.add(pivot)

      const box = new THREE.Box3().setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center)

      function fitPreviewCamera() {
        const w = mountNode.clientWidth
        const h = mountNode.clientHeight
        previewRenderer.setSize(w, h, false)
        previewCamera.aspect = Math.max(1e-6, w / Math.max(1, h))
        previewCamera.updateProjectionMatrix()

        const fitBox = new THREE.Box3().setFromObject(pivot)
        const size = fitBox.getSize(new THREE.Vector3())
        const c = fitBox.getCenter(new THREE.Vector3())
        const vFov = THREE.MathUtils.degToRad(previewCamera.fov)
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * previewCamera.aspect)
        const distWidth = Math.max(size.x, size.z) / (2 * Math.tan(hFov / 2))
        const distHeight = size.y / (2 * Math.tan(vFov / 2))
        const dist = Math.max(distWidth, distHeight) * 1.15

        previewCamera.position.set(c.x + dist * 0.85, c.y + dist * 0.55, c.z + dist * 0.85)
        previewCamera.near = Math.max(0.1, dist / 100)
        previewCamera.far = Math.max(1000, dist * 20)
        previewCamera.lookAt(c)
        previewCamera.updateProjectionMatrix()
      }

      fitPreviewCamera()

      return {
        renderer: previewRenderer,
        scene: previewScene,
        camera: previewCamera,
        pivot,
        resize: fitPreviewCamera,
        dispose: () => {
          disposeObject(pivot)
          previewRenderer.dispose()
          if (previewRenderer.domElement.parentNode) previewRenderer.domElement.parentNode.removeChild(previewRenderer.domElement)
        }
      } satisfies Preview
    }

    Promise.all([loadModel('/images/terrain.glb'), loadModel('/images/starfighter.glb'), loadModel('/images/tank.glb'), loadModel('/images/vessel.glb')])
      .then(([terrain, sf, tk, vs]) => {
        if (disposed) return

        terrain.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh) {
            mesh.castShadow = false
            mesh.receiveShadow = true
          }
        })

        terrainGroup.add(terrain)
        snapToGround(terrainGroup, 0)

        const rawBox = new THREE.Box3().setFromObject(terrainGroup)
        const rawCenter = rawBox.getCenter(new THREE.Vector3())

        terrainGroup.position.sub(rawCenter)
        terrainPivot.position.copy(rawCenter)

        terrainBox = new THREE.Box3().setFromObject(terrainPivot)
        fitCameraToBox(terrainBox)

        starfighter = sf
        tank = tk
        vessel = vs

        if (leftCardEl && vessel) leftPreview = createPreview(leftCardEl, vessel, Math.PI * 0.05)
        if (centerCardEl && tank) centerPreview = createPreview(centerCardEl, tank, Math.PI * 0.1)
        if (rightCardEl && starfighter) rightPreview = createPreview(rightCardEl, starfighter, Math.PI * -0.08)
      })
      .catch(() => {})

    function animate() {
      if (disposed) return
      frame = requestAnimationFrame(animate)

      const t = performance.now() / 1000
      terrainPivot.rotation.y = t * 0.12

      renderer.render(scene, camera)

      if (leftPreview) {
        leftPreview.pivot.rotation.y = t * 0.85
        leftPreview.renderer.render(leftPreview.scene, leftPreview.camera)
      }
      if (centerPreview) {
        centerPreview.pivot.rotation.y = t * 0.95
        centerPreview.renderer.render(centerPreview.scene, centerPreview.camera)
      }
      if (rightPreview) {
        rightPreview.pivot.rotation.y = t * 1.05
        rightPreview.renderer.render(rightPreview.scene, rightPreview.camera)
      }
    }

    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      ro.disconnect()
      leftPreview?.dispose()
      centerPreview?.dispose()
      rightPreview?.dispose()
      disposeObject(terrainPivot)
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <main style={{ height: '100vh', width: '100vw', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
      <div
        style={{
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: 12,
          backgroundColor: '#07122b',
          color: 'rgba(255,255,255,0.92)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div role="img" aria-label="Bendera Indonesia" className="id-flag" />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', textAlign: 'center' }}>
          Joint Command Exercise System
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => router.push('/login')}>
            Login
          </button>
        </div>
      </div>
      <div
        ref={mountRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#050816'
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage:
              'radial-gradient(1200px circle at 50% 35%, rgba(56,189,248,0.14), transparent 58%), radial-gradient(900px circle at 40% 75%, rgba(217,70,239,0.08), transparent 55%)'
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '-30%',
            right: '-30%',
            bottom: '-28%',
            height: '86%',
            transformOrigin: '50% 100%',
            transform: 'perspective(900px) rotateX(72deg)',
            zIndex: 2,
            opacity: 0.95,
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(56,189,248,0.22) 0px, rgba(56,189,248,0.22) 1px, transparent 1px, transparent 56px), repeating-linear-gradient(0deg, rgba(56,189,248,0.12) 0px, rgba(56,189,248,0.12) 1px, transparent 1px, transparent 56px)',
            backgroundSize: '56px 56px, 56px 56px',
            boxShadow: '0 -30px 80px rgba(56,189,248,0.10)',
            filter: 'drop-shadow(0 0 18px rgba(56,189,248,0.12))'
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(180deg, rgba(5,8,22,0.92) 0%, rgba(5,8,22,0.35) 30%, rgba(5,8,22,0.10) 62%, rgba(5,8,22,0.92) 100%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 0,
            right: 0,
            zIndex: 4,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '0 24px'
          }}
        >
          <div
            ref={leftCardRef}
            style={{
              width: 200,
              height: 200,
              borderRadius: 14,
              backgroundColor: 'rgba(7,18,43,0.72)',
              border: '1px solid rgba(56,189,248,0.25)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          />
          <div
            ref={centerCardRef}
            style={{
              width: 200,
              height: 200,
              borderRadius: 14,
              backgroundColor: 'rgba(7,18,43,0.72)',
              border: '1px solid rgba(56,189,248,0.25)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          />
          <div
            ref={rightCardRef}
            style={{
              width: 200,
              height: 200,
              borderRadius: 14,
              backgroundColor: 'rgba(7,18,43,0.72)',
              border: '1px solid rgba(56,189,248,0.25)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}
          />
        </div>
      </div>
    </main>
  )
}

