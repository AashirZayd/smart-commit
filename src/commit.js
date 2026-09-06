function buildCommit({type, scope, message, emoji}) {

  const prefix = emoji ? `${emoji} ` : ""
  const scopePart = scope ? `(${scope})` : ""

  return `${prefix}${type}${scopePart}: ${message}`
}

export { buildCommit }