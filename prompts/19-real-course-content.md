# 19 · Real course content: lessons and quizzes adapted from open sources

Status: approved

## Goal
The six sample courses get real lesson notes and one **15-question quiz per chapter** (19 quizzes, 285 questions), adapted from openly licensed official docs and guides. The quizzes use the existing quiz system, exactly as Pharmacy Exam Prep does. Every lesson lists and links its sources.

A repeatable local pipeline replaces the templated placeholder body in `seed.sql`:
1. source registry;
2. fetch at pinned commits, with a licence check;
3. Gemini drafts;
4. an AI check against the sources;
5. human review of everything;
6. seed.

Every question has an explanation, so viva practice works on every course.

## Context
- **Today** (checked in the live database, 3 Nov 2026):
  - The 58 lessons in 19 chapters share one templated markdown body.
  - The six courses have **no quizzes**; only Pharmacy Exam Prep has them.
- **Tutors:** there are four. Three are invented (Maya Okafor, Leo Martins, Aisha Rahman, with bios claiming things such as having taught "over 20,000 developers"). The fourth is "Syllo Pharmacy Team" (`md5('tutor:syllo-pharmacy')`, from `scripts/build-exam-prep-seed.mjs`).
- **No quiz code changes are needed:**
  - the course outline (`src/screens/course/chapter-section.tsx`) already lists each chapter's quizzes after its lessons;
  - the start, player, results and review screens are course-neutral;
  - `private.can_use_quiz` applies the free/premium rules.
- **Syllo is commercial** (Pro subscription), so **no NonCommercial (NC) or NoDerivatives (ND) source may be used**.
- **How sources were checked (3 Nov 2026, by the user):** each repo was cloned and its licence file read at the commit listed. The fetch script re-verifies every pin, path and licence fragment and stops on any mismatch.
  - Tags `v3.15.2` and `v3.1.0`, the `version-0.88` docs, and the dated licence claims couldn't be independently confirmed when planning. A wrong pin fails loudly; the fix is then to re-pin in the registry.
- **Licence evidence:**
  - OpenStax now publishes every textbook as CC BY-NC-SA 4.0, and commercial use needs permission: https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks
  - The OpenStax Python book's licence change, commit `51334a9` (24 Mar 2026, "updating license to CC BY NC-SA"): https://github.com/openstax/osbooks-introduction-python-programming
  - CC licences are irrevocable: copies released under CC BY stay usable under CC BY. https://creativecommons.org/faq/ and https://creativecommons.org/?p=10296
  - CC BY requires indicating that changes were made: https://creativecommons.org/course/cc-cert-edu/unit-4-using-cc-licenses-and-cc-licensed-works/4-2-things-to-consider-after-cc-licensing/
  - GOV.UK documentation is © Crown copyright under OGL v3.0, and the code is MIT: https://github.com/alphagov/govuk-frontend (README, "Licence")
  - OGL v3.0 requires the attribution statement "Contains public sector information licensed under the Open Government Licence v3.0."
  - TfL open data terms (based on OGL v2.0, with TfL amendments): https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service
- This isn't legal advice. Where a decision depends on a licence reading, the cautious option is the default.

## Decisions
### This session (user)
- **Scope:** a **pilot of React Native Basics** (lessons and quizzes, checked on the phone, prompt tuned), then the other five courses.
- **15 questions per chapter.** The start screen offers "Quick practice (10)" only when a quiz has more than 10 (`LENGTHS.filter(o => o.count < quiz.questionCount)` in `quiz-start-screen.tsx`), and retakes then draw a different 10.
- **The user reviews every lesson and question.** The build refuses unreviewed items; `--allow-draft` is for local previews only.
- **One "Syllo Team" tutor for all seven courses:**
  - the existing Syllo Pharmacy Team tutor is renamed Syllo Team, with a factual headline and bio (no claims) and the brand mark as its photo;
  - the six courses move to it;
  - Maya, Leo and Aisha are deleted (their follows cascade);
  - `build-exam-prep-seed.mjs` is updated so a re-run keeps the new name.
