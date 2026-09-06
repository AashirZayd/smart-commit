import test from "node:test"
import assert from "node:assert/strict"
import { buildCommit } from "../src/commit.js"

test("buildCommit with emoji and scope", () => {
  const result = buildCommit({
    emoji: "✨",
    type: "feat",
    scope: "auth",
    message: "add login"
  })
  assert.equal(result, "✨ feat(auth): add login")
  assert.equal(result, result.trim())
})

test("buildCommit with emoji and no scope", () => {
  const result = buildCommit({
    emoji: "✨",
    type: "feat",
    scope: "",
    message: "add login"
  })
  assert.equal(result, "✨ feat: add login")
  assert.equal(result, result.trim())
})

test("buildCommit without emoji and with scope", () => {
  const result = buildCommit({
    emoji: "",
    type: "feat",
    scope: "auth",
    message: "add login"
  })
  assert.equal(result, "feat(auth): add login")
  assert.equal(result, result.trim())
})

test("buildCommit without emoji and without scope", () => {
  const result = buildCommit({
    emoji: "",
    type: "feat",
    scope: "",
    message: "add login"
  })
  assert.equal(result, "feat: add login")
  assert.equal(result, result.trim())
})

test("buildCommit with message containing punctuation", () => {
  const result = buildCommit({
    emoji: "",
    type: "feat",
    scope: "auth",
    message: "handle token expiry!"
  })
  assert.equal(result, "feat(auth): handle token expiry!")
  assert.equal(result, result.trim())
})

test("buildCommit with message containing quotes", () => {
  const result = buildCommit({
    emoji: "",
    type: "feat",
    scope: "auth",
    message: 'support "remember me"'
  })
  assert.equal(result, 'feat(auth): support "remember me"')
  assert.equal(result, result.trim())
})

test("buildCommit has no accidental leading or trailing whitespace across variations", () => {
  const variations = [
    { emoji: "🐛", type: "fix", scope: "api", message: "resolve timeout" },
    { emoji: "🐛", type: "fix", scope: "", message: "resolve timeout" },
    { emoji: "", type: "fix", scope: "api", message: "resolve timeout" },
    { emoji: "", type: "fix", scope: "", message: "resolve timeout" },
    { emoji: undefined, type: "chore", scope: undefined, message: "update build" }
  ]

  for (const v of variations) {
    const result = buildCommit(v)
    assert.equal(result, result.trim())
    assert.ok(!result.startsWith(" "))
    assert.ok(!result.endsWith(" "))
  }
})
