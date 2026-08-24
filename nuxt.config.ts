export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  ssr: false,   // login-gated PWA: everything is per-user, SSR only causes hydration drift
  devtools: { enabled: false },
  modules: ['@nuxtjs/i18n', 'nuxt-auth-utils', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Πύλη Προσκόπων',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#E8F1FA' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Commissioner:wght@300;400;500;600;700;800&display=swap' },
        { rel: 'apple-touch-icon', href: '/icons/icon-180.png' }
      ]
    }
  },

  i18n: {
    locales: [
      { code: 'el', language: 'el-GR', file: 'el.json', name: 'Ελληνικά' },
      { code: 'en', language: 'en-GB', file: 'en.json', name: 'English' }
    ],
    defaultLocale: 'el',
    strategy: 'no_prefix',
    detectBrowserLanguage: false
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Πύλη Προσκόπων',
      short_name: 'Πύλη Προσκόπων',
      description: 'Η ψηφιακή πλατφόρμα διαχείρισης του 30ού Συστήματος',
      lang: 'el',
      display: 'standalone',
      background_color: '#E8F1FA',
      theme_color: '#E8F1FA',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      importScripts: ['/push-sw.js']
    },
    client: { installPrompt: true }
  },

  runtimeConfig: {
    // Stay signed in until an explicit logout or a passcode rotation. Without
    // an explicit maxAge, h3 writes a *browser session* cookie, which is
    // dropped the moment the browser or installed PWA is closed — that was the
    // "it keeps asking me to log in" symptom.
    session: {
      maxAge: 60 * 60 * 24 * 365,          // 1 year, from the moment of login
      cookie: { sameSite: 'lax', path: '/' }
    },
    passcodePepper: 'dev-pepper-change-me',
    cronToken: 'dev-cron-token',
    vapidPrivateKey: '',
    vapidSubject: 'mailto:admin@example.org',
    resendApiKey: '',
    emailFrom: '',
    smsToApiKey: '',
    smsSenderId: '',
    databaseUrl: '',
    public: {
      vapidPublicKey: ''
    }
  },

  nitro: {
    preset: 'node-server'
  }
})
