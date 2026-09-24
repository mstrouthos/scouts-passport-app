<script setup lang="ts">
/* The camp, in depth, at the real time of day (useDaylight): sky, stars, moon, far hills, the pine line, a
   tent with its lamp lit, and a campfire throwing light on the ground. Every
   layer sits at its own distance and slides by its own amount as the viewer
   "looks around" (useParallax), which is what makes a flat screen read as a
   place. Content goes in the default slot, above everything.

   `intro` plays the arrival once: stars come out, the treeline rises, the
   fire catches. `fire` can be turned off for screens that want the scene
   without the centrepiece. */
const props = withDefaults(defineProps<{ intro?: boolean; fire?: boolean; tent?: boolean }>(), { intro: false, fire: true, tent: true })
const root = ref<HTMLElement | null>(null)
useParallax(root)
useDaylight(root)

/* The same sky every time — a seeded scatter, not Math.random, so stars do
   not jump about between visits. */
function seeded(seed: number) {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}
function starfield(n: number, seed: number, maxR: number) {
  const r = seeded(seed)
  return Array.from({ length: n }, () => ({
    x: r() * 100, y: r() * 62, r: 0.4 + r() * maxR, d: r() * 4, o: 0.35 + r() * 0.65
  }))
}
const far = starfield(70, 7, 0.9)
const near = starfield(26, 31, 1.5)

/* A pine line: three stacked triangles per tree, heights varied so the ridge
   is ragged like a real one. */
function pines(seed: number, base: number, minH: number, maxH: number, step: number) {
  const r = seeded(seed)
  let d = ''
  for (let x = -10; x < 410; x += step * (0.7 + r() * 0.6)) {
    const h = minH + r() * (maxH - minH)
    const w = h * 0.42
    for (let k = 0; k < 3; k++) {
      const top = base - h + k * h * 0.26
      const hw = w * (0.55 + k * 0.28)
      const bot = top + h * 0.42
      d += `M${x.toFixed(1)} ${top.toFixed(1)}L${(x + hw).toFixed(1)} ${bot.toFixed(1)}L${(x - hw).toFixed(1)} ${bot.toFixed(1)}Z`
    }
    d += `M${(x - 2).toFixed(1)} ${(base - h * 0.25).toFixed(1)}h4V${base}h-4Z`
  }
  return d
}
const pinesFar = pines(3, 200, 50, 95, 22)
const pinesNear = pines(11, 200, 80, 150, 34)

const CLOUDS = [{ y: 12, w: 130, d: 140, o: 20 }, { y: 22, w: 90, d: 110, o: 70 }, { y: 7, w: 70, d: 170, o: 110 }, { y: 30, w: 110, d: 130, o: 40 }]
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  x: (i * 37) % 60 - 30, delay: (i * 0.41) % 3.4, dur: 2.2 + (i % 5) * 0.45, size: 2 + (i % 3)
}))
</script>

