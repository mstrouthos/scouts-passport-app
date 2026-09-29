<script setup lang="ts">
/* The troop's phoenix — the original character, redrawn with more care: a
   round head with a flowing crest, big shining eyes and a two-part beak, the
   troop's blue-and-yellow neckerchief through its brown leather woggle, broad
   curving flight feathers spread wide, tail plumes sweeping down, over a campfire of crossed logs.

   Drawn flat, cartoon-style: solid colours, and shade as a second, deeper
   flat tone rather than gradients or outlines. The fire flickers and throws
   embers, and the parts sit at different depths in a 3D stage —
   so when the stage turns
   (it follows the scene's --px/--py) the bird reads as solid, and a flap
   folds the wings towards the viewer.

   pose: 'idle'  — bobbing, blinking, a lazy flap
         'rise'  — the arrival: rises over the fire, wings sweeping open
         'cheer' — quick flaps and a hop, for a right answer or an award
   fire: false leaves the campfire out, where the bird perches elsewhere */
const props = withDefaults(defineProps<{ pose?: 'idle' | 'rise' | 'cheer'; fire?: boolean }>(), { pose: 'idle', fire: true })
const id = useId()
const g = (n: string) => `${id}-${n}`
const url = (n: string) => `url(#${g(n)})`

/* flat colours, cartoon-style: each part one solid colour, shade a second */
const FLAT: Record<string, string> = {
  body: '#F9C93E', bodyShade: '#EAAE2C', belly: '#FFE9A6', head: '#FACF4A',
  crest: '#F4A62E', leg: '#E0962A',
  w1: '#EBA12B', w2: '#F4B733', w3: '#FACB48', wShade: '#D98E1F',
  t1: '#E0901F', t2: '#F0AC2E', t3: '#F8C645',
  beak: '#F28C2E', beakShade: '#D9691E', blush: '#F7A58A',
  flameOut: '#EC6A22', flameMid: '#F8A62A', log: '#7A5230'
}

/* the original's three broad wing feathers, spread as they were — top,
   middle, bottom — pointed at the tips */
const WING = [
  { d: 'M108 92C84 78 56 60 32 36c12 26 30 46 52 64Z', f: 'w1' },
  { d: 'M108 100C82 92 52 82 26 70c16 22 40 36 62 44Z', f: 'w2' },
  { d: 'M106 110c-24 0-52 2-76-2 20 14 46 20 66 18Z', f: 'w3' }
]
/* and its tail: two outer, two middle, two inner plumes */
const TAIL = [
  { d: 'M110 128C96 148 76 166 52 178c26-6 48-20 62-40Z', f: 't1' },
  { d: 'M114 132c-10 20-26 37-46 50 22-8 40-22 50-40Z', f: 't2' },
  { d: 'M118 134c-4 20-12 38-24 54 16-14 26-32 30-50Z', f: 't3' }
]
/* the neckerchief, one cloth: the roll round the neck (its middle hidden
   behind the head), then its two ends, each hanging to a point */
const SCARF = [
  'M102 72Q105 88 115 91H125Q135 88 138 72Q135.5 70.5 133.5 72.5Q129 84 120 85.5Q111 84 106.5 72.5Q104.5 70.5 102 72Z',
  'M115.5 90C114 96 112 102 109.5 108.5Q113.5 108.5 117 105.5L119.5 91Z',
  'M124.5 90C126 96 128 102 130.5 108.5Q126.5 108.5 123 105.5L120.5 91Z'
]
</script>

