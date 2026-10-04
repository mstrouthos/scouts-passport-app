import type { RouterConfig } from '@nuxt/schema'

/* On forms.scouts30.org a form lives at the top: forms.scouts30.org/<link>.
   That address knows only the form page; every other page of the app is
   simply not there. Everywhere else, the app's routes are as they are, and a
   form can be opened (or previewed) at /forms/<link>. */
export default <RouterConfig>{
  routes: (routes) => {
    if (typeof window === 'undefined' || !/^forms\./i.test(window.location.hostname)) return routes
    const form = routes.find(r => r.name === 'forms-slug')
    if (!form) return routes
    return [
      { ...form, name: 'public-form', path: '/:slug' },
      { ...form, name: 'public-form-home', path: '/' }
    ] as any
  }
}
