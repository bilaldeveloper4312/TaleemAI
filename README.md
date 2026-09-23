# TaleemAI

An Urdu-English AI study companion that helps students understand their own notes and documents.

TaleemAI will turn a PDF or class handout into clear bilingual explanations, cited answers, flashcards, and quick quizzes—so students can study in the language that makes sense to them.

## What is working now

- Upload text-based PDFs up to 15 MB and 60 pages
- Extract PDF text in the browser and find relevant passages locally
- Ask questions in English or Urdu through a server-side AI endpoint
- Show page citations returned for the answer
- Keep PDF contents in the current browser session; refresh clears them

## Roadmap

### Phase 1 — Product foundation

- [x] Initial interface and study workspace
- [x] GitHub repository, build pipeline, and documentation
- [x] Accessible PDF upload flow and text extraction
- [x] Page-aware passage search and cited Q&A endpoint
- [ ] Persistent document library
- [ ] Responsive UI QA

### Phase 2 — Real AI learning

- [ ] PDF text extraction and chunking
- [ ] RAG-powered answers with page citations
- [ ] Urdu / English summaries and explanations
- [ ] Quiz and flashcard generation

### Phase 3 — Production quality

- [ ] User accounts and saved study spaces
- [ ] Durable document storage and database
- [ ] Automated tests, CI checks, and deployment
- [ ] Open-source contribution guide and release notes

## Tech stack

- Next.js / Vinext + TypeScript
- React + Tailwind CSS
- Cloudflare Workers, D1, and R2 (planned)
- LLM provider integration (planned)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

To enable AI answers, create a Vercel AI Gateway key and add it to a local .dev.vars file:

```text
AI_GATEWAY_API_KEY=your-key
```

The .dev.vars file stays local and is excluded from Git. PDF text only leaves the browser when you submit a question; the API receives the selected passages and question to generate an answer. This first upload flow is session-only. Durable accounts and document storage are planned for a later phase.

## Contributing

This project is in active development. Useful contributions will eventually include Urdu-language UX review, accessibility testing, document processing, and study features. Please open an issue before starting a major feature.

## Project status

Early active development — first public build: September 2026.
