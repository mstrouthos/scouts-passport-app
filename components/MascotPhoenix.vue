<script setup lang="ts">
/* The troop's phoenix — the original character, redrawn with more care: a
   round head with a flowing crest, big shining eyes and a two-part beak, the
   troop's blue-and-yellow neckerchief through its brown leather woggle, broad
   curving flight feathers spread wide, tail plumes sweeping down, over a campfire of crossed logs.

   Soft gradients give it volume, highlights catch the light, the fire glows
   and throws embers, and the parts sit at different depths in a 3D stage —
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

/* the original's three broad wing feathers, kept exactly as they were
   spread — top, middle, bottom — each now with a shaft of light along it */
const WING = [
  { d: 'M108 92C84 78 56 60 32 36c12 26 30 46 52 64Z', shaft: 'M103 91C82 77 60 60 40 45', f: 'w1' },
  { d: 'M108 100C82 92 52 82 26 70c16 22 40 36 62 44Z', shaft: 'M103 101C80 94 56 85 36 76', f: 'w2' },
  { d: 'M106 110c-24 0-52 2-76-2 20 14 46 20 66 18Z', shaft: 'M101 113C80 113 58 113 40 111', f: 'w3' }
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
          <defs>
            <linearGradient :id="g('t1')" gradientUnits="userSpaceOnUse" x1="112" y1="128" x2="56" y2="180">
              <stop offset="0" stop-color="#E6A22E" /><stop offset="1" stop-color="#D0781E" />
            </linearGradient>
            <linearGradient :id="g('t2')" gradientUnits="userSpaceOnUse" x1="116" y1="132" x2="70" y2="182">
              <stop offset="0" stop-color="#F4B83A" /><stop offset="1" stop-color="#E08F27" />
            </linearGradient>
            <linearGradient :id="g('t3')" gradientUnits="userSpaceOnUse" x1="120" y1="134" x2="96" y2="188">
              <stop offset="0" stop-color="#FCCD55" /><stop offset="1" stop-color="#EFA830" />
            </linearGradient>
          </defs>
          <g v-for="side in [1, -1]" :key="side" :transform="side < 0 ? 'translate(240 0) scale(-1 1)' : ''">
            <!-- the same colour stroked round the edge softens every point -->
            <path v-for="t in TAIL" :key="t.f" :d="t.d" :fill="url(t.f)" :stroke="url(t.f)" stroke-width="3" stroke-linejoin="round" />
            <path d="M109 136C98 152 84 164 66 174" fill="none" stroke="#FFE39A" stroke-width="1.3" stroke-linecap="round" opacity=".5" />
            <path d="M116 138c-4 16-10 30-18 42" fill="none" stroke="#FFF0BE" stroke-width="1.3" stroke-linecap="round" opacity=".55" />
          </g>
        </svg>

        <!-- wings: the original's three broad feathers a side, spread wide —
             each rounded, shaded from the warm root out to a deeper tip -->
        <svg class="pl wing wl" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <linearGradient :id="g('w1')" gradientUnits="userSpaceOnUse" x1="108" y1="96" x2="30" y2="38">
              <stop offset="0" stop-color="#F2B23A" /><stop offset=".6" stop-color="#E49A2C" /><stop offset="1" stop-color="#D57F22" />
            </linearGradient>
            <linearGradient :id="g('w2')" gradientUnits="userSpaceOnUse" x1="108" y1="104" x2="26" y2="72">
              <stop offset="0" stop-color="#FAC444" /><stop offset=".6" stop-color="#F2B034" /><stop offset="1" stop-color="#E4952A" />
            </linearGradient>
            <linearGradient :id="g('w3')" gradientUnits="userSpaceOnUse" x1="106" y1="114" x2="30" y2="110">
              <stop offset="0" stop-color="#FFDC6E" /><stop offset=".6" stop-color="#F9C84C" /><stop offset="1" stop-color="#EFAE38" />
            </linearGradient>
          </defs>
          <g>
            <g v-for="w in WING" :key="w.f">
              <path :d="w.d" fill="#A8661A" opacity=".22" transform="translate(1 3)" stroke="#A8661A" stroke-width="3" stroke-linejoin="round" />
              <path :d="w.d" :fill="url(w.f)" :stroke="url(w.f)" stroke-width="3.2" stroke-linejoin="round" />
              <path :d="w.shaft" fill="none" stroke="#FFF0BE" stroke-width="1.4" stroke-linecap="round" opacity=".6" />
            </g>
          </g>
        </svg>
        <svg class="pl wing wr" viewBox="0 0 240 200" aria-hidden="true">
          <g transform="translate(240 0) scale(-1 1)">
            <g v-for="w in WING" :key="w.f">
              <path :d="w.d" fill="#A8661A" opacity=".22" transform="translate(1 3)" stroke="#A8661A" stroke-width="3" stroke-linejoin="round" />
              <path :d="w.d" :fill="url(w.f)" :stroke="url(w.f)" stroke-width="3.2" stroke-linejoin="round" />
              <path :d="w.shaft" fill="none" stroke="#FFF0BE" stroke-width="1.4" stroke-linecap="round" opacity=".6" />
            </g>
          </g>
        </svg>

        <!-- body, legs -->
        <svg class="pl body" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <radialGradient :id="g('body')" cx=".36" cy=".26" r=".9">
              <stop offset="0" stop-color="#FFDC6E" /><stop offset=".55" stop-color="#F3B830" /><stop offset="1" stop-color="#D99420" />
            </radialGradient>
            <radialGradient :id="g('belly')" cx=".42" cy=".3" r=".8">
              <stop offset="0" stop-color="#FFF6D2" /><stop offset="1" stop-color="#FCE08E" />
            </radialGradient>
          </defs>
          <path d="M113 128v12M127 128v12" stroke="#DE9A26" stroke-width="4" stroke-linecap="round" />
          <path d="M107 142q6-3 12 0M121 142q6-3 12 0" fill="none" stroke="#C98319" stroke-width="3" stroke-linecap="round" />
          <path d="M120 72c15 0 24 16 24 33s-10 28-24 28-24-11-24-28 9-33 24-33Z" :fill="url('body')" />
          <path d="M120 88c9 0 14 10 14 20s-6 18-14 18-14-8-14-18 5-20 14-20Z" :fill="url('belly')" />
          <!-- soft breast feathers -->
          <path d="M112 104q4 3 8 0 4 3 8 0M110 114q5 3 10 0 5 3 10 0" fill="none" stroke="#F3CF72" stroke-width="1.4" stroke-linecap="round" opacity=".8" />
          <path d="M103 92c2-7 7-12 12-14" fill="none" stroke="#FFEDB0" stroke-width="2.2" stroke-linecap="round" opacity=".6" />
        </svg>

        <!-- the neckerchief: the scout half of a scout phoenix, in the
             troop's blue and yellow stripes -->
        <svg class="pl scarf" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <pattern :id="g('stripes')" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(-35)">
              <rect width="7" height="7" fill="#2A56A8" />
              <rect width="3" height="7" fill="#FFD84A" />
            </pattern>
            <!-- soft shading over the stripes: lit above, shadowed where it folds -->
            <linearGradient :id="g('shade')" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#fff" stop-opacity=".16" /><stop offset=".6" stop-color="#0B1A40" stop-opacity="0" /><stop offset="1" stop-color="#0B1A40" stop-opacity=".22" />
            </linearGradient>
            <linearGradient :id="g('woggle')" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#A8723F" /><stop offset="1" stop-color="#6E4524" />
            </linearGradient>
          </defs>
          <!-- one neckerchief: rolled round the back of the neck, its two ends
               coming forward, through the woggle, and hanging down in front -->
          <g v-for="d in SCARF" :key="d">
            <path :d="d" :fill="url('stripes')" stroke="#2A56A8" stroke-width="1.2" stroke-linejoin="round" />
            <path :d="d" :fill="url('shade')" />
          </g>
          <path d="M105 76Q108 86 116 89M135 76Q132 86 124 89" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity=".3" />
          <!-- the woggle: brown leather, woven -->
          <rect x="114.2" y="86.6" width="11.6" height="8" rx="3.6" :fill="url('woggle')" />
          <path d="M117.4 87v7.4M120 87v7.4M122.6 87v7.4" stroke="#553519" stroke-width=".8" stroke-linecap="round" opacity=".55" />
          <rect x="115.4" y="87.4" width="9.2" height="2" rx="1" fill="#D6A36C" opacity=".6" />
        </svg>

        <!-- crest and head -->
        <svg class="pl head" viewBox="0 0 240 200" aria-hidden="true">
          <defs>
            <radialGradient :id="g('head')" cx=".38" cy=".3" r=".85">
              <stop offset="0" stop-color="#FFEBA4" /><stop offset=".55" stop-color="#F9CD50" /><stop offset="1" stop-color="#EBB331" />
            </radialGradient>
            <linearGradient :id="g('plume')" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stop-color="#F3B83A" /><stop offset="1" stop-color="#FFDB6E" />
            </linearGradient>
            <linearGradient :id="g('beak')" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#F58B3E" /><stop offset="1" stop-color="#DA5F22" />
            </linearGradient>
          </defs>
          <g transform="translate(120 66) scale(1.12) translate(-120 -66)">
          <!-- a flowing crest: flame-like plumes -->
          <path class="crest" d="M117 46c-7-4-12-10-14-18 6 5 11 10 16 15Z" :fill="url('plume')" />
          <path class="crest" d="M119 45c-4-8-4-17 0-25 1 8 3 15 5 22Z" :fill="url('plume')" />
          <path class="crest" d="M122 44c1-9 5-16 12-21-4 7-6 14-6 21Z" :fill="url('plume')" />
          <path class="crest" d="M125 46c5-5 11-8 18-9-6 3-11 7-15 12Z" :fill="url('plume')" />
          <circle cx="120" cy="59" r="16" :fill="url('head')" />
          <!-- cheek fluff at either side -->
          <path d="M104.5 62q-3 3 0 6M135.5 62q3 3 0 6" fill="none" stroke="#F3C650" stroke-width="2.4" stroke-linecap="round" />
          <path d="M108 53a13 13 0 0 1 9-8" fill="none" stroke="#FFF8DC" stroke-width="2" stroke-linecap="round" opacity=".75" />
          <g class="eyes">
            <ellipse cx="113.2" cy="57" rx="4.6" ry="5.2" fill="#fff" />
            <ellipse cx="126.8" cy="57" rx="4.6" ry="5.2" fill="#fff" />
            <circle cx="114" cy="57.8" r="2.8" fill="#1A2140" />
            <circle cx="126" cy="57.8" r="2.8" fill="#1A2140" />
            <circle cx="115" cy="56.4" r="1.1" fill="#fff" />
            <circle cx="127" cy="56.4" r="1.1" fill="#fff" />
            <circle cx="113.2" cy="59.2" r=".5" fill="#fff" opacity=".8" />
            <circle cx="125.2" cy="59.2" r=".5" fill="#fff" opacity=".8" />
          </g>
          <!-- a rounded two-part beak -->
          <path d="M115 64q5-3 10 0-1 4-5 6-4-2-5-6Z" :fill="url('beak')" />
          <path d="M116.5 67.5q3.5 3.5 7 0-1 3-3.5 4-2.5-1-3.5-4Z" fill="#C4521E" />
          <path d="M117 64.5q3-1.4 6 0" fill="none" stroke="#FFB27A" stroke-width="1" stroke-linecap="round" />
          <ellipse cx="108.4" cy="64.2" rx="3" ry="1.7" fill="#F48F72" opacity=".45" />
          <ellipse cx="131.6" cy="64.2" rx="3" ry="1.7" fill="#F48F72" opacity=".45" />
          </g>
        </svg>
      </div>

      <!-- the campfire beneath the phoenix, nearest of all -->
      <svg v-if="props.fire" class="pl fire" viewBox="0 0 240 200" aria-hidden="true">
        <defs>
          <radialGradient :id="g('glow')" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#FFD27A" stop-opacity=".7" /><stop offset="1" stop-color="#FFB040" stop-opacity="0" />
          </radialGradient>
          <linearGradient :id="g('f1')" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#CF4A1D" /><stop offset="1" stop-color="#F08434" />
          </linearGradient>
          <linearGradient :id="g('f2')" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#EA9A22" /><stop offset="1" stop-color="#FCD258" />
          </linearGradient>
          <linearGradient :id="g('log')" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8E6340" /><stop offset="1" stop-color="#5E3E24" />
          </linearGradient>
        </defs>
        <ellipse class="halo" cx="120" cy="178" rx="48" ry="32" :fill="url('glow')" />
        <!-- two logs, crossed, with bark and cut ends -->
        <g transform="rotate(-12 110 191)">
          <rect x="92" y="187" width="36" height="8" rx="4" :fill="url('log')" />
          <path d="M98 189h8M110 192h9" stroke="#4E331D" stroke-width="1" stroke-linecap="round" opacity=".7" />
          <ellipse cx="93.5" cy="191" rx="2.4" ry="4" fill="#C49A6C" />
        </g>
        <g transform="rotate(12 130 191)">
          <rect x="112" y="187" width="36" height="8" rx="4" :fill="url('log')" />
          <path d="M120 192h8M133 189h8" stroke="#4E331D" stroke-width="1" stroke-linecap="round" opacity=".7" />
          <ellipse cx="146.5" cy="191" rx="2.4" ry="4" fill="#C49A6C" />
        </g>
        <!-- flame tongues, back to front -->
        <path class="fl flL" d="M101 160c8 10 12 16 12 23a12 12 0 0 1-24 0c0-5 3-9 6-12 1 3 3 4 4 2 0-4 1-8 2-13Z" :fill="url('f1')" opacity=".92" />
        <path class="fl flR" d="M139 160c-1 5-2 9-2 13 1 2 3 1 4-2 3 3 6 7 6 12a12 12 0 0 1-24 0c0-7 4-13 16-23Z" :fill="url('f1')" opacity=".92" />
        <path class="fl fl1" d="M120 144c6 10 14 16 20 26 4 6 6 10 6 16 0 8-12 12-26 12s-26-4-26-12c0-8 5-13 9-18 1 5 3 7 6 6 1-10 5-20 11-30Z" :fill="url('f1')" />
        <path class="fl fl2" d="M120 158c5 8 10 13 13 19 1 3 1 6 1 9 0 6-6 9-14 9s-14-3-14-9c0-5 3-9 6-12 1 3 2 4 4 3 0-6 2-12 4-19Z" :fill="url('f2')" />
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
