# Korean Proofreading for Bendd

Use the configured `human-proofreader` MCP after technical review and before final MDX validation. Apply these instructions to both new drafts and prose revisions handled by this publishing workflow.

## Prepare the text

- Keep the original article and a mapping from extracted passages to their source locations. Send only reader-facing Korean prose and enough neighboring prose to retain context.
- Exclude YAML frontmatter, fenced/indented code, inline code, URLs and link/image destinations, imports/exports, MDX expressions, JSX tags and props, and raw HTML. Korean child text inside a component may be edited separately when it is clearly prose; leave ambiguous regions untouched and report them. Do not flatten an entire MDX file with regex replacements.
- If a sentence includes protected inline content, retain that content locally and send an unambiguous placeholder. Require the placeholder to remain intact, restore the original bytes, and check the complete sentence for changed meaning. Leave a passage unchanged if safe extraction or restoration is uncertain.
- Preserve numbers, units, versions, technical terms, direct quotations, and the author's register. Use `preserve` for exact quotations or sentences that must survive; this does not replace local checks of protected content.
- Keep each `proofread` input within the server's current limit (documented default: 20,000 characters), including placeholders. Split longer drafts at section or paragraph boundaries and retain section context. Never truncate silently.
- The public MCP sends submitted text to its server and, for model tools, Solar via its configured provider. Submit only draft prose suitable for that external processing; omit secrets, private source material, and identifying data that are unnecessary for editing.

## Run a conservative pass

Discover the tools on the `human-proofreader` server; do not assume a fixed Codex tool namespace. Use `usage` when quota availability matters.

Call `proofread` with:

```json
{
  "text": "<extracted Korean prose>",
  "genre": "블로그",
  "strength": "보수",
  "depth": "standard",
  "audience": "<the article's actual intended readers>",
  "instructions": "긴 문장, 번역투, 중복 표현만 보수적으로 다듬으세요. 기존 말투와 기술 용어의 영문 표기를 유지하세요. 새로운 주장, 사례, 수치, 비유를 추가하거나 기존 설명의 조건과 한계를 삭제하지 마세요. 보존용 placeholder를 그대로 유지하세요.",
  "preserve": [
    "<exact quotation, protected sentence, or placeholder, when present>"
  ]
}
```

Replace the example values with the actual passage and audience; omit `preserve` when empty. `standard` includes reading through and correction (normally two Solar calls), so do not routinely add `read_through`. Use `read_through` only when a diagnosis without edits is useful; use `suggest` for a specific weak opening or closing, rather than rewriting the whole article repeatedly.

## Review and compare

- Read the returned correction and its fidelity report. Record a concise before/after diff and reasons for meaningful changes in the working response before applying them. Follow the user's existing review and publication authorization; this step does not add a new approval gate.
- Reject any correction marked `abort` and keep its source passage intact. Inspect `warn`, `new_terms`, and dropped numbers; do not automatically accept an `ok` verdict either. Check changed qualifiers, negation, causality, API behavior, numbers/units, versions, and technical terminology against the original and the verified sources.
- The built-in report compares the original with the proposed correction. If Codex, a person, or `suggest` changes that correction, call `compare` with the same original extracted passage as `before` and the final candidate as `after`, plus the same `preserve` list. Reuse a still-valid report when text has not changed.
- Apply only reviewed prose changes at their recorded source locations. Restore placeholders exactly and compare protected regions locally against the original. If restoration fails or technical meaning drifts, retain the original passage and report the reason.
- Inspect the reassembled article for terminology and register consistency across chunks, then run the publishing workflow's MDX/frontmatter validation. Fidelity checks and readability scores do not establish technical accuracy or MDX validity; do not optimize a score at the expense of a precise explanation.

## Failure and cost handling

If the MCP is unavailable, a call fails, quota is exhausted, or a result is rejected, retain the original passage, report the affected scope, and continue independent local work. Do not present an incomplete pass as successful. Ask for direction only if the remaining gap prevents the requested publication from being completed correctly; do not silently publish an unresolved result.

Do not automatically loop retries, increase editing strength, switch providers, add paid API keys, or change MCP settings. The public service documents 100 free Solar calls per day, resetting at KST midnight; model calls, not tool invocations, consume that allowance. `compare` and `readability` use no Solar calls, but their inputs still reach the public MCP server. Check current `usage` instead of promising a fixed remaining allowance.

Connection: `https://human-proofreader-mcp.toy.x.upstage.ai/api/mcp`.
Tool contract and service details: [upstream README](https://github.com/SolarLLM/human-proofreader-mcp#readme).
