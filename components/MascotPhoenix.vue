<template>
  <svg class="scene" viewBox="0 0 240 178" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="mascot">
    <circle class="tw" cx="30" cy="26" r="2.4" fill="#FFF3C4"/>
    <circle class="tw d1" cx="205" cy="18" r="1.9" fill="#FFF3C4"/>
    <circle class="tw d2" cx="176" cy="44" r="1.5" fill="#FFF3C4"/>
    <circle class="tw d3" cx="62" cy="12" r="1.6" fill="#FFF3C4"/>
    <ellipse cx="120" cy="168" rx="86" ry="7" fill="rgba(10,40,90,.18)"/>
    <g>
      <circle class="glow" cx="47" cy="128" r="26" fill="#F0B429" opacity=".35"/>
      <rect x="30" y="146" width="34" height="7" rx="3.5" fill="#7A5230" transform="rotate(-14 47 150)"/>
      <rect x="30" y="146" width="34" height="7" rx="3.5" fill="#8C6239" transform="rotate(14 47 150)"/>
      <path class="flameO" d="M47 106c7 9 13 15 13 24a13 13 0 0 1-26 0c0-9 6-15 13-24Z" fill="#F0B429"/>
      <path class="flameI" d="M47 120c3.6 4.6 6.6 7.8 6.6 12.4a6.6 6.6 0 0 1-13.2 0c0-4.6 3-7.8 6.6-12.4Z" fill="#E06A2B"/>
    </g>
    <g class="bob">
      <!-- tail feathers, peeking from behind -->
      <path d="M96 118 84 138 100 132Z" fill="#2A3A8F"/>
      <path d="M104 122 96 144 112 136Z" fill="#3B4FB0"/>
      <path d="M136 122 144 144 128 136Z" fill="#3B4FB0"/>
      <path d="M144 118 156 138 140 132Z" fill="#2A3A8F"/>
      <!-- folded left wing -->
      <path d="M64 100q-16 6-16 24q0 10 9 15q-2-12 3-21q4-8 11-11Z" fill="#2A3A8F"/>
      <path d="M67 103q-11 6-11 20q0 7 6 11q-1-9 2-16q3-7 8-10Z" fill="#3B4FB0"/>
      <!-- legs & feet -->
      <rect x="105" y="140" width="5" height="14" rx="2.5" fill="#E0A22E"/>
      <rect x="130" y="140" width="5" height="14" rx="2.5" fill="#E0A22E"/>
      <path d="M99 154h16l-2 4H101Z" fill="#C98A1E"/>
      <path d="M124 154h16l-2 4H126Z" fill="#C98A1E"/>
      <path d="M107 154v5M110 154v6M113 154v5" stroke="#C98A1E" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M132 154v5M135 154v6M138 154v5" stroke="#C98A1E" stroke-width="1.6" stroke-linecap="round"/>
      <!-- body: uniform shirt (unchanged — this is what makes it "in uniform") -->
      <path d="M96 96h48c6 22-4 40-24 40s-30-18-24-40Z" fill="#2F6B45"/>
      <!-- neckerchief -->
      <path d="M100 96q20 12 40 0l-6 10q-14 8-28 0Z" fill="#F0B429"/>
      <path d="M116 104h8l-4 12Z" fill="#E9A93B"/>
      <rect x="116.5" y="101" width="7" height="6" rx="2.6" fill="#B23A2E"/>
      <!-- head: phoenix, echoing the crest's blue plumage -->
      <path d="M113 30q-3-14 7-18q-6 8-2 16Z" fill="#F0B429"/>
      <path d="M120 26q-1-16 10-21q-8 9-6 19Z" fill="#F7C948"/>
      <path d="M127 30q3-15 14-17q-9 7-8 16Z" fill="#F0B429"/>
      <circle cx="120" cy="52" r="30" fill="#2E3F9E"/>
      <path d="M96 52a24 24 0 0 1 48 0c0 3-2 5-5 5H101c-3 0-5-2-5-5Z" fill="#3B4FB0"/>
      <ellipse cx="120" cy="60" rx="16" ry="12" fill="#5D6EC7"/>
      <g class="eyes">
        <circle cx="108" cy="48" r="7" fill="#fff"/>
        <circle cx="132" cy="48" r="7" fill="#fff"/>
        <circle cx="109.5" cy="49" r="3.4" fill="#1A2140"/>
        <circle cx="130.5" cy="49" r="3.4" fill="#1A2140"/>
        <circle cx="110.6" cy="47.6" r="1.1" fill="#fff"/>
        <circle cx="131.6" cy="47.6" r="1.1" fill="#fff"/>
      </g>
      <path d="M112 66q9 5 16 0l4 5q-12 8-24 0Z" fill="#F0B429"/>
      <!-- waving wing -->
      <g class="wave">
        <path d="M141 100q10-4 20-16q4-5 2-11q7 3 6 12q-2 13-19 21Z" fill="#2A3A8F"/>
        <path d="M144 98q8-4 15-14q3-4 1-8q6 2 5 9q-2 11-15 18Z" fill="#3B4FB0"/>
        <path d="M147 95q6-3 11-10q2-3 0-6q5 1 4 7q-1 8-10 13Z" fill="#F0B429"/>
      </g>
      <circle cx="85" cy="127" r="5.5" fill="#3B4FB0"/>
    </g>
  </svg>
</template>