- **Credits:** a `lesson_sources` table, a Sources section on each lesson, and a `/credits` screen.
- **The dev account Jane Doe** (`user_3LPjnOxWpKlgGGXl1aBHSLj1llj`) is linked to Syllo Team. It's a data change, not seeded. **Known risk:** that account can delete any of the seven courses from the app (cascading quizzes and attempts).
- **pandas project:** one real week of TfL cycle hire journeys, trimmed to under 5 MB, with no bike id column and the TfL credit.

### Licence rules
- **Allowed:** CC0 / public domain, CC BY (3.0 or 4.0), OGL v3.0, MIT, BSD-3-Clause, PSF License v2. All allow commercial use and adaptation with attribution, and they can be combined in one lesson.
- **Reference only, never adapted:** CC BY-SA sources (MDN), as a link (`reference_url` or a "Further reading" source) only.
- **Excluded:** anything NC or ND, anything with no licence, and live websites (text comes only from the pinned repo files).
- **Never copy:** logos and crests (GOV.UK crown, NHS logo, OpenStax logo), the GDS Transport and NHS Frutiger typefaces, the OpenStax Python Code Runner (All Rights Reserved, Wiley), and third-party images inside docs. v1 lessons are text and code only.
- **OGL sources** (GOV.UK, NHS) carry the OGL attribution statement on their credit line and on `/credits`.
- **MIT, BSD-3 and PSF sources** have their full licence text on `/credits`.

### Approved sources (pinned)
| Id | Source | Repo | Pin | Licence (file checked) | Used for |
|---|---|---|---|---|---|
| `rn-docs` | React Native docs (v0.88) | https://github.com/facebook/react-native-website, path `website/versioned_docs/version-0.88/` | `7e7996f2c7e60d9de2fceda60eddef5e10ae2d5c` | Docs **CC BY 4.0** (`LICENSE-docs`); code MIT | React Native Basics, Advanced Animations |
| `expo-docs` | Expo docs (guides, Expo Router) | https://github.com/expo/expo, path `docs/pages/` | `028f70e53b1f199f93b4aeb6611d45e9404b8685` | **MIT** (`docs/LICENSE`, © 650 Industries) | React Native Basics |
| `react-docs` | React docs (react.dev, Learn) | https://github.com/reactjs/react.dev, path `src/content/learn/` | `0821e7d9428a6c58c922765b891bbffba9ed6249` | **CC BY 4.0** (`LICENSE-DOCS.md`) | React Native Basics, Advanced Animations |
| `reanimated-docs` | React Native Reanimated docs | https://github.com/software-mansion/react-native-reanimated, path `docs/docs-reanimated/docs/` | `db09bb4193079ef27cc65dc0e81778f78612d6af` | **MIT** (`LICENSE`, © Software Mansion) | Advanced Animations |
| `rngh-docs` | React Native Gesture Handler docs | https://github.com/software-mansion/react-native-gesture-handler, path `packages/docs-gesture-handler/docs/` | `51cf3d30c03d6fd9c95ab1121bfd82bcdbbf46b6` | **MIT** (`LICENSE`, © Software Mansion) | Advanced Animations |
| `webdev-learn` | web.dev Learn Responsive Design and Learn Accessibility | https://github.com/GoogleChrome/web.dev, path `src/site/content/en/learn/` | `a64d870f59c25431bbedf0ef06aa635072c43a2e` (archived) | Content **CC BY 3.0**; code Apache 2.0 (`LICENSE`) | UI Design Fundamentals, Advanced Animations |
| `govuk-ds` | GOV.UK Design System | https://github.com/alphagov/govuk-design-system, path `src/` | `1403d1bc19cc023452bf77b78444defa6d4cb734` | Guidance **OGL v3.0**; code MIT (`LICENSE`) | UI Design Fundamentals, Design Systems |
| `nhs-manual` | NHS digital service manual | https://github.com/nhsuk/nhsuk-service-manual, path `app/views/` | `178a82630d9f354e7494c1b0139880d3a0d48084` | Documentation **OGL v3.0**, code MIT (`README.md` "Licence") | UI Design Fundamentals, Design Systems |
| `uswds` | U.S. Web Design System | https://github.com/uswds/uswds-site, paths `pages/`, `_components/` | `af13d80f071c3d897bee422f51954d9d7d156474` | **US public domain + CC0 1.0** (`LICENSE.md`) | UI Design Fundamentals, Design Systems |
| `python-docs` | Python tutorial and "Using Python" | https://github.com/python/cpython, paths `Doc/tutorial/`, `Doc/using/` | tag `v3.15.2` | **PSF License v2** (`Doc/license.rst`); doc code 0BSD | Python for Everyone |
| `openstax-python` | *Introduction to Python Programming* (OpenStax), **last CC BY version** | https://github.com/openstax/osbooks-introduction-python-programming (CNXML in `modules/`) | `2825b114221917bea5ae328a94e484b4da8a93ca` (parent of the NC-SA change) | **CC BY 4.0** (`LICENSE` at that commit) | Python for Everyone, pandas |
| `pandas-docs` | pandas docs | https://github.com/pandas-dev/pandas, paths `doc/source/getting_started/intro_tutorials/`, `doc/source/user_guide/` | tag `v3.1.0` | **BSD-3-Clause** (`LICENSE`) | Data Analysis with pandas |
| `turing-way` | The Turing Way | https://github.com/the-turing-way/the-turing-way, path `book/website/` | `8963c112dc90f1ea73edf41339d72cbdd2e63294` | Chapters **CC BY 4.0**, software MIT (`LICENSE.md`) | pandas ("Telling the story") |
| `tfl-cycles` | TfL Santander Cycles usage data (dataset) | https://cycling.data.tfl.gov.uk/ (open data portal only) | file name and date range recorded in the registry | **TfL Transport Data Service terms** | pandas project resource |
| `mdn` | MDN Web Docs (**links only**) | https://github.com/mdn/content | `05b21c9303964f221febe77f053e5636f230afe9` | Prose CC BY-SA 2.5, code CC0 | `reference_url` and "Further reading" only |

