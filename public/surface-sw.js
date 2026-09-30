/* The bar's and the families' own service worker, registered at /bar and at
   /family. It only shows their notifications. Having one of their own gives
   each installed app its own push subscription, so a phone that has the
   members' app and the bar app shows each notification under the app it is
   for, instead of under whichever one Android happens to pick. */
importScripts('/push-sw.js?v=4')
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
