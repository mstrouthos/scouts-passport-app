/**
 * Bottom sheets are teleported to <body>, so a touch that runs past the end of
 * the sheet's own scroller used to chain into the page underneath. Lock the
 * document while any sheet is open — position:fixed rather than overflow:hidden,
 * because iOS Safari happily rubber-bands through the latter.
 */
export default defineNuxtPlugin(() => {
  let locked = false
  let scrollY = 0

  function lock() {
    if (locked) return
    locked = true
    scrollY = window.scrollY
    const b = document.body
    b.style.position = 'fixed'
    b.style.top = `-${scrollY}px`
    b.style.left = '0'
    b.style.right = '0'
    b.style.width = '100%'
    document.documentElement.classList.add('sheet-open')
  }

  function unlock() {
    if (!locked) return
    locked = false
    const b = document.body
    b.style.position = ''
    b.style.top = ''
    b.style.left = ''
    b.style.right = ''
    b.style.width = ''
    document.documentElement.classList.remove('sheet-open')
    window.scrollTo(0, scrollY)
  }

  const sync = () => (document.querySelector('.sheet-backdrop') ? lock() : unlock())

  const mo = new MutationObserver(sync)
  mo.observe(document.body, { childList: true, subtree: true })
  sync()
})