### Excluded sources (checked; don't use)
| Source | Why |
|---|---|
| OpenStax current editions (any book) | CC BY-NC-SA 4.0 |
| OpenStax *Principles of Data Science* | NC-SA since its licence file was added; no CC BY version |
| *Python Data Science Handbook* (VanderPlas) | Text CC BY-NC-ND 3.0 |
| *Python for Everybody* book (Severance) | CC BY-NC-SA 3.0. The CC BY Commons lecture video from prompts/15 stays. |
| The Odin Project curriculum | CC BY-NC-SA 4.0 |
| freeCodeCamp curriculum | No licence (© freeCodeCamp.org) |
| Live web.dev pages, the Santander Cycles website | Only pinned repo files / the open data portal |

### Course-to-source mapping
Paths are relative to each source's base path. The fetch script stops if a path doesn't exist at the pin. Fix the mapping rather than skipping the lesson.

**React Native Basics** (free)
- Ch1 Getting started:
  - 1 Welcome to the course ← `rn-docs:intro-react-native-components.md`.
  - 2 Setting up Expo ← `expo-docs:get-started/set-up-your-environment.mdx`, `get-started/create-a-project.mdx`.
  - 3 Running on your phone ← `expo-docs:get-started/start-developing.mdx`, `rn-docs:running-on-device.md`.
- Ch2 Components and styling:
  - 1 Views, text and images ← `view.md`, `text.md`, `images.md`.
  - 2 Styling with flexbox ← `style.md`, `flexbox.md`, `height-and-width.md`.
  - 3 Lists that scroll ← `using-a-listview.md`, `flatlist.md`.
  - 4 Handling touches ← `handling-touches.md`, `pressable.md`.
- Ch3 Navigation and data:
  - 1 Screens and routes ← `expo-docs:router/basics/core-concepts.mdx`, `notation.mdx`, `navigation-layouts.mdx`.
  - 2 Passing data between screens ← `expo-docs:router/basics/navigation.mdx`, `react-docs:passing-props-to-a-component.md`.
  - 3 Fetching from an API ← `rn-docs:network.md`.

**UI Design Fundamentals** (free)
- Ch1 Seeing like a designer:
  - 1 What makes a good interface ← `nhs-manual:design-system/design-principles.njk`, `uswds:pages/design-principles/overview.md`.
  - 2 Hierarchy and focus ← `webdev-learn:accessibility/structure`, `accessibility/focus`, `govuk-ds:get-started/focus-states`.
  - 3 Learning from great apps ← `webdev-learn:design/ui-patterns`, `design/interaction`.
