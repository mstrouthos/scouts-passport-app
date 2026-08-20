<script setup lang="ts">
/* Numbered-marker uniform figures: one drawing serves both languages. */
defineProps<{ kind: 'formal' | 'work' }>()
const mark = (x: number, y: number, x2: number, y2: number, i: number) =>
  `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="#A9BDD3" stroke-width="1.2" stroke-dasharray="2.5 2.5"/>` +
  `<circle cx="${x}" cy="${y}" r="9.5" fill="#1D5AC4"/>` +
  `<text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">${i}</text>`
const formal = `
  <rect x="72" y="150" width="24" height="106" rx="6" fill="#2B3A55"/>
  <rect x="104" y="150" width="24" height="106" rx="6" fill="#2B3A55"/>
  <rect x="73" y="248" width="22" height="14" fill="#1E2A3D"/>
  <rect x="105" y="248" width="22" height="14" fill="#1E2A3D"/>
  <rect x="66" y="260" width="32" height="11" rx="4" fill="#22262B"/>
  <rect x="102" y="260" width="32" height="11" rx="4" fill="#22262B"/>
  <rect x="92" y="58" width="16" height="20" fill="#DDAF86"/>
  <rect x="52" y="80" width="18" height="68" rx="9" fill="#D8C9A3"/>
  <rect x="130" y="80" width="18" height="68" rx="9" fill="#D8C9A3"/>
  <circle cx="61" cy="152" r="7.5" fill="#E9BC93"/>
  <circle cx="139" cy="152" r="7.5" fill="#E9BC93"/>
  <rect x="70" y="74" width="60" height="78" rx="8" fill="#D8C9A3"/>
  <path d="M70 80q30-11 60 0v-6H70z" fill="#C5B48B"/>
  <circle cx="79" cy="48" r="4.5" fill="#DDAF86"/>
  <circle cx="121" cy="48" r="4.5" fill="#DDAF86"/>
  <circle cx="100" cy="44" r="21" fill="#E9BC93"/>
  <path d="M77 34c0-14 10-22 23-22s23 8 23 22c0 3-2 4-5 4H82c-3 0-5-1-5-4z" fill="#14371F"/>
  <rect x="74" y="33" width="52" height="7" rx="3.5" fill="#0D2515"/>
  <circle cx="114" cy="26" r="4" fill="#F0B429"/>
  <path d="M76 77q24-8 48 0l-4 9q-20-6-40 0z" fill="#B23A2E"/>
  <path d="M92 87h16l-8 31z" fill="#B23A2E"/>
  <rect x="92.5" y="82" width="15" height="10" rx="4.5" fill="#F0B429"/>
  <rect x="70" y="140" width="60" height="12" fill="#4A3728"/>
  <rect x="93" y="141.5" width="15" height="9" rx="2" fill="#F0B429"/>
  <rect x="55" y="92" width="12" height="9" rx="2" fill="#B23A2E"/>
  <rect x="55" y="105" width="12" height="7" rx="2" fill="#F0B429"/>
  <rect x="55" y="116" width="12" height="7" rx="2" fill="#2FA36B"/>
  ${mark(152, 24, 126, 30, 1)}${mark(168, 104, 150, 104, 2)}${mark(34, 70, 78, 80, 3)}${mark(34, 145, 68, 146, 4)}
  ${mark(168, 196, 130, 196, 5)}${mark(32, 254, 72, 254, 6)}${mark(154, 270, 136, 266, 7)}${mark(28, 110, 53, 110, 8)}`
const work = `
  <rect x="76" y="190" width="20" height="62" rx="6" fill="#E9BC93"/>
  <rect x="104" y="190" width="20" height="62" rx="6" fill="#E9BC93"/>
  <rect x="76" y="244" width="20" height="13" rx="3" fill="#F4F4F0"/>
  <rect x="104" y="244" width="20" height="13" rx="3" fill="#F4F4F0"/>
  <rect x="68" y="254" width="32" height="13" rx="5" fill="#EAEAE4"/>
  <rect x="100" y="254" width="32" height="13" rx="5" fill="#EAEAE4"/>
  <rect x="68" y="263" width="32" height="5" rx="2.5" fill="#4A4F4A"/>
  <rect x="100" y="263" width="32" height="5" rx="2.5" fill="#4A4F4A"/>
  <rect x="72" y="140" width="56" height="58" rx="7" fill="#2B3A55"/>
  <rect x="98" y="160" width="4" height="38" fill="#243149"/>
  <rect x="92" y="58" width="16" height="20" fill="#DDAF86"/>
  <rect x="58" y="104" width="13" height="46" rx="6.5" fill="#E9BC93"/>
  <rect x="129" y="104" width="13" height="46" rx="6.5" fill="#E9BC93"/>
  <circle cx="64.5" cy="152" r="7.5" fill="#E9BC93"/>
  <circle cx="135.5" cy="152" r="7.5" fill="#E9BC93"/>
  <rect x="54" y="80" width="18" height="30" rx="8" fill="#2F6B45"/>
  <rect x="128" y="80" width="18" height="30" rx="8" fill="#2F6B45"/>
  <rect x="70" y="74" width="60" height="72" rx="8" fill="#2F6B45"/>
  <path d="M88 74h24l-12 13z" fill="#265A3A"/>
  <rect x="80" y="104" width="24" height="16" rx="3" fill="#F0B429" opacity=".85"/>
  <circle cx="79" cy="48" r="4.5" fill="#DDAF86"/>
  <circle cx="121" cy="48" r="4.5" fill="#DDAF86"/>
  <circle cx="100" cy="44" r="21" fill="#E9BC93"/>
  <path d="M78 36c0-13 10-21 22-21s22 8 22 21v2H78z" fill="#2F6B45"/>
  <path d="M122 32h23c4 0 5 7 0 7h-23z" fill="#245537"/>
  <path d="M76 77q24-8 48 0l-4 9q-20-6-40 0z" fill="#B23A2E"/>
  <path d="M92 87h16l-8 26z" fill="#B23A2E"/>
  <rect x="92.5" y="82" width="15" height="10" rx="4.5" fill="#F0B429"/>
  ${mark(168, 100, 148, 100, 1)}${mark(32, 70, 78, 80, 2)}${mark(168, 168, 130, 168, 3)}${mark(154, 266, 136, 262, 4)}${mark(152, 22, 124, 28, 5)}`
</script>

<template>
  <div class="card" style="display:grid;place-items:center;padding:14px 8px">
    <svg viewBox="0 0 200 292" style="width:100%;max-width:200px" xmlns="http://www.w3.org/2000/svg" role="img"
         v-html="kind === 'formal' ? formal : work" />
  </div>
</template>