<template>
  <div ref="root" class="camp" :class="{ intro: props.intro }">
    <div class="sky" />

    <svg class="lyr stars far" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle v-for="(s, i) in far" :key="i" :cx="s.x" :cy="s.y" :r="s.r * 0.18" :opacity="s.o"
              :style="{ animationDelay: s.d + 's' }" />
    </svg>
    <div class="moon" />
    <svg class="lyr stars near" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle v-for="(s, i) in near" :key="i" :cx="s.x" :cy="s.y" :r="s.r * 0.2" :opacity="s.o"
              :style="{ animationDelay: s.d + 's' }" />
    </svg>

    <div class="sun" />
    <div class="clouds" aria-hidden="true">
      <i v-for="c in CLOUDS" :key="c.y" :style="{ top: c.y + '%', width: c.w + 'px', animationDuration: c.d + 's', animationDelay: -c.o + 's' }" />
    </div>

    <!-- far hills, then two pine lines, each nearer and darker -->
    <svg class="lyr ridge hills" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 150C60 110 110 128 160 112S260 70 310 100 380 118 400 108V200H0Z" style="fill:var(--hill,#20413C)" />
    </svg>
    <svg class="lyr ridge pf" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path :d="pinesFar" style="fill:var(--pf,#143029)" />
      <rect y="186" width="400" height="14" style="fill:var(--pf,#143029)" />
    </svg>

    <svg class="lyr ridge pn" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path :d="pinesNear" style="fill:var(--pn,#0B1F1A)" />
      <rect y="182" width="400" height="18" style="fill:var(--pn,#0B1F1A)" />
    </svg>

    <div class="ground" />

    <!-- the tent, lamp on -->
    <svg v-if="props.tent" class="lyr tent" viewBox="0 0 160 90" aria-hidden="true">
      <path d="M2 88 36 70M158 88l-34-18" stroke="#0B1726" stroke-width="1.4" />
      <path d="M22 86 80 14l58 72Z" class="canvas" />
      <path d="M80 14l58 72H96Z" class="canvas shade" />
      <path d="M80 30 62 86h36Z" fill="#3A2E22" />
      <path class="lamp" d="M80 30 62 86h36Z" fill="#F4A53A" />
      <path class="lamp" d="M80 38 70 86h20Z" fill="#FFE1A0" opacity=".8" />
      <path d="M80 30 62 86h7Z" class="canvas" opacity=".55" />
      <path d="M80 14V6" stroke="#5B4A30" stroke-width="2.4" stroke-linecap="round" />
      <path d="M80 7l9 3-9 3Z" fill="#F2C230" />
    </svg>


    <!-- the fire, and the light it throws -->
    <div v-if="props.fire" class="fire">
      <div class="fire-glow" />
      <div class="pool" />
      <svg class="flames" viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <linearGradient id="cs-f1" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#E0461B" /><stop offset=".6" stop-color="#F58A1F" /><stop offset="1" stop-color="#FFC24A" />
          </linearGradient>
          <linearGradient id="cs-f2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#F7A21E" /><stop offset="1" stop-color="#FFE58F" />
          </linearGradient>
        </defs>
        <rect x="24" y="98" width="46" height="10" rx="5" fill="#5C3A22" transform="rotate(-14 47 103)" />
        <rect x="50" y="98" width="46" height="10" rx="5" fill="#6E4629" transform="rotate(14 73 103)" />
        <path class="f f1" d="M60 18c20 26 34 42 34 60 0 16-15 26-34 26S26 94 26 78c0-18 14-34 34-60Z" fill="url(#cs-f1)" />
        <path class="f f2" d="M44 50c10 14 16 22 16 32 0 9-7 14-16 14s-16-5-16-14c0-10 6-18 16-32Z" fill="url(#cs-f1)" opacity=".9" />
        <path class="f f3" d="M78 46c10 14 16 22 16 32 0 9-7 14-16 14s-16-5-16-14c0-10 6-18 16-32Z" fill="url(#cs-f1)" opacity=".9" />
        <path class="f f4" d="M60 44c12 16 20 26 20 38 0 10-9 16-20 16s-20-6-20-16c0-12 8-22 20-38Z" fill="url(#cs-f2)" />
        <path class="f f5" d="M60 66c6 8 10 13 10 19 0 5-4 9-10 9s-10-4-10-9c0-6 4-11 10-19Z" fill="#FFF3C4" />
      </svg>
      <i v-for="(s, i) in SPARKS" :key="i" class="spark"
         :style="{ '--sx': s.x + 'px', animationDelay: s.delay + 's', animationDuration: s.dur + 's', width: s.size + 'px', height: s.size + 'px' }" />
    </div>

    <div class="vignette" />
    <div class="camp-content"><slot /></div>
  </div>
</template>

<style scoped>
.camp{
  position:fixed; inset:0; overflow:hidden; color:var(--ink, #fff);
  --px:0; --py:0;
  background:#0B1733;
}
.lyr, .sky, .moon, .ground, .fire, .vignette{position:absolute; pointer-events:none}
.camp-content{position:relative; z-index:5; height:100%}

/* each layer drifts by its distance: far ones barely, near ones most */
.sky{
  inset:-6%;
  background:
    radial-gradient(90% 45% at 50% 100%, rgba(255,150,60,var(--warm, .3)), transparent 60%),
    linear-gradient(180deg,var(--sky1,#07102A) 0%,var(--sky2,#0E2146) 36%,var(--sky3,#1C3D5E) 68%,var(--sky4,#35596A) 100%);
  transition:background 2s;
  transform:translate3d(calc(var(--px) * -4px), calc(var(--py) * -3px), 0);
}
.stars{inset:-4% -4% auto; width:108%; height:70%; opacity:var(--stars, 1); transition:opacity 2s}
.stars circle{fill:#FFF6D8; animation:tw 3.4s ease-in-out infinite}
.stars.far{transform:translate3d(calc(var(--px) * -6px), calc(var(--py) * -4px), 0)}
.stars.near{transform:translate3d(calc(var(--px) * -14px), calc(var(--py) * -8px), 0)}
.moon{
  left:var(--moon-x, 80%); top:var(--moon-y, 15%); margin:-27px 0 0 -27px; opacity:var(--moon-o, 1);
  width:54px; height:54px; border-radius:50%;
  background:radial-gradient(circle at 38% 36%,#FFFBEA,#F4E6B8 60%,#E7D196);
  box-shadow:0 0 30px 8px rgba(255,236,180,.28), 0 0 90px 30px rgba(255,236,180,.1);
  transform:translate3d(calc(var(--px) * -10px), calc(var(--py) * -6px), 0);
}
.moon::after{ /* the shadowed side: a crescent */
  content:""; position:absolute; inset:-2px -2px -2px 16px; border-radius:50%;
  background:var(--sky2, #0E2146); opacity:.92;
}
.sun{
  position:absolute; pointer-events:none; left:var(--sun-x, 50%); top:var(--sun-y, 20%);
  width:var(--sun-size, 56px); height:var(--sun-size, 56px); margin:calc(var(--sun-size, 56px) / -2) 0 0 calc(var(--sun-size, 56px) / -2);
  border-radius:50%; opacity:var(--sun-o, 0);
  background:radial-gradient(circle, #FFFDF2, var(--sun-core, #FFF6D5) 55%, #FFC24A);
  box-shadow:0 0 40px 12px rgba(255,220,130,.55), 0 0 140px 50px rgba(255,200,110,.25);
  transform:translate3d(calc(var(--px) * -8px), calc(var(--py) * -5px), 0);
  transition:opacity 2s;
}
.clouds{position:absolute; inset:0; pointer-events:none; opacity:var(--clouds, 0); transition:opacity 2s}
.clouds i{
  position:absolute; left:-30%; height:26px; border-radius:30px;
  background:color-mix(in srgb, var(--sky4, #fff) 45%, #fff); opacity:.85;
  filter:blur(1px); animation:drift linear infinite;
}
.clouds i::before, .clouds i::after{content:""; position:absolute; background:inherit; border-radius:50%}
.clouds i::before{width:46%; height:180%; left:16%; bottom:20%}
.clouds i::after{width:34%; height:140%; left:50%; bottom:25%}
@keyframes drift{from{transform:translateX(0)}to{transform:translateX(160vw)}}
.ridge{left:-6%; width:112%; bottom:0}
.hills{height:40%; bottom:12%; transform:translate3d(calc(var(--px) * -12px), calc(var(--py) * -4px), 0)}
.pf{height:30%; bottom:12%; transform:translate3d(calc(var(--px) * -20px), calc(var(--py) * -6px), 0)}
.pn{height:26%; bottom:11%; transform:translate3d(calc(var(--px) * -34px), calc(var(--py) * -9px), 0)}
.tent{
  width:104px; left:6%; bottom:12%;
  transform:translate3d(calc(var(--px) * -26px), calc(var(--py) * -8px), 0);
}
.tent .canvas{fill:color-mix(in srgb, #E9D9B0 calc((1 - var(--stars, 1)) * 100%), #1E3350)}
.tent .shade{filter:brightness(.82)}
.tent .lamp{opacity:var(--lamp, 1); animation:lamp 3.6s ease-in-out infinite}
.ground{
  left:-6%; right:-6%; bottom:0; height:14.5%;
  background:linear-gradient(180deg,var(--g1,#0E2519),var(--g2,#081811));
  border-radius:50% 50% 0 0 / 22px 22px 0 0;
  transform:translate3d(calc(var(--px) * -40px), 0, 0);
}

.fire{
  left:50%; bottom:calc(var(--fire-bottom, 6%)); width:120px; height:120px; margin-left:-60px;
  transform:translate3d(calc(var(--px) * -40px), 0, 0);
}
.flames{position:absolute; inset:0; overflow:visible}
.f{transform-box:fill-box; transform-origin:50% 100%}
.f1{animation:flick .52s ease-in-out infinite alternate}
.f2{animation:flick .44s .1s ease-in-out infinite alternate}
.f3{animation:flick .47s .2s ease-in-out infinite alternate}
.f4{animation:flick .36s .05s ease-in-out infinite alternate}
.f5{animation:flick .3s .15s ease-in-out infinite alternate}
.fire-glow{
  position:absolute; left:50%; bottom:6px; width:420px; height:420px; margin-left:-210px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(255,170,70,.38) 0%, rgba(255,140,50,.14) 30%, transparent 62%);
  animation:glow 1.3s ease-in-out infinite alternate;
  opacity:var(--fire, 1);
}
.pool{
  position:absolute; left:50%; bottom:-6px; width:260px; height:46px; margin-left:-130px; border-radius:50%;
  background:radial-gradient(closest-side, rgba(255,160,60,.42), transparent);
  animation:glow 1.1s .2s ease-in-out infinite alternate;
}
.spark{
  position:absolute; left:50%; bottom:40px; border-radius:50%;
  background:#FFD27A; box-shadow:0 0 6px 2px rgba(255,190,90,.7);
  animation:spark 2.6s linear infinite; opacity:0;
}
.vignette{inset:0; background:radial-gradient(130% 90% at 50% 45%, transparent 55%, rgba(3,8,20,.55))}

/* arrival */
.intro .stars{animation:fadein 1.4s ease-out both}
.intro .moon{animation:fadein 1.6s .2s ease-out both}
.intro .hills{animation:risein .9s .15s cubic-bezier(.2,.8,.3,1) both}
.intro .pf{animation:risein .9s .25s cubic-bezier(.2,.8,.3,1) both}
.intro .pn{animation:risein .9s .35s cubic-bezier(.2,.8,.3,1) both}
.intro .tent{animation:risein .9s .4s cubic-bezier(.2,.8,.3,1) both}
.intro .ground{animation:risein .9s .3s cubic-bezier(.2,.8,.3,1) both}
.intro .fire{animation:ignite .9s .55s cubic-bezier(.3,1.5,.5,1) both}

@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes lamp{0%,100%{opacity:.85}50%{opacity:1}}
@keyframes flick{from{transform:scale(1,1) skewX(0)}to{transform:scale(1.1,.9) skewX(-4deg)}}
@keyframes glow{from{opacity:.75; transform:scale(.97)}to{opacity:1; transform:scale(1.04)}}
@keyframes spark{
  0%{opacity:0; transform:translate(0,0) scale(1)}
  12%{opacity:1}
  100%{opacity:0; transform:translate(var(--sx), -150px) scale(.2)}
}
@keyframes fadein{from{opacity:0}}
/* individual transforms are set by the parallax; arrival uses `translate`
   (the separate property) so the two do not fight */
@keyframes risein{from{translate:0 60px; opacity:0}}
@keyframes ignite{from{scale:0; opacity:0}}

@media (prefers-reduced-motion: reduce){
  .stars circle, .f, .fire-glow, .pool, .tent .lamp{animation:none}
  .spark{display:none}
  .clouds i{animation:none; left:10%}
  .intro *{animation:none !important}
}
</style>
