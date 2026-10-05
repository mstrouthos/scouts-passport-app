/* Form files (uploads and exports) are decrypted by the server for
   administrators only, so they are fetched like any other request — with the
   session the installed app carries — and then saved or shown from memory. */
export async function fetchFormFile(id: number): Promise<Blob> {
  return await $fetch<Blob>(`/api/admin/forms/files/${id}`, { responseType: 'blob' })
}
export async function downloadFormFile(id: number, name: string) {
  const blob = await fetchFormFile(id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
