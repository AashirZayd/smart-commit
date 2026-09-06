const GENERIC_CONTAINERS = new Set([
  "src",
  "lib",
  "dist",
  "build",
  "out",
  "bin",
  "test",
  "tests",
  "spec",
  "specs",
  "docs",
  "doc",
  "node_modules",
  "vendor",
  "coverage"
])

const MONOREPO_CONTAINERS = new Set([
  "packages",
  "apps",
  "services",
  "modules",
  "plugins"
])

const INTERMEDIATE_CONTAINERS = new Set([
  "features",
  "services",
  "modules",
  "packages",
  "apps",
  "domains"
])

function normalizeGitPath(filePath) {
  if (!filePath || typeof filePath !== "string") return ""
  let p = filePath.trim()
  if (p.includes(" -> ")) {
    p = p.split(" -> ").pop().trim()
  }
  p = p.replace(/\\/g, "/")
  p = p.replace(/^\.?\/+/, "")
  p = p.replace(/\/+$/, "")
  return p
}

function sanitizeScope(raw) {
  if (!raw || typeof raw !== "string") return null
  let s = raw.trim()
  s = s.replace(/\\/g, "/")
  s = s.replace(/^\.?\/+/, "").replace(/\/+$/, "")
  s = s.replace(/\.[a-zA-Z0-9]+$/, "")
  s = s.replace(/^[^a-zA-Z0-9@_-]+/, "").replace(/[^a-zA-Z0-9@_-]+$/, "")
  s = s.toLowerCase()
  return s || null
}

function inferFileScope(filePath) {
  const normalized = normalizeGitPath(filePath)
  if (!normalized) return null

  const parts = normalized.split("/").filter(Boolean)
  if (parts.length <= 1) {
    // Root-level file (e.g. package.json, README.md)
    return null
  }

  const first = parts[0].toLowerCase()

  // 1. Monorepo / organizational container (packages, apps, services, modules, plugins)
  if (MONOREPO_CONTAINERS.has(first)) {
    if (parts.length >= 3 || (parts.length === 2 && !/\.[a-zA-Z0-9]+$/.test(parts[1]))) {
      return sanitizeScope(parts[1])
    }
    return null
  }

  // 2. Generic structural container (src, lib, test, docs, etc.)
  if (GENERIC_CONTAINERS.has(first)) {
    if (parts.length <= 2) {
      // Direct child of generic container without sub-domain (e.g. src/index.js)
      return null
    }

    const second = parts[1].toLowerCase()
    // Intermediate grouping folder (e.g. src/features/auth/..., src/services/payment/...)
    if (INTERMEDIATE_CONTAINERS.has(second) && parts.length > 3) {
      return sanitizeScope(parts[2])
    }

    return sanitizeScope(parts[1])
  }

  // 3. Domain directory at repository root (e.g. auth/login.js, components/Button.jsx)
  return sanitizeScope(parts[0])
}

function detectScopes(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return []
  }

  const uniqueFiles = Array.from(
    new Set(files.map(normalizeGitPath).filter(Boolean))
  )

  if (uniqueFiles.length === 0) {
    return []
  }

  const fileScopes = uniqueFiles.map(inferFileScope).filter(Boolean)

  if (fileScopes.length === 0) {
    return []
  }

  const counts = new Map()
  for (const scope of fileScopes) {
    counts.set(scope, (counts.get(scope) || 0) + 1)
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])

  if (sorted.length === 1) {
    return [sorted[0][0]]
  }

  const [topScope, topCount] = sorted[0]
  const [, secondCount] = sorted[1]
  const totalScoped = fileScopes.length

  if (topCount / totalScoped >= 0.7 && topCount >= 3 && topCount > secondCount * 2) {
    return [topScope]
  }

  return []
}

export {
  detectScopes,
  inferFileScope,
  normalizeGitPath,
  sanitizeScope,
  GENERIC_CONTAINERS,
  MONOREPO_CONTAINERS,
  INTERMEDIATE_CONTAINERS
}