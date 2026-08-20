<template>
  <svg class="scene" viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="phoenix">
    <circle class="tw" cx="34" cy="30" r="2.4" fill="#FFF3C4"/>
    <circle class="tw d1" cx="206" cy="22" r="1.9" fill="#FFF3C4"/>
    <circle class="tw d2" cx="182" cy="52" r="1.5" fill="#FFF3C4"/>
    <circle class="tw d3" cx="60" cy="16" r="1.6" fill="#FFF3C4"/>

    <!-- firelight pooling on the ground -->
    <ellipse class="glow" cx="120" cy="192" rx="72" ry="12" fill="#F0B429" opacity=".35"/>

    <g class="bird">
      <!-- tail: long feathers fanning out and down, flanking the fire -->
      <path d="M110 128C96 148 76 166 52 178c26-6 48-20 62-40Z" fill="#C98A1E"/>
      <path d="M130 128c14 20 34 38 58 50-26-6-48-20-62-40Z" fill="#C98A1E"/>
      <path d="M114 132c-10 20-26 37-46 50 22-8 40-22 50-40Z" fill="#E0A22E"/>
      <path d="M126 132c10 20 26 37 46 50-22-8-40-22-50-40Z" fill="#E0A22E"/>
      <path d="M118 134c-4 20-12 38-24 54 16-14 26-32 30-50Z" fill="#F0B429"/>
      <path d="M122 134c4 20 12 38 24 54-16-14-26-32-30-50Z" fill="#F0B429"/>

      <!-- left wing: three broad layered feathers -->
      <g class="wingL">
        <path d="M108 92C84 78 56 60 32 36c12 26 30 46 52 64Z" fill="#E0A22E"/>
        <path d="M108 100C82 92 52 82 26 70c16 22 40 36 62 44Z" fill="#F0B429"/>
        <path d="M106 110c-24 0-52 2-76-2 20 14 46 20 66 18Z" fill="#F7C948"/>
      </g>
      <!-- right wing, mirrored -->
      <g class="wingR">
        <path d="M132 92c24-14 52-32 76-56-12 26-30 46-52 64Z" fill="#E0A22E"/>
        <path d="M132 100c26-8 56-18 82-30-16 22-40 36-62 44Z" fill="#F0B429"/>
        <path d="M134 110c24 0 52 2 76-2-20 14-46 20-66 18Z" fill="#F7C948"/>
      </g>

      <!-- body -->
      <path d="M120 72c14 0 23 15 23 32s-9 28-23 28-23-11-23-28 9-32 23-32Z" fill="#F0B429"/>
      <path d="M120 86c8 0 12 11 12 21s-4 17-12 17-12-7-12-17 4-21 12-21Z" fill="#F7C948"/>

      <!-- neckerchief: the scout half of a scout phoenix -->
      <path d="M105 78q15 11 30 0l-5 11q-10 6-20 0Z" fill="#B23A2E"/>
      <path d="M116 88h8l-4 13Z" fill="#9E3226"/>
      <rect x="116.2" y="85" width="7.6" height="6" rx="2.6" fill="#2F6B45"/>

      <!-- crest: a compact flame tuft -->
      <path d="M114 48c-5-3-9-8-11-14 5 5 9 10 12 14Z" fill="#E0A22E"/>
      <path d="M118 46c-3-6-3-12-1-18 1 6 2 12 4 18Z" fill="#F0B429"/>
      <path d="M123 45c0-7 2-13 6-18-2 6-2 12-2 18Z" fill="#F7C948"/>
      <path d="M127 47c4-5 9-9 15-11-5 4-10 8-12 13Z" fill="#F0B429"/>

      <!-- head -->
      <circle cx="120" cy="60" r="14" fill="#F7C948"/>
      <path d="M106 60a14 14 0 0 1 28 0Z" fill="#FBD976"/>
      <path d="M120 64l10 5-10 5Z" fill="#E06A2B"/>
      <path d="M120 69h10l-10 5Z" fill="#C4551F"/>
      <g class="eyes">
        <circle cx="113" cy="58" r="4.2" fill="#fff"/>
        <circle cx="127" cy="58" r="4.2" fill="#fff"/>
        <circle cx="113.7" cy="58.6" r="2.2" fill="#1A2140"/>
        <circle cx="126.3" cy="58.6" r="2.2" fill="#1A2140"/>
        <circle cx="114.4" cy="57.5" r=".85" fill="#fff"/>
        <circle cx="127" cy="57.5" r=".85" fill="#fff"/>
      </g>

      <!-- legs -->
      <rect x="112" y="130" width="4" height="14" rx="2" fill="#E0A22E"/>
      <rect x="124" y="130" width="4" height="14" rx="2" fill="#E0A22E"/>
      <path d="M108 144h12l-1.5 3.2H109.5Z" fill="#C98A1E"/>
      <path d="M120 144h12l-1.5 3.2H121.5Z" fill="#C98A1E"/>
    </g>

    <!-- campfire beneath the phoenix -->
    <g>
      <rect x="94" y="188" width="32" height="6" rx="3" fill="#7A5230" transform="rotate(-12 110 191)"/>
      <rect x="114" y="188" width="32" height="6" rx="3" fill="#8C6239" transform="rotate(12 130 191)"/>
      <path class="flL" d="M100 162c7 11 11 16 11 22a11 11 0 0 1-22 0c0-6 4-11 11-22Z" fill="#E06A2B" opacity=".9"/>
      <path class="flR" d="M140 162c7 11 11 16 11 22a11 11 0 0 1-22 0c0-6 4-11 11-22Z" fill="#E06A2B" opacity=".9"/>
      <path class="fl1" d="M120 148c14 18 26 28 26 38 0 8-12 12-26 12s-26-4-26-12c0-10 12-20 26-38Z" fill="#E06A2B"/>
      <path class="fl2" d="M120 162c8 12 14 18 14 25 0 6-6 9-14 9s-14-3-14-9c0-7 6-13 14-25Z" fill="#F0B429"/>
      <path class="fl3" d="M120 174c4 7 7 10 7 14 0 4-3 6-7 6s-7-2-7-6c0-4 3-7 7-14Z" fill="#FBD976"/>
      <circle class="ember" cx="102" cy="176" r="2" fill="#F7C948"/>
      <circle class="ember e1" cx="140" cy="180" r="1.6" fill="#F0B429"/>
      <circle class="ember e2" cx="120" cy="172" r="1.4" fill="#FBD976"/>
    </g>
  </svg>
</template>
