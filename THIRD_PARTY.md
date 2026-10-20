# Third-party assets

The assets this project bundles, and the licences they come under.

Nothing here is a paid service and nothing needs an account. Every one of
them can be fetched from a public repository without a key.

---

## The fonts

The interface needs three scripts, and the browser's own fonts do not
cover them well. The fonts are loaded from Google Fonts in
`frontend/index.html`, and they are also listed here so that a deployment
which serves them itself knows what to fetch.

| Font | What it is | Licence | Where |
|---|---|---|---|
| Noto Sans | The interface's own typeface | SIL Open Font License 1.1 | https://fonts.google.com/noto/specimen/Noto+Sans |
| Noto Sans Devanagari | The Devanagari typeface | SIL Open Font License 1.1 | https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari |
| Noto Sans Telugu | The Telugu typeface | SIL Open Font License 1.1 | https://fonts.google.com/noto/specimen/Noto+Sans+Telugu |
| JetBrains Mono | The monospace typeface, for the passage and the numbers | SIL Open Font License 1.1 | https://fonts.google.com/specimen/JetBrains+Mono |
| Mukta | A second Devanagari face, for the headings | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Mukta |

### The SIL Open Font License 1.1

In short, and in the words of the licence itself:

- The fonts may be used, studied, modified and redistributed freely, for
  commercial and non-commercial purposes.
- They may not be sold on their own, and a derivative font may not be
  sold on its own.
- The fonts may not be distributed under any other name, and any
  derivative must keep the original name or be clearly marked as a
  derivative.
- The copyright notice and the licence must be included with the fonts.

The full text: https://openfontlicense.org/

### Serving them yourself

The interface loads the fonts from Google Fonts by default, which is
convenient and which sends the reader's address to Google. A deployment
that would rather not do that can:

1. Download the four `.woff2` files into
   `frontend/public/fonts/`.
2. Replace the `<link>` in `frontend/index.html` with a `@font-face` block
   pointing at the local files.
3. Add `font-display: swap` to each block, so the text is readable before
   the font arrives.

The licence travels with the files, so the `OFL.txt` should be copied
alongside them.

---

## The libraries

### The backend

| Library | What it is used for | Licence |
|---|---|---|
| Spring Boot, Spring Framework, Spring Security, Spring Data | The application | Apache License 2.0 |
| Flyway | The database migrations | Apache License 2.0 |
| PostgreSQL JDBC Driver | Talking to the database | BSD 2-Clause |
| JJWT | The access tokens | Apache License 2.0 |
| springdoc-openapi | The API documentation | Apache License 2.0 |
| OpenPDF | The PDF report and the certificate | LGPL 3.0 / MPL 2.0 |
| Caffeine | The cache for the exam profiles and the passages | Apache License 2.0 |
| Logstash Logback Encoder | The structured logs | Apache License 2.0 |
| JUnit 5, Mockito | The tests | Eclipse Public License 1.0 |
| Testcontainers | The integration tests | MIT |

**OpenPDF** is worth a note. It is a fork of iText, and it is distributed
under the LGPL 3.0 with an MPL 2.0 option. That licence is compatible with
using it as an unmodified library, which is how it is used here — the jar is
on the classpath and the classes are not modified. It is used to write the
PDFs, and it is not redistributed in the source tree.

### The frontend

| Library | What it is used for | Licence |
|---|---|---|
| React, React DOM | The interface | MIT |
| React Router | The routing | MIT |
| TanStack Query | The server state | MIT |
| Tailwind CSS | The styling | MIT |
| Recharts | The charts | MIT |
| clsx, tailwind-merge | The class names | MIT |
| Vite | The build | MIT |
| TypeScript | The types | Apache License 2.0 |
| Vitest, Testing Library, jsdom | The tests | MIT / Apache 2.0 |
| Playwright | The end-to-end tests | Apache License 2.0 |
| ESLint and its plugins | The lint | MIT |

---

## The images

There are none. The interface uses inline SVG for its icons, and the wordmark
is text. There is no photograph, no illustration and no stock image
anywhere in the project.

---

## The content

**Every seeded passage is original text written for this project.** Nothing
is copied from an exam paper, a news article, a book or any other
copyrighted source. The `source_note` column on every passage records this,
and `PassageSeedValidationTest` checks that the note is there.

The passages are in `scripts/data/`, and the generator that turns them into
the database migrations is in `scripts/tools/`.

---

## The Docker images

| Image | What it is | Licence |
|---|---|---|
| `postgres:16-alpine` | The database | PostgreSQL Licence |
| `eclipse-temurin:21-jre-alpine` | The backend's runtime | GPL 2.0 with the Classpath Exception |
| `nginx:alpine` | The frontend's web server | BSD 2-Clause |
| `node:22-alpine` | The frontend's build | MIT |

The `eclipse-temurin` image is GPL 2.0 with the Classpath Exception. The
Exception is what allows it to be used in a proprietary product, and the
image is used unmodified, as a runtime, in the way it is meant to be used.

The full licence texts are at:

- PostgreSQL: https://www.postgresql.org/about/licence/
- Eclipse Temurin: https://adoptium.net/en/about-us/ licenses
- Nginx: https://nginx.org/LICENSE
- Node: https://github.com/nodejs/node/blob/main/LICENSE
