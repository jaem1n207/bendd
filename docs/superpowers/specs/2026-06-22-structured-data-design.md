# JSON-LD Structured Data Graph Design

## Context

bendd.me already emits JSON-LD for the root site, home profile, content
collections, article/craft detail pages, breadcrumbs, and series pages. The
current implementation works, but each route owns its own object and script
rendering. That makes the structured data harder to reason about as one graph.

The reference article recommends stable `@id` anchors, explicit page nodes, and
links between `WebSite`, `Person`, `WebPage`, `Blog`, `BlogPosting`,
`CollectionPage`, `BreadcrumbList`, and `SoftwareApplication`. This design
applies that model to bendd.me without changing visible UI.

## Goals

- Make structured data a coherent graph with stable `@id` values.
- Centralize JSON-LD generation so route files do not hand-roll schema objects.
- Keep all structured data server-rendered and deterministic.
- Add `SoftwareApplication` metadata for the homepage project
  "Synchronize Tab Scrolling".
- Preserve current routes, metadata, sitemap behavior, and visual output.

## Non-Goals

- Add site search or `SearchAction`.
- Add an About route.
- Change MDX frontmatter fields.
- Change article/craft page layout, navigation, or copy.
- Model every external contribution on the homepage as schema.org data.

## Architecture

Add a small structured-data module under `src/lib/structured-data/`.

- `ids.ts` generates stable identifiers:
  - `websiteId()` -> `https://bendd.me/#website`
  - `personId()` -> `https://bendd.me/#person`
  - `blogId()` -> `https://bendd.me/article#blog`
  - `webpageId(path)` -> `<absolute-url>#webpage`
  - `breadcrumbId(path)` -> `<absolute-url>#breadcrumb`
  - `softwareApplicationId(slug)` -> `https://bendd.me/#software-<slug>`
- `nodes.ts` contains pure builders for shared schema.org nodes.
- `graphs.ts` composes page-level `@graph` documents from those builders.
- `src/components/structured-data/json-ld-script.tsx` renders JSON-LD scripts.

Route files and `MdxLayout` should call page-level graph builders, then render
them with the shared script component. They should not call `JSON.stringify`
directly.

## Page Graphs

### Home

The home page emits a graph with:

- `WebSite`, fully described.
- `Person`, fully described.
- `ProfilePage`, linked with `isPartOf -> #website` and `mainEntity -> #person`.
- `SoftwareApplication` for Synchronize Tab Scrolling, linked with
  `creator -> #person`.

### Article Index

`/article` emits a graph with:

- slim `WebSite`.
- `Person`.
- `CollectionPage` for the visible article list.
- `Blog` as the semantic parent for article posts.
- `BreadcrumbList` for Home -> Article.
- `ItemList` as `CollectionPage.mainEntity`.

The `Blog` node uses `publisher -> #person`, `isPartOf -> #website`, and
`mainEntityOfPage -> /article#webpage`.

### Craft Index

`/craft` emits a graph with:

- slim `WebSite`.
- `Person`.
- `CollectionPage` for the craft list.
- `BreadcrumbList` for Home -> Craft.
- `ItemList` as `CollectionPage.mainEntity`.

Craft is intentionally not modeled as `Blog`; it is an experimental work list,
not the main blog taxonomy.

### Article and Craft Detail

Article and craft detail pages emit a graph with:

- slim `WebSite`.
- `Person`.
- `WebPage` for the HTML page.
- `BlogPosting` for the authored content.
- `BreadcrumbList` for Home -> section -> page.

For article posts, `BlogPosting.isPartOf` points to `#blog`. For craft posts,
`BlogPosting.isPartOf` points to the website because there is no separate craft
blog node. Both use `author -> #person`, `publisher -> #person`, and
`mainEntityOfPage -> #webpage`.

The `image` field mirrors the Open Graph image URL. If frontmatter has `image`,
the builder converts it to an absolute URL. Otherwise it uses the existing
dynamic OG route with the encoded title.

### Series Page

`/article/series/[id]` emits a graph with:

- slim `WebSite`.
- `Person`.
- `CollectionPage` for the series.
- `BreadcrumbList` for Home -> Article -> Series.
- `ItemList` with article entries ordered by `seriesOrder`.

Series pages remain collection pages, not separate blogs.

## Field Mapping

`WebSite` includes `@id`, `url`, `name`, `alternateName`, `description`,
`inLanguage`, and `publisher`.

`Person` includes `@id`, `url`, `name`, `alternateName`, `jobTitle`,
`description`, `sameAs`, and `knowsLanguage`.

`ProfilePage`, `CollectionPage`, and `WebPage` include `@id`, `url`, `name`,
`description` where available, `inLanguage`, `isPartOf`, and `breadcrumb` when
the page has breadcrumbs.

`BlogPosting` includes `@id`, `url`, `headline`, `description`,
`datePublished`, `dateModified`, `inLanguage`, `author`, `publisher`,
`mainEntityOfPage`, `isPartOf`, and `image`.

`SoftwareApplication` includes `@id`, `url`, `name`, `description`,
`applicationCategory`, `operatingSystem`, `creator`, `sameAs`, and a free
`Offer` with `price: 0` and `priceCurrency: "USD"`.

## Error Handling

Structured data generation should fail during build if required inputs are
invalid. Inputs come from `siteMetadata`, series config, hard-coded homepage
project data, and MDX frontmatter already validated by Zod.

URL building belongs in the structured-data helpers. Callers pass route paths or
content records, not preassembled schema IDs.

The shared JSON-LD script component escapes `<` as `\u003c` before injecting the
JSON string. This keeps the renderer safe if future content introduces strings
that contain HTML-like text.

## Testing

Add unit tests for the structured-data module.

- ID helpers return stable absolute identifiers.
- Home graph includes `WebSite`, `Person`, `ProfilePage`, and
  `SoftwareApplication` nodes linked by `@id`.
- Article detail graph includes `WebPage`, `BlogPosting`, `BreadcrumbList`,
  slim `WebSite`, and `Person` nodes.
- Article `BlogPosting` links to the article `Blog`; craft `BlogPosting` links
  to the website.
- Collection graphs produce `ItemList` entries with stable `position`, `url`,
  and `name`.
- `JsonLdScript` escapes `<` in serialized output.

Run `pnpm check-types` and the relevant Vitest tests after implementation.

## Acceptance Criteria

- No route file or `MdxLayout` calls `JSON.stringify` for JSON-LD directly.
- JSON-LD scripts for structured-data pages are produced through
  `JsonLdScript`.
- The home page includes `SoftwareApplication` metadata for Synchronize Tab
  Scrolling.
- Article detail JSON-LD has stable `@id`, `mainEntityOfPage`, `isPartOf`,
  `author`, `publisher`, and absolute image URL fields.
- The implementation passes typecheck and structured-data unit tests.
