import { loadConfig } from "./config.js"

function hasToken(filePath, keywords) {
  if (!filePath || !keywords) return false
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const tokens = p.split(/[^a-z0-9]+/).filter(Boolean)
  const tokenSet = new Set(tokens)

  for (const kw of keywords) {
    if (tokenSet.has(kw.toLowerCase())) {
      return true
    }
  }
  return false
}

function isDocsFile(filePath) {
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const base = p.split("/").pop()
  if (
    base.startsWith("readme") ||
    base.startsWith("changelog") ||
    base.startsWith("contributing") ||
    base.startsWith("license") ||
    base.startsWith("copying")
  ) {
    return true
  }
  if (
    base.endsWith(".md") ||
    base.endsWith(".markdown") ||
    base.endsWith(".rst") ||
    base.endsWith(".adoc")
  ) {
    return true
  }
  if (
    p.startsWith("docs/") ||
    p.startsWith("doc/") ||
    p.includes("/docs/") ||
    p.includes("/doc/")
  ) {
    return true
  }
  return false
}

function isTestFile(filePath) {
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const base = p.split("/").pop()
  const parts = p.split("/").slice(0, -1)

  for (const part of parts) {
    if (
      part === "test" ||
      part === "tests" ||
      part === "spec" ||
      part === "specs" ||
      part === "__tests__"
    ) {
      return true
    }
  }

  if (
    /\.(test|spec)\.[a-z0-9]+$/.test(base) ||
    /(_test|test_)\.[a-z0-9]+$/.test(base) ||
    /(_spec|spec_)\.[a-z0-9]+$/.test(base) ||
    base.startsWith("test-") ||
    base.startsWith("test_")
  ) {
    return true
  }

  return false
}

function isStyleFile(filePath) {
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const base = p.split("/").pop()

  if (
    base.endsWith(".css") ||
    base.endsWith(".scss") ||
    base.endsWith(".sass") ||
    base.endsWith(".less") ||
    base.endsWith(".styl")
  ) {
    return true
  }

  if (
    base.startsWith(".prettierrc") ||
    base === ".prettierignore" ||
    base === ".editorconfig" ||
    base.startsWith(".stylelintrc")
  ) {
    return true
  }

  return false
}

function isChoreFile(filePath) {
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const base = p.split("/").pop()

  if (
    base === "package.json" ||
    base === "package-lock.json" ||
    base === "pnpm-lock.yaml" ||
    base === "yarn.lock" ||
    base.startsWith("tsconfig") ||
    base.includes("vite.config") ||
    base.includes("webpack.config") ||
    base.includes("rollup.config") ||
    base.includes("turbo.json") ||
    base.includes("lerna.json") ||
    base === ".gitignore" ||
    base === ".gitattributes" ||
    base === ".npmignore" ||
    base.startsWith(".eslintrc") ||
    base.includes("eslint.config") ||
    base.includes("babel.config") ||
    base === ".dockerignore" ||
    base === "dockerfile" ||
    base.startsWith("docker-compose") ||
    base === "makefile"
  ) {
    return true
  }

  if (p.startsWith(".github/") || p.includes("/.github/") || base === ".gitlab-ci.yml") {
    return true
  }

  return false
}

function isBinaryFile(filePath, fileDetail) {
  if (fileDetail?.binary) return true
  const p = filePath.toLowerCase().replace(/\\/g, "/")
  const base = p.split("/").pop()
  return /\.(png|jpg|jpeg|gif|ico|svg|pdf|woff|woff2|ttf|eot|zip|tar|gz|exe|bin|dylib|so|dll)$/i.test(base)
}

function isSourceFile(filePath, fileDetail) {
  return (
    !isDocsFile(filePath) &&
    !isTestFile(filePath) &&
    !isStyleFile(filePath) &&
    !isChoreFile(filePath) &&
    !isBinaryFile(filePath, fileDetail)
  )
}

