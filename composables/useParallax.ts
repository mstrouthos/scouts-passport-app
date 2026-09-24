/* Where the viewer is "looking from", as two numbers in [-1, 1].

   Drives the depth of the camp scene and the tilt of the phoenix: layers
   further back move less, layers nearer move more, and the eye reads that as
   depth. Three sources, in order of preference:
     · the pointer, on a computer;
     · the phone's tilt, where the browser gives it without asking (Android —
       iOS would pop a permission dialog on the passcode screen, so it is left
       alone there);
     · otherwise a slow drift, so a still phone still feels alive.
   Anyone who asked for less motion gets a still scene. */
export function useParallax(el: Ref<HTMLElement | null>) {
  const x = ref(0)
  const y = ref(0)
  let raf = 0
  let tx = 0, ty = 0          // where we are heading
  let lastInput = 0           // when a real input last arrived
  let t0 = 0

  const reduced = import.meta.client && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function frame(t: number) {
    if (!t0) t0 = t
    // no real input for a while: a slow figure-of-eight drift
    if (t - lastInput > 2500) {
      const s = (t - t0) / 1000
      tx = Math.sin(s * 0.35) * 0.55
      ty = Math.sin(s * 0.7) * 0.25
    }
    // ease towards the target so every source feels the same
    x.value += (tx - x.value) * 0.06
    y.value += (ty - y.value) * 0.06
    if (el.value) {
      el.value.style.setProperty('--px', x.value.toFixed(4))
      el.value.style.setProperty('--py', y.value.toFixed(4))
    }
    raf = requestAnimationFrame(frame)
  }

  function onPointer(e: PointerEvent) {
    if (e.pointerType === 'touch') return   // a finger on the keypad is not a look around
    tx = (e.clientX / window.innerWidth) * 2 - 1
    ty = (e.clientY / window.innerHeight) * 2 - 1
    lastInput = performance.now()
  }
  function onTilt(e: DeviceOrientationEvent) {
    if (e.gamma == null || e.beta == null) return
    // held upright-ish: beta ≈ 45–70; gamma is the side-to-side lean
    tx = Math.max(-1, Math.min(1, e.gamma / 25))
    ty = Math.max(-1, Math.min(1, (e.beta - 55) / 25))
    lastInput = performance.now()
  }

  onMounted(() => {
    if (reduced) return
    window.addEventListener('pointermove', onPointer, { passive: true })
    const DOE = (window as any).DeviceOrientationEvent
    // iOS wants a permission prompt for this; everyone else just sends it
    if (DOE && typeof DOE.requestPermission !== 'function')
      window.addEventListener('deviceorientation', onTilt, { passive: true })
    raf = requestAnimationFrame(frame)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    window.removeEventListener('pointermove', onPointer)
    window.removeEventListener('deviceorientation', onTilt)
  })
  return { x, y }
}