- Ch2 Typography and colour:
  - 1 Choosing a typeface ← `webdev-learn:design/typography`, `govuk-ds:styles/typeface`.
  - 2 A simple type scale ← `govuk-ds:styles/type-scale`, `get-started/new-type-scale`.
  - 3 Colour with purpose ← `webdev-learn:design/theming`, `accessibility/color-contrast`, `govuk-ds:styles/colour`.
- Ch3 Layout and spacing:
  - 1 Grids without the pain ← `webdev-learn:design/macro-layouts`, `govuk-ds:styles/layout`.
  - 2 Spacing systems ← `govuk-ds:styles/spacing`, `uswds:pages/design-tokens/spacing-units.md`, `nhs-manual:design-system/styles/spacing`.
  - 3 Designing a real screen ← `govuk-ds:styles/page-template`, `webdev-learn:design/micro-layouts`.

**Python for Everyone** (free)
- Ch1 Your first program:
  - 1 Why Python? ← `python-docs:Doc/tutorial/appetite.rst`.
  - 2 Installing Python ← `Doc/using/windows.rst`, `Doc/using/mac.rst`.
  - 3 Hello, world ← `Doc/tutorial/interpreter.rst`, `introduction.rst`.
  - 4 Variables and types ← `introduction.rst`, plus `openstax-python` chapters 1–2.
- Ch2 Making decisions:
  - 1 If, elif and else ← `controlflow.rst` (`if`).
  - 2 Loops ← `controlflow.rst` (`for`, `range`, `while`, `break`/`continue`).
  - 3 Lists and dictionaries ← `datastructures.rst`, `openstax-python` chapters 9–10.
- Ch3 Functions and files:
  - 1 Writing functions ← `controlflow.rst` (defining functions), `openstax-python` chapter 6.
  - 2 Reading and writing files ← `inputoutput.rst`, `openstax-python` chapter 14.
  - 3 Project: a tiny journal ← only lessons 3.1–3.2's sources.

**Data Analysis with pandas** (premium; `pandas-docs` = `doc/source/`)
- Ch1 Loading data:
  - 1 Meet pandas ← `intro_tutorials/01_table_oriented.rst`, `user_guide/dsintro.rst`.
  - 2 Reading CSV files ← `intro_tutorials/02_read_write.rst`, `user_guide/io.rst` (CSV only).
  - 3 Exploring a DataFrame ← `intro_tutorials/03_subset_data.rst`, `user_guide/basics.rst`.
- Ch2 Cleaning and shaping:
  - 1 Missing values ← `user_guide/missing_data.rst`.
  - 2 Fixing types and dates ← `intro_tutorials/09_timeseries.rst`, `user_guide/basics.rst` (dtypes), `user_guide/timeseries.rst` (`to_datetime`).
  - 3 Reshaping data ← `intro_tutorials/07_reshape_table_layout.rst`, `user_guide/reshaping.rst`.
- Ch3 Asking questions:
  - 1 Filtering and sorting ← `intro_tutorials/03_subset_data.rst`, `user_guide/indexing.rst` (boolean), `basics.rst` (sorting).
  - 2 Grouping and aggregating ← `intro_tutorials/06_calculate_statistics.rst`, `user_guide/groupby.rst`.
  - 3 Joining datasets ← `intro_tutorials/08_combine_dataframes.rst`, `user_guide/merging.rst`.
- Ch4 Telling the story:
  - 1 Charts that explain ← `intro_tutorials/04_plotting.rst`, `user_guide/visualization.rst`, `turing-way:communication/`, `openstax-python` chapter 15.
  - 2 Project: city bike trips ← the chapters above plus `tfl-cycles`.

**Advanced Mobile Animations** (premium)
- Ch1 Motion principles:
  - 1 Why motion matters ← `rn-docs:animations.md` (intro), `webdev-learn:accessibility/motion`.
  - 2 Springs vs timing ← `reanimated-docs:animations/withSpring.mdx`, `animations/withTiming.mdx`.
  - 3 The UI thread ← `reanimated-docs:guides/worklets.mdx`, `fundamentals/glossary.mdx`.