function getFileStatuses(files, context) {
  const created = new Set((context?.status?.created || []).map(f => f.replace(/\\/g, "/")))
  const modified = new Set((context?.status?.modified || []).map(f => f.replace(/\\/g, "/")))
  const deleted = new Set((context?.status?.deleted || []).map(f => f.replace(/\\/g, "/")))
  const renamed = new Set(
    (context?.status?.renamed || []).map(r => (r.to || r).replace(/\\/g, "/"))
  )

  const patch = context?.diff?.patch || (typeof context?.patch === "string" ? context.patch : "")
  if (patch) {
    const diffBlocks = patch.split(/^diff --git /m)
    for (const block of diffBlocks) {
      if (!block.trim()) continue
      const headerMatch = block.match(/^a\/(.+?) b\/(.+?)$/m)
      const targetPath = headerMatch ? headerMatch[2].replace(/\\/g, "/") : null
      if (targetPath) {
        if (/^new file mode /m.test(block)) {
          created.add(targetPath)
        }
        if (/^deleted file mode /m.test(block)) {
          deleted.add(targetPath)
        }
        if (/^rename to /m.test(block)) {
          renamed.add(targetPath)
        }
      }
    }
  }

  return { created, modified, deleted, renamed }
}

function suggestType(files, context = {}) {
  if (!Array.isArray(files) || files.length === 0) {
    return { type: "chore", reason: "no staged files" }
  }

  const diff = context?.diff || (context?.patch !== undefined ? context : null)
  const fileDetails = diff?.fileDetails || []
  const patch = diff?.patch || (typeof context?.patch === "string" ? context.patch : "")
  const insertions = diff?.insertions ?? 0
  const deletions = diff?.deletions ?? 0
  const totalChanges = insertions + deletions

  const detailMap = new Map()
  for (const item of fileDetails) {
    if (item?.file) {
      detailMap.set(item.file.replace(/\\/g, "/"), item)
    }
  }

  const { created, modified, deleted, renamed } = getFileStatuses(files, context)

  // 1. Categorize all staged files
  const docsFiles = files.filter(f => isDocsFile(f))
  const testFiles = files.filter(f => isTestFile(f))
  const styleFiles = files.filter(f => isStyleFile(f))
  const choreFiles = files.filter(f => isChoreFile(f))
  const binaryFiles = files.filter(f => isBinaryFile(f, detailMap.get(f.replace(/\\/g, "/"))))
  const sourceFiles = files.filter(f => isSourceFile(f, detailMap.get(f.replace(/\\/g, "/"))))

  // 2. Homogeneous auxiliary file changes (when no source files are present)
  if (sourceFiles.length === 0) {
    if (docsFiles.length > 0 && docsFiles.length === files.length) {
      return { type: "docs", reason: "documentation-only change" }
    }
    if (testFiles.length > 0 && testFiles.length === files.length) {
      return { type: "test", reason: "test-only change" }
    }
    if (styleFiles.length > 0 && styleFiles.length === files.length) {
      return { type: "style", reason: "style/formatting-only change" }
    }
    if (binaryFiles.length > 0 && binaryFiles.length === files.length) {
      return { type: "chore", reason: "asset/binary-only change" }
    }
    if (choreFiles.length > 0 && choreFiles.length === files.length) {
      return { type: "chore", reason: "maintenance/configuration-only change" }
    }

    if (testFiles.length > 0 && docsFiles.length + testFiles.length === files.length) {
      return { type: "test", reason: "test and documentation updates" }
    }

    if (choreFiles.length > 0) {
      return { type: "chore", reason: "repository configuration and maintenance" }
    }
  }

  // 3. Structural Renames / Moves
  const areAllRenamed = files.every(f => renamed.has(f.replace(/\\/g, "/")))
  if (areAllRenamed && files.length > 0) {
    return { type: "refactor", reason: "file rename/move" }
  }

  // 4. Pure Deletions of obsolete files
  const areAllDeleted = files.every(f => deleted.has(f.replace(/\\/g, "/")))
  if (areAllDeleted && files.length > 0) {
    if (sourceFiles.length > 0) {
      return { type: "refactor", reason: "removed obsolete code" }
    }
    if (docsFiles.length === files.length) {
      return { type: "docs", reason: "removed obsolete documentation" }
    }
    if (testFiles.length === files.length) {
      return { type: "test", reason: "removed obsolete tests" }
    }
    return { type: "chore", reason: "removed unused files" }
  }

  // 5. Implementation Code Changes (sourceFiles.length > 0)
  if (sourceFiles.length > 0) {
    const newSourceFiles = sourceFiles.filter(f => created.has(f.replace(/\\/g, "/")))

    // A newly added source implementation file strongly signals feat
    if (newSourceFiles.length > 0) {
      return { type: "feat", reason: `added new implementation (${newSourceFiles[0]})` }
    }

    // Refactor signal: balanced structural rewrite (+120 / -115) on existing code
    if (
      totalChanges >= 15 &&
      insertions > 0 &&
      deletions > 0 &&
      insertions / deletions >= 0.6 &&
      insertions / deletions <= 1.6
    ) {
      return { type: "refactor", reason: "balanced structural rewrite / refactor" }
    }

    // Token check on source filenames (using word-boundary tokens, eliminating substring matches)
    const hasFixToken = sourceFiles.some(f =>
      hasToken(f, ["fix", "bug", "patch", "resolve", "error", "issue"])
    )
    const hasFeatToken = sourceFiles.some(f =>
      hasToken(f, ["feat", "feature", "add", "implement", "create"])
    )

    if (hasFixToken && !hasFeatToken) {
      return { type: "fix", reason: "fix signal in filename" }
    }
    if (hasFeatToken && !hasFixToken) {
      return { type: "feat", reason: "feature signal in filename" }
    }

    // Diff patch inspection (safety capped at 500KB)
    const safePatch = patch && patch.length <= 500000 ? patch : ""
    if (safePatch) {
      const diffLines = safePatch.split("\n")
      let fixLogicSignals = 0

      for (const line of diffLines) {
        if (
          (line.startsWith("+") && !line.startsWith("+++")) ||
          (line.startsWith("-") && !line.startsWith("---"))
        ) {
          const content = line.slice(1).trim()
          // Skip comment lines in patch
          if (/^\/\//.test(content) || /^\/\*/.test(content) || /^\*/.test(content)) {
            continue
          }
          // Check for bug-fix and error-handling logic constructs
          if (
            /(?:if\s*\(|catch\s*\(|throw\s+new|return\s+null|return\s+false|===|!==|\?\?|\|\|\s*null)/.test(
              content
            )
          ) {
            fixLogicSignals++
          }
        }
      }

      // Targeted fix to existing logic
      if (fixLogicSignals >= 1 && totalChanges <= 50 && insertions <= 35) {
        return { type: "fix", reason: "logic correction / bug fix in existing code" }
      }
    }

    // Significant new functionality added to existing code
    if (insertions >= 10 && (deletions === 0 || insertions >= deletions * 2.5)) {
      return { type: "feat", reason: "substantial new functionality added" }
    }

    // Targeted small modification on existing files
    if (totalChanges <= 30 && deletions > 0 && insertions > 0) {
      return { type: "fix", reason: "targeted fix to existing implementation" }
    }

    // If insertions dominate
    if (insertions > deletions) {
      return { type: "feat", reason: "implementation additions" }
    }

    // If deletions dominate significantly
    if (deletions > insertions * 2) {
      return { type: "refactor", reason: "cleanup / code reduction" }
    }
  }

  // 6. Token-Aware Fallback on User Config or Default Rules
  const config = loadConfig()
  const rules = config?.types || {
    feat: ["add", "feature", "implement", "create"],
    fix: ["bug", "error", "patch", "resolve", "fix"],
    docs: ["docs", "readme", "documentation"],
    refactor: ["cleanup", "refactor", "optimize"],
    test: ["test", "spec"],
    chore: ["config", "build", "setup", "chore"]
  }

  for (const type in rules) {
    const keywords = rules[type]
    for (const file of files) {
      if (hasToken(file, keywords)) {
        return { type, reason: `matched keyword token for ${type}` }
      }
    }
  }

  // 7. Default Fallback
  return {
    type: "chore",
    reason: "default fallback"
  }
}

export {
  suggestType,
  isDocsFile,
  isTestFile,
  isStyleFile,
  isChoreFile,
  isBinaryFile,
  isSourceFile,
  hasToken
}