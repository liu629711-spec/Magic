/** Resolve chat file targets without treating web links as workspace files. */
export function resolveFilePath(value: string, cwd?: string): string | null {
  let path = value.trim()
  if (!path || path.startsWith('#') || path.startsWith('//')) return null
  if (/^file:\/\//i.test(path)) {
    try {
      const url = new URL(path)
      path = decodeURIComponent(url.pathname)
      if (url.hostname && url.hostname !== 'localhost') path = '\\\\' + url.hostname + path.replaceAll('/', '\\')
      else if (/^\/[a-z]:\//i.test(path)) path = path.slice(1)
    } catch { return null }
  } else if (!/^[a-z]:[\\/]/i.test(path) && /^[a-z][a-z0-9+.-]*:/i.test(path)) return null
  else {
    path = path.replace(/#L?\d+(?:[-:]L?\d+)?$/i, '').replace(/:(\d+)(?::\d+)?$/, '')
    try { path = decodeURIComponent(path) } catch { /* Literal percent in filenames. */ }
  }
  if (/^[a-z]:[\\/]/i.test(path) || path.startsWith('/') || path.startsWith('\\')) return path
  if (!cwd) return path
  const separator = cwd.includes('\\') ? '\\' : '/'
  return cwd.replace(/[\\/]+$/, '') + separator + path.split(/[\\/]+/).join(separator)
}
