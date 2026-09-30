/* The pin on the app's maps — drawn here, so Leaflet needs none of its image
   files — and the line that places one in an info page's text. */
export function pinIcon(L: any) {
  return L.divIcon({
    className: 'map-pin', iconSize: [30, 40], iconAnchor: [15, 38],
    html: '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true">'
      + '<path d="M15 39S28 24.5 28 14.5a13 13 0 0 0-26 0C2 24.5 15 39 15 39Z" fill="#E8531F" stroke="#fff" stroke-width="2"/>'
      + '<circle cx="15" cy="14.5" r="5" fill="#fff"/></svg>'
  })
}

export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_CREDIT = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'

/** 📍 Κατασκήνωση Τροόδους (34.91682, 32.86451) — readable, and editable by hand. */
export const PIN_LINE = /^📍\s*(.*?)\s*\((-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\)\s*$/
export const pinLine = (lat: number, lng: number, label: string) =>
  `📍 ${label.replace(/[()]/g, '').trim() || 'Τοποθεσία'} (${lat.toFixed(5)}, ${lng.toFixed(5)})`
