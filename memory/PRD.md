# PRD — Presento (AI Presentation Generator)

## Original Problem Statement
"Crea una app que va a utilizar IA de Anthropic, Gemini y OpenAI, donde el usuario pueda poner manualmente el modelo y la llave de la IA. TU ROL ES CREAR LA MEJOR APP EN UX Y FUNCIONAL PARA CREAR PRESENTACIONES EN FORMATO POWER POINT, GOOGLE SLIDES Y HTML. El usuario subirá información en todos los formatos posibles y de esa información la app creará la presentación usando el poder de la IA para generar diseños, usar imágenes, etc."

## Architecture
- **Backend:** FastAPI + MongoDB (motor). All routes under `/api`.
- **Frontend:** React 19 + Tailwind + Shadcn UI, Clash Display + IBM Plex typography (Swiss/Brutalist theme).
- **Auth:** Emergent-managed Google OAuth + httpOnly cookie session (7 days).
- **LLMs:** User-provided keys for Anthropic, Gemini, OpenAI (stored only in localStorage).
- **Images:** Unsplash stock OR AI (OpenAI gpt-image-1 / Gemini Nano Banana).

## User Personas
- Knowledge workers building decks from reports, PDFs, meeting notes.
- Educators converting lecture material to slides.
- Startup founders turning URLs/docs into pitch decks.

## Core Requirements (static)
1. BYOK — user brings own API key for text LLM (Anthropic / Gemini / OpenAI).
2. Multi-format ingestion: PDF, DOCX, XLSX, CSV, TXT, MD, HTML, JSON, images, URLs.
3. Templates + custom colors (8 templates: Swiss, Obsidian, Editorial, Mono, Forest, Sunset, Ocean, Midnight).
4. Export to PPTX (downloadable) and HTML (interactive preview).
5. Per-slide regeneration with natural-language instruction.
6. Google OAuth + per-user presentation history.
7. Spanish-first UI.

## Implemented (2026-02)
- Landing page — asymmetric bento hero, marquee, 3-step workflow, showcase.
- Emergent Google Auth + AuthCallback + session cookie.
- Dashboard — presentation grid with thumbnails, delete, empty-state.
- Create flow (3 steps: Contenido → Estilo → Generar) with file/URL/text input + TemplatePicker with 8 templates + custom color pickers.
- Editor — 3-pane layout (thumbnails / canvas / inspector), edit layout/title/bullets/body/image/colors, regenerate slide with AI, add/delete slides.
- Backend endpoints: auth/session, auth/me, auth/logout, extract/files, extract/url, llm/validate, images/generate (unsplash + openai + gemini), presentations CRUD, regenerate-slide, export/pptx, export/html.
- PPTX builder (python-pptx) with themed accent bar, title/section/quote/image-right/content layouts.
- HTML export with Clash Display + IBM Plex self-contained stylesheet.
- 21 backend tests passing (auth, extract, llm/validate, CRUD, export, images).

## Prioritized Backlog

### P0 (next iteration)
- Replace deprecated `source.unsplash.com` with Pexels/Pixabay or Unsplash API (needs key).
- Google Slides export (Google OAuth scope + API).
- TTL index on `user_sessions.expires_at`.

### P1
- Split server.py into routers (auth/extract/llm/images/presentations/export).
- SSRF protection in /extract/url (block private IPs, non-http schemes).
- Upload size limit (20MB per file).
- Run PPTX build in thread pool to avoid blocking event loop.
- Rate limiting on /llm/validate, /extract/url, /images/generate.
- Streaming/progress for presentation generation (SSE).

### P2
- Drag-and-drop reorder slides in editor.
- Slide speaker notes panel.
- Shareable public links for presentations.
- Collaborative editing.
- More templates / community templates.

## Test Credentials
See `/app/memory/test_credentials.md` (Emergent Google Auth — no passwords).