<template>
  <div class="phx" :class="['pose-' + props.pose, { nofire: !props.fire }]" role="img" aria-label="Φοίνικας">
    <div class="stage">
      <!-- the fire's light on the ground -->
      <div v-if="props.fire" class="pool" />

      <div class="float">
        <!-- tail: long plumes fanning out and down, flanking the fire -->
        <svg class="pl tail" viewBox="0 0 240 200" aria-hidden="true">
          <g v-for="side in [1, -1]" :key="side" :transform="side < 0 ? 'translate(240 0) scale(-1 1)' : ''">
            <!-- the same colour stroked round the edge softens every point -->
            <!-- the same plumes, drawn shorter: scaled towards their root -->
            <g transform="translate(116 128) scale(.7) translate(-116 -128)">
              <path v-for="t in TAIL" :key="t.f" :d="t.d" :fill="FLAT[t.f]" :stroke="FLAT[t.f]" stroke-width="3" stroke-linejoin="round" />
            </g>
          </g>
        </svg>

        <!-- wings: the original's three broad feathers a side, spread wide —
             each rounded, shaded from the warm root out to a deeper tip -->
        <svg class="pl wing wl" viewBox="0 0 240 200" aria-hidden="true">
          <g>
            <g v-for="w in WING" :key="w.f">
              <path :d="w.d" :fill="FLAT.wShade" transform="translate(1 3.5)" :stroke="FLAT.wShade" stroke-width="3" stroke-linejoin="round" />
              <path :d="w.d" :fill="FLAT[w.f]" :stroke="FLAT[w.f]" stroke-width="3.2" stroke-linejoin="round" />
            </g>
          </g>
        </svg>
        <svg class="pl wing wr" viewBox="0 0 240 200" aria-hidden="true">
          <g transform="translate(240 0) scale(-1 1)">
            <g v-for="w in WING" :key="w.f">
              <path :d="w.d" :fill="FLAT.wShade" transform="translate(1 3.5)" :stroke="FLAT.wShade" stroke-width="3" stroke-linejoin="round" />
              <path :d="w.d" :fill="FLAT[w.f]" :stroke="FLAT[w.f]" stroke-width="3.2" stroke-linejoin="round" />
            </g>
          </g>
        </svg>

        <!-- body, legs -->
        <svg class="pl body" viewBox="0 0 240 200" aria-hidden="true">
          <path d="M113 128v12M127 128v12" :stroke="FLAT.leg" stroke-width="4" stroke-linecap="round" />
          <path d="M107 142q6-3 12 0M121 142q6-3 12 0" fill="none" :stroke="FLAT.leg" stroke-width="3" stroke-linecap="round" />
          <path d="M120 72c15 0 24 16 24 33s-10 28-24 28-24-11-24-28 9-33 24-33Z" :fill="FLAT.body" />
          <!-- its shade: a flat, deeper crescent down the far side -->
          <path d="M131 76c8 6 13 16 13 29 0 17-10 28-24 28 9-5 15-15 16-29 1-11-1-21-5-28Z" :fill="FLAT.bodyShade" />
          <path d="M120 88c9 0 14 10 14 20s-6 18-14 18-14-8-14-18 5-20 14-20Z" :fill="FLAT.belly" />
          <!-- breast feathers: two flat rows of little scallops -->
          <path d="M112 104q4 3 8 0 4 3 8 0M110 114q5 3 10 0 5 3 10 0" fill="none" :stroke="FLAT.bodyShade" stroke-width="1.8" stroke-linecap="round" />
        </svg>

        <!-- the neckerchief: the scout half of a scout phoenix, in the
             troop's blue and yellow stripes -->
        <svg class="pl scarf" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <pattern :id="g('stripes')" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-35)">
              <rect width="7" height="7" fill="#2A56A8" />
              <rect width="3" height="7" fill="#FFD84A" />
            </pattern>
          </defs>
          <!-- one neckerchief: rolled round the back of the neck, its two ends
               coming forward, through the woggle, and hanging down in front -->
          <g v-for="d in SCARF" :key="d">
            <path :d="d" :fill="url('stripes')" stroke="#2A56A8" stroke-width="1.2" stroke-linejoin="round" />
          </g>
          <!-- the underside of the roll, in flat shade -->
          <path d="M104 81Q120 93 136 81L132 88Q120 95 108 88Z" fill="#1C3F80" opacity=".35" />
          <!-- the woggle: brown leather, woven -->
          <rect x="114.2" y="86.6" width="11.6" height="8" rx="3.6" fill="#8B5A2E" />
          <rect x="114.2" y="91" width="11.6" height="3.6" rx="1.8" fill="#6E4524" />
        </svg>

        <!-- crest and head -->
        <svg class="pl head" viewBox="0 0 240 200" aria-hidden="true">
          <g transform="translate(120 66) scale(1.12) translate(-120 -66)">
          <!-- a flowing crest: flame-like plumes -->
          <path class="crest" d="M117 46c-7-4-12-10-14-18 6 5 11 10 16 15Z" :fill="FLAT.crest" />
          <path class="crest" d="M119 45c-4-8-4-17 0-25 1 8 3 15 5 22Z" :fill="FLAT.crest" />
          <path class="crest" d="M122 44c1-9 5-16 12-21-4 7-6 14-6 21Z" :fill="FLAT.crest" />
          <path class="crest" d="M125 46c5-5 11-8 18-9-6 3-11 7-15 12Z" :fill="FLAT.crest" />
          <circle cx="120" cy="59" r="16" :fill="FLAT.head" />
          <!-- its shade: a flat crescent on the far side -->
          <path d="M126 44.2a16 16 0 0 1 0 29.6a18 18 0 0 0 0-29.6Z" :fill="FLAT.bodyShade" />
          <g class="eyes">
            <ellipse cx="113" cy="57" rx="5.3" ry="6" fill="#fff" />
            <ellipse cx="127" cy="57" rx="5.3" ry="6" fill="#fff" />
            <circle cx="114" cy="57.8" r="3.6" fill="#16233B" />
            <circle cx="126" cy="57.8" r="3.6" fill="#16233B" />
            <circle cx="115.3" cy="56.2" r="1.3" fill="#fff" />
            <circle cx="127.3" cy="56.2" r="1.3" fill="#fff" />
          </g>
          <!-- a rounded two-part beak -->
          <path d="M115 64q5-3 10 0-1 4-5 6-4-2-5-6Z" :fill="FLAT.beak" />
          <path d="M116.5 67.5q3.5 3.5 7 0-1 3-3.5 4-2.5-1-3.5-4Z" :fill="FLAT.beakShade" />
          <ellipse cx="108.4" cy="64.2" rx="3" ry="1.7" :fill="FLAT.blush" />
          <ellipse cx="131.6" cy="64.2" rx="3" ry="1.7" :fill="FLAT.blush" />
          </g>
        </svg>
      </div>

      <!-- the campfire beneath the phoenix, nearest of all -->
      <svg v-if="props.fire" class="pl fire" viewBox="0 0 240 200" aria-hidden="true">
        <defs>
          <radialGradient :id="g('glow')" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#FFD27A" stop-opacity=".7" /><stop offset="1" stop-color="#FFB040" stop-opacity="0" />
          </radialGradient>
        </defs>
        <ellipse class="halo" cx="120" cy="178" rx="48" ry="32" :fill="url('glow')" />
        <!-- two logs, crossed, with bark and cut ends -->
        <g transform="rotate(-12 110 191)">
          <rect x="92" y="187" width="36" height="8" rx="4" :fill="FLAT.log" />
          <path d="M98 189h8M110 192h9" stroke="#4E331D" stroke-width="1" stroke-linecap="round" opacity=".7" />
          <ellipse cx="93.5" cy="191" rx="2.4" ry="4" fill="#C49A6C" />
        </g>
        <g transform="rotate(12 130 191)">
          <rect x="112" y="187" width="36" height="8" rx="4" :fill="FLAT.log" />
          <path d="M120 192h8M133 189h8" stroke="#4E331D" stroke-width="1" stroke-linecap="round" opacity=".7" />
          <ellipse cx="146.5" cy="191" rx="2.4" ry="4" fill="#C49A6C" />
        </g>
        <!-- flame tongues, back to front -->
        <path class="fl flL" d="M101 160c8 10 12 16 12 23a12 12 0 0 1-24 0c0-5 3-9 6-12 1 3 3 4 4 2 0-4 1-8 2-13Z" :fill="FLAT.flameOut" />
        <path class="fl flR" d="M139 160c-1 5-2 9-2 13 1 2 3 1 4-2 3 3 6 7 6 12a12 12 0 0 1-24 0c0-7 4-13 16-23Z" :fill="FLAT.flameOut" />
        <path class="fl fl1" d="M120 144c6 10 14 16 20 26 4 6 6 10 6 16 0 8-12 12-26 12s-26-4-26-12c0-8 5-13 9-18 1 5 3 7 6 6 1-10 5-20 11-30Z" :fill="FLAT.flameOut" />
        <path class="fl fl2" d="M120 158c5 8 10 13 13 19 1 3 1 6 1 9 0 6-6 9-14 9s-14-3-14-9c0-5 3-9 6-12 1 3 2 4 4 3 0-6 2-12 4-19Z" :fill="FLAT.flameMid" />
        <path class="fl fl3" d="M120 172c3 5 7 9 7 14 0 4-3 6-7 6s-7-2-7-6c0-3 2-5 3-7 1 2 2 2 3 1 0-3 0-5 1-8Z" fill="#FFF1C2" />
        <circle class="ember" cx="102" cy="176" r="2" fill="#F7C948" />
        <circle class="ember e1" cx="140" cy="180" r="1.6" fill="#F0B429" />
        <circle class="ember e2" cx="120" cy="170" r="1.4" fill="#FBD976" />
        <circle class="ember e3" cx="112" cy="168" r="1.2" fill="#FFE9A0" />
        <circle class="ember e4" cx="131" cy="172" r="1.3" fill="#F7C948" />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.phx{position:relative; width:230px; aspect-ratio:240/200; perspective:700px}
