function buildCommit({type, scope, message, emoji}) {

  const scopePart = scope ? `(${scope})` : ""

  return `${emoji} ${type}${scopePart}: ${message}`
}

module.exports = { buildCommit }