- Ch2 Gestures:
  - 1 Pan and fling ← `rngh-docs:gestures/use-pan-gesture.mdx`, `gestures/use-fling-gesture.mdx`, `reanimated-docs:fundamentals/handling-gestures.mdx`.
  - 2 Bottom sheets from scratch ← `rngh-docs:fundamentals/gesture-animation/` (index and steps 1–5).
  - 3 Shared element transitions ← `reanimated-docs:shared-element-transitions/overview.mdx`. If experimental at the pin, retitle the lesson "Layout animations" and use `layout-animations/entering-exiting-animations.mdx`.
- Ch3 Performance:
  - 1 Measuring frame drops ← `rn-docs:performance.md`, `profiling.md`.
  - 2 Avoiding re-renders ← `react-docs:render-and-commit.md`, `you-might-not-need-an-effect.md`, `rn-docs:optimizing-flatlist-configuration.md`.
  - 3 Testing on real devices ← `rn-docs:running-on-device.md`, `reanimated-docs:guides/performance.md`.

**Design Systems in Practice** (premium)
- Ch1 Foundations:
  - 1 What a design system is ← `govuk-ds:get-started/index.md`, `uswds:pages/documentation/overview.md`.
  - 2 Design tokens ← `uswds:pages/design-tokens/overview.md`, `pages/design-tokens/color/theme-tokens.md`.
  - 3 Naming things ← `uswds:pages/design-tokens/color/system-tokens.md`, `theme-tokens.md`, `govuk-ds:community/component-lifecycle-statuses`.
- Ch2 Components:
  - 1 Buttons, the hard way ← `govuk-ds:components/button`, `uswds:_components/button/`.
  - 2 Inputs and states ← `govuk-ds:components/text-input`, `components/error-message`, `components/error-summary`, `nhs-manual:design-system/styles/focus-state`.
  - 3 Composing components ← `govuk-ds:components/fieldset`, `components/radios`, `get-started/extending-and-modifying-components`.
- Ch3 Running the system:
  - 1 Documentation people read ← `nhs-manual:content/how-we-write.njk`, `govuk-ds:community/contribution-criteria`.
  - 2 Versioning and change ← `govuk-ds:get-started/updating-your-code`, `uswds:pages/documentation/migration-V3.md`.
  - 3 Measuring adoption ← `uswds:pages/documentation/maturity-model.md`.

### Pipeline
- **Registry:** `supabase/seeds/source/course-sources.json` (committed) holds:
  - `sources`: repo, pin, basePath, licence, licenceUrl, licenceFile, the expected licence fragment, copyright, credit, attributionNote, and a pageUrl rule;
  - `lessons`: slug, chapter, position, optional title, and `sources: [{ id, path, section?, role }]`;
  - `quizzes`: `{ course, chapter, count: 15 }`;
  - `courses`: optional subtitle and description overrides.
- **Fetch** (`scripts/fetch-course-sources.mjs`, no new dependencies):
  - `git clone --filter=blob:none --no-checkout` into a git-ignored cache, then `git show <pin>:<file>`.
  - The licence fragment is checked at the pin before any file is read; a mismatch stops the run.
  - Writes `course-sources.lock.json`: path, pin and SHA-256 for every file.
- **Draft** (`scripts/draft-course-content.mjs`; Gemini REST through `fetch`, as in `supabase/functions/_shared/gemini.ts`; `GEMINI_API_KEY` / `GEMINI_MODEL` from `.env.local`, without `EXPO_PUBLIC_`):
  - **Lesson call** → `{ body, keyPoints[], sourcesUsed[] }`.
  - **Quiz call** (per chapter) → 15 questions, each with 4 options, exactly 1 correct, an `explanation` of at most 60 words, and a `sourceRef` that becomes `reference_url`.
  - **Check call** (per lesson and per quiz) → `flags[]`, which go into the review pack.
  - Output: `supabase/seeds/source/course-content.json` (committed; every item `status: "draft"`) and a review pack, `scratchpad/review/<course>.md`.
  - Flags: `--course`, `--lesson`, `--quizzes-only`, `--check-only`, `--force`. Token counts are logged, and `reviewed` items are never overwritten without `--force`.
