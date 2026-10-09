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
      id: '/',
      start_url: '/',
      scope: '/',
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
      // versioned, so phones fetch the new push handler with the next update
      // instead of keeping a cached copy
      importScripts: ['/push-sw.js?v=5']
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
    // encrypts form responses (server/utils/seal.ts) — set once, never change
    formsKey: '',
    cronToken: 'dev-cron-token',
    vapidPrivateKey: '',
    // optional: Google Maps text search for places (Places API) — without it,
    // OpenStreetMap is searched
    googleMapsKey: '',
    // optional: a Discord channel's webhook, for a report of what each
    // notification reached
    discordWebhookUrl: '',
    // optional: a separate channel for errors; without it they go to the one above
    discordErrorsWebhookUrl: '',
    // optional: a channel of its own for the mini-games' notifications
    // («Games Channel»); without it they go to the first one
    discordGamesWebhookUrl: '',
    // the photo game's judge: a Gemini API key (Google AI Studio), and optionally the model
    // (gemini-3.5-flash-lite unless set)
    geminiApiKey: '',
    geminiModel: '',
    vapidSubject: 'mailto:admin@example.org',
    resendApiKey: '',
    // the sender: its name and its address, set apart (NUXT_EMAIL_FROM, the
    // two together as "Name <address>", still works)
    emailFrom: '',
    emailFromName: '',
    emailFromAddress: '',
    smsToApiKey: '',
    smsSenderId: '',
    databaseUrl: '',
    // attachments: set these and PDFs go to the bucket instead of the database
    s3Bucket: '', s3Region: '', s3Endpoint: '', s3AccessKeyId: '', s3SecretAccessKey: '',
    public: {
      vapidPublicKey: ''
    }
  },

  nitro: {
    preset: 'node-server',
    // lets code deep inside a request (storage, push…) find that request —
    // so an error report can say which page and who, wherever it is raised
    experimental: { asyncContext: true }
  }
})