.stage{
  position:absolute; inset:0; transform-style:preserve-3d;
  transform:rotateY(calc(var(--px, 0) * 14deg)) rotateX(calc(var(--py, 0) * -7deg));
}
.float{position:absolute; inset:0; transform-style:preserve-3d; animation:bob 3.2s ease-in-out infinite}
.pl{position:absolute; inset:0; width:100%; height:100%; overflow:visible; backface-visibility:hidden}

/* depth, back to front */
.pool{
  position:absolute; left:50%; bottom:-4%; width:64%; height:14%; margin-left:-32%; border-radius:50%;
  background:radial-gradient(closest-side, rgba(240,180,41,.45), rgba(240,180,41,0));
  transform:translateZ(-30px) rotateX(60deg); animation:glowp 1.1s ease-in-out infinite alternate;
}
.tail{transform:translateZ(-26px)}
.wl{transform-origin:45% 50%; transform:translateZ(-12px); animation:flapL 2.6s ease-in-out infinite}
.wr{transform-origin:55% 50%; transform:translateZ(-12px); animation:flapR 2.6s ease-in-out infinite}
.body{transform:translateZ(0)}
.scarf{transform:translateZ(8px)}
.head{transform:translateZ(14px)}
.fire{transform:translateZ(22px)}
.eyes{transform-box:fill-box; transform-origin:50% 50%; animation:blink 4.4s infinite}
.crest{transform-box:fill-box; transform-origin:50% 100%; animation:crest 1.6s ease-in-out infinite alternate}
.fl{transform-box:fill-box; transform-origin:50% 100%}
.fl1{animation:flick .5s ease-in-out infinite alternate}
.fl2{animation:flick .38s .08s ease-in-out infinite alternate}
.fl3{animation:flick .3s .16s ease-in-out infinite alternate}
.flL{animation:flick .44s .2s ease-in-out infinite alternate}
.flR{animation:flick .46s .3s ease-in-out infinite alternate}
.halo{animation:glowp 1.1s ease-in-out infinite alternate}
.ember{animation:ember 2.4s linear infinite}
.ember.e1{animation-delay:.8s}.ember.e2{animation-delay:1.6s}.ember.e3{animation-delay:.4s}.ember.e4{animation-delay:1.2s}

