/* Sunrise and sunset for a day in Cyprus — NOAA's approximation (to about a
   minute), with the sun's centre 0.833° below the horizon as the edge.
   Shared by the server (when the flag may go up and come down) and the page. */

export const LARNACA = { lat: 34.9167, lon: 33.6333 }

/** The day's sunrise and sunset as instants, for a date 'YYYY-MM-DD'. */
export function sunTimes(day: string, place = LARNACA): { rise: string, set: string } {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5)
  const g = 2 * Math.PI / 365 * (doy - 1)
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const r = Math.PI / 180, lat = place.lat * r
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl)) / r
  const at = (utcMinutes: number) => new Date(Date.UTC(y, m - 1, d) + Math.round(utcMinutes * 60) * 1000).toISOString()
  return { rise: at(720 - 4 * (place.lon + ha) - eq), set: at(720 - 4 * (place.lon - ha) - eq) }
}