- **Writing rules** (`scripts/course-content/prompt.md`):
  - UK English, plain English, second person, at the course's level.
  - 350–800 words per lesson.
  - Markdown limited to `##`/`###`, paragraphs, lists, **bold**, *italic*, fenced code and inline code. No links, images, tables or HTML.
  - A "Try it" exercise, and the lesson ends with `### Key points` (3–5).
  - Only facts found in the source text. Code must match React Native 0.88 / Expo SDK 58, Python 3.15, pandas 3.1, and current Reanimated and Gesture Handler.
  - Adapt and shorten; no long passages copied.
  - Quiz questions: no "all/none of the above", no trick wording, options of similar length.
- **Review gate:** the user reads the pack and sets `reviewed: "<initials> <date>"` on each item, editing in place where needed. The build refuses unreviewed items; `--allow-draft` only builds a local preview SQL.
- **Build** (`scripts/build-course-content-seed.mjs`): validates, then writes `supabase/seeds/course-content.sql` (idempotent).
  - **Checks:** supported markdown only, closed code fences, word count in range, at least one `adapted` source, known source ids, exactly 4 answers and 1 correct, exactly 15 questions per quiz, no duplicate prompts, the explanation and `reference_url` present, and `reference_url` on the source's domain or MDN.
  - **Lesson bodies:** `update lesson_contents set body = <new> || coalesce(<existing E'\n\n*Video: …*' tail>, '')`, so the credit from `seeds/lesson-videos.sql` stays last (its regular expression expects that).
  - **`lesson_sources`:** delete, then insert per lesson.
  - **Quizzes:** one per chapter. Ids are `md5('course-quiz:<slug>:<chapter>')`, `md5('course-question:<slug>:<chapter>:<n>')` and `md5('course-answer:<slug>:<chapter>:<n>:<m>')`; the `course-` prefix avoids Pharmacy's `quiz:` / `question:` / `answer:` keys. Chapter-1 quizzes are `is_preview`.
  - **Tutors:** the Syllo Team change.
  - **Courses:** the description overrides.
- **Question lifecycle:** published questions are never deleted or renumbered, because attempts reference them. Edits update in place, and a quiz's count only grows.
- **Seed order:** `config.toml` `sql_paths` becomes `seed.sql` → `seeds/course-content.sql` → `seeds/lesson-videos.sql` → … Re-runs on the hosted project go through the MCP `execute_sql`.

### Schema and app
- **`lesson_sources`:**
  - Columns: `id`, `lesson_id` (→ lessons, cascade), `position`, `title`, `author`, `url`, `licence`, `licence_url`, `attribution_note` (null, or the OGL statement), `role` (`adapted` | `further_reading`), `unique (lesson_id, position)`.
  - RLS: select for `authenticated` when the course is published; no learner writes.
- **Lesson screen:**
  - A Sources section after Resources: the title (opens in `expo-web-browser`), then "Author · Licence", the attribution note if any, and further-reading rows labelled as such.
  - Then the caption "Adapted from the sources above with AI assistance and reviewed by the Syllo team. Changes were made."
- **Markdown renderer** (`src/screens/lesson/markdown.tsx`):
  - Fenced code blocks, collected raw before the line trim so indentation survives, shown in a monospace block inside a horizontal `ScrollView` on `surface` with `rounded-card`.
  - Inline code.
  - A `mono` font token in `src/theme/` (Menlo on iOS, monospace on Android, a `ui-monospace` stack on web).
- **`/credits`** (Profile → Settings → "Content credits and licences"): every source with its copyright, licence, link and attribution note, plus the full MIT, BSD-3 and PSF texts from a generated `src/lib/content-licences.ts`.
- **Viva footnote:** "Check clinical facts in the BNF." only for Pharmacy Exam Prep. Other courses get "AI feedback is for study practice. Check facts in the linked sources." `getVivaSession` gains the course slug.
- **Durations** stay as seeded (follow-up).