@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes blink{0%,90.5%,94.5%,100%{scale:1 1}92.5%{scale:1 .08}}
@keyframes crest{from{scale:1 1}to{scale:1.06 .94}}
@keyframes flick{from{transform:scale(1) skewX(0)}to{transform:scale(1.14,.92) skewX(-3.5deg)}}
@keyframes ember{0%{opacity:0; transform:translateY(0) scale(.6)}18%{opacity:1}100%{opacity:0; transform:translateY(-52px) scale(.25)}}
@keyframes glowp{from{opacity:.55}to{opacity:1}}
/* a flap folds the wing towards us (rotateY) as it lifts (rotateZ) */
@keyframes flapL{
  0%,100%{transform:translateZ(-12px) rotateZ(0) rotateY(0)}
  50%{transform:translateZ(-12px) rotateZ(-8deg) rotateY(22deg)}
}
@keyframes flapR{
  0%,100%{transform:translateZ(-12px) rotateZ(0) rotateY(0)}
  50%{transform:translateZ(-12px) rotateZ(8deg) rotateY(-22deg)}
}

/* rise: up over the fire, wings sweeping open, then idle */
.pose-rise .float{animation:rise 1.4s cubic-bezier(.2,.9,.3,1) both, bob 3.2s 1.4s ease-in-out infinite}
.pose-rise .wl{animation:openL 1.4s cubic-bezier(.3,1.3,.5,1) both, flapL 2.6s 1.4s ease-in-out infinite}
.pose-rise .wr{animation:openR 1.4s cubic-bezier(.3,1.3,.5,1) both, flapR 2.6s 1.4s ease-in-out infinite}
.pose-rise .fire{animation:ignite .7s cubic-bezier(.3,1.5,.5,1) both}
@keyframes rise{
  0%{transform:translateY(70px) scale(.4); opacity:0}
  30%{opacity:1}
  70%{transform:translateY(-8px) scale(1.04)}
  100%{transform:translateY(0) scale(1)}
}
@keyframes openL{
  0%{transform:translateZ(-12px) rotateZ(50deg) rotateY(60deg)}
  60%{transform:translateZ(-12px) rotateZ(-12deg) rotateY(-8deg)}
  100%{transform:translateZ(-12px) rotateZ(0) rotateY(0)}
}
@keyframes openR{
  0%{transform:translateZ(-12px) rotateZ(-50deg) rotateY(-60deg)}
  60%{transform:translateZ(-12px) rotateZ(12deg) rotateY(8deg)}
  100%{transform:translateZ(-12px) rotateZ(0) rotateY(0)}
}
@keyframes ignite{from{opacity:0; scale:.2}}

/* cheer: quick flaps, a hop */
.pose-cheer .float{animation:hop .7s cubic-bezier(.3,0,.4,1) infinite}
.pose-cheer .wl{animation:cheerL .32s ease-in-out infinite alternate}
.pose-cheer .wr{animation:cheerR .32s ease-in-out infinite alternate}
@keyframes hop{0%,100%{transform:translateY(0) scale(1,1)}15%{transform:translateY(2px) scale(1.03,.96)}50%{transform:translateY(-16px) scale(.98,1.03)}}
@keyframes cheerL{from{transform:translateZ(-12px) rotateZ(4deg) rotateY(0)}to{transform:translateZ(-12px) rotateZ(-18deg) rotateY(36deg)}}
@keyframes cheerR{from{transform:translateZ(-12px) rotateZ(-4deg) rotateY(0)}to{transform:translateZ(-12px) rotateZ(18deg) rotateY(-36deg)}}

@media (prefers-reduced-motion: reduce){
  .float, .wl, .wr, .eyes, .crest, .fl, .halo, .ember, .pool, .fire{animation:none !important}
  .stage{transform:none}
}
</style>
