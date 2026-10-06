/** A file or a photo as base64, for sending in a JSON body. */
export const blobToBase64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader()
  r.onload = () => res(String(r.result).split(',')[1] || '')
  r.onerror = rej
  r.readAsDataURL(b)
})
