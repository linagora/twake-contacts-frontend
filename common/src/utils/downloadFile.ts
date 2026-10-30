// Saves a blob on the user's device under the given file name
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Strips the characters file systems reject from a name used as a file name
export function toFileName(name: string, extension: string): string {
  const safeName = name.replace(/[\\/:*?"<>|]+/g, '_').trim()
  return `${safeName || 'contacts'}.${extension}`
}