## Out of scope
- Pharmacy Exam Prep lesson notes (BNF and NICE aren't openly licensed in the same way).
- Images or diagrams from the sources, and new videos.
- Recomputing durations, and retiring questions (`is_active`).
- Tutor authoring (Part 2), other languages, and automatic re-pinning.

## Steps
1. **User:**
   - Put `GEMINI_API_KEY` and `GEMINI_MODEL` in `.env.local` (no `EXPO_PUBLIC_`), with the names in `.env.example`.
   - Download one week of TfL journeys from https://cycling.data.tfl.gov.uk/ (usage stats) into the scratchpad.
2. **Registry and fetch:** write the registry and the fetch script, and git- and EAS-ignore the cache. Done when every licence check passes and every path resolves.
3. **Schema:** the `lesson_sources` migration, then `db:push`, `db:types` and the advisors.
4. **App:**
   - the renderer and the `mono` token;
   - `getLesson` embeds `lesson_sources`, and the lesson screen gets the Sources section;
   - the `/credits` screen, the Settings row and the generated licences (a stub until step 6);
   - the course-aware viva footnote;
   - `/design-system` previews.
5. **Draft:** the draft script and the prompt.
6. **Pilot, React Native Basics:**
   - Draft, then build with `--allow-draft` for a local look.
   - **User reviews**, then build the real seed, add it to `config.toml`, and apply it.
   - Check on the Samsung, then tune the prompt.
7. **The other five courses:** draft, review, build and apply each.
8. **Tutors and dataset:**
   - Syllo Team in the content seed; `build-exam-prep-seed.mjs` renamed to match; `local-images.ts` updated; Jane Doe linked (a data change).
   - Trim the TfL CSV, add it as the pandas project resource, and run `npm run upload:lesson-videos -- --only data-analysis-pandas/4`.
9. **Close out:**
   - **Result:** the words per lesson, the questions per chapter, token totals, and the prompt changes made after the pilot.
   - **`AGENTS.md`** (within 150 lines): `lesson_sources`, the seeds and their order, the commands, a "Content licensing" rule, the Syllo Team tutor, and removing the placeholder-body note.
   - **README:** a "Content and licences" section and history row 19.
   - **Store listing:** "every course has quizzes", and no tutor-follow claim.

## Verification
- `tsc`, `expo lint` and the advisors pass.
- **Fetch:** all sources pass their licence check.
- **The build fails on:** an unreviewed item, a 3-answer question, an unclosed fence, an unknown source id, and a quiz that isn't 15 questions (one test each, then reverted). Re-running the seed changes nothing.
- **Video credits:** a lesson with an R2 clip still ends with its `*Video: …*` line.
- **SQL as the test account:**
  - `lesson_sources` is readable for published courses and refuses inserts.
  - Chapter 1's quiz is playable before enrolling.
  - A premium course's other quizzes need enrolment and Pro.
  - `is_correct` is never exposed.
- **Samsung:**
  - React Native Basics 2.2: real notes, an indented scrolling code block, and Sources that open.
  - The chapter 2 quiz offers 10 / All 15, and the review shows explanations and "Open reference".
  - A viva after mistakes, with no BNF footnote.
  - `/credits`.
  - The tutor card shows Syllo Team.
- **Licence audit:**
  - every lesson has at least one `adapted` source;
  - MDN appears only as further reading;
  - no excluded domains in the registry;
  - OGL credits carry the statement.
- **Not verifiable here:** iOS, including the monospace font.

## AGENTS.md updates
- **Data model:** `lesson_sources`; the course quiz md5 prefixes; published questions are never deleted or renumbered; one Syllo Team tutor.
- **Seeds:** `course-content.sql` is generated from `course-content.json` + `course-sources.json` / `.lock.json`; the order is `seed.sql` → `course-content.sql` → `lesson-videos.sql`; the video credit stays last.
- **Commands:** `fetch-course-sources.mjs`, `draft-course-content.mjs [--course …]`, `build-course-content-seed.mjs [--allow-draft]`.
- **Rules (Content licensing):** only registry sources that pass the licence check (CC0/PD, CC BY, OGL v3, MIT, BSD-3, PSF); never NC, ND, unlicensed, scraped pages, logos or typefaces; CC BY-SA (MDN) is links only; every lesson lists its sources; everything generated is human-reviewed before seeding.
- **Flow:** Sources on lessons, `/credits` from Settings, code blocks in notes, and the course-aware viva footnote.
