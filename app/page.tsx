"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  FileText,
  GraduationCap,
  Languages,
  LoaderCircle,
  MessageCircle,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { chunkPages, retrieveChunks, type StudyChunk, type StudyPage } from "@/lib/study";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_PAGES = 60;

type Answer = { text: string; pages: number[] };

export default function Home() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<"English" | "اردو">("English");
  const [pages, setPages] = useState<StudyPage[]>([]);
  const [chunks, setChunks] = useState<StudyChunk[]>([]);
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [answerState, setAnswerState] = useState<"idle" | "thinking" | "error">("idle");
  const [notice, setNotice] = useState("");

  async function readPdf(file: File) {
    setNotice("");
    setAnswer(null);
    if (file.type !== "application/pdf" && !file.name.toLocaleLowerCase().endsWith(".pdf")) {
      setUploadState("error");
      setNotice("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadState("error");
      setNotice("This file is over 15 MB. Choose a smaller PDF.");
      return;
    }

    setUploadState("reading");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
      const pdf = await task.promise;
      if (pdf.numPages > MAX_PAGES) {
        await task.destroy();
        throw new Error("This PDF has more than 60 pages. Choose a shorter document.");
      }

      const extracted: StudyPage[] = [];
      let totalCharacters = 0;
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ");
        totalCharacters += text.length;
        if (totalCharacters > 240_000) {
          await task.destroy();
          throw new Error("This PDF contains too much text for one study session. Try a shorter document.");
        }
        if (text.trim()) extracted.push({ page: number, text });
      }
      await task.destroy();

      const nextChunks = chunkPages(extracted);
      if (nextChunks.length === 0) {
        throw new Error("No selectable text was found. Scanned PDFs need text recognition, which is coming later.");
      }
      setPages(extracted);
      setChunks(nextChunks);
      setFileName(file.name);
      setUploadState("ready");
    } catch (error) {
      setPages([]);
      setChunks([]);
      setFileName("");
      setUploadState("error");
      setNotice(error instanceof Error ? error.message : "We couldn't read this PDF. Try another file.");
    }
  }

  async function ask(questionText = question) {
    const cleanQuestion = questionText.trim();
    if (!cleanQuestion || chunks.length === 0 || answerState === "thinking") return;
    setNotice("");
    setAnswer(null);
    const matches = retrieveChunks(cleanQuestion, chunks);
    if (matches.length === 0) {
      setAnswerState("error");
      setNotice("I couldn't find matching terms in this document. Try rephrasing your question.");
      return;
    }

    setAnswerState("thinking");
    setQuestion("");
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, language, chunks: matches }),
      });
      const result = await response.json() as {
        answer?: string;
        citations?: string[];
        error?: string;
      };
      if (!response.ok || !result.answer) throw new Error(result.error || "The answer could not be generated.");
      const pagesById = new Map(matches.map((chunk) => [chunk.id, chunk.page]));
      const citedPages = [...new Set((result.citations ?? [])
        .map((id) => pagesById.get(id))
        .filter((page): page is number => page !== undefined))];
      setAnswer({ text: result.answer, pages: citedPages });
      setAnswerState("idle");
    } catch (error) {
      setAnswerState("error");
      setNotice(error instanceof Error ? error.message : "The AI service is unavailable. Please try again.");
    }
  }

  const excerpt = pages.slice(0, 3).map((page) => page.text).join(" ");

  return (
    <main className="min-h-screen bg-[#071a1b] text-[#eaf4ee]">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#071a1b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d6f66a] text-[#082326]"><GraduationCap size={22}/></div>
            <div><p className="text-lg font-bold">TaleemAI</p><p className="text-xs text-[#94aaa5]">Learn deeply. In your language.</p></div>
          </div>
          <button onClick={() => setLanguage(language === "English" ? "اردو" : "English")} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"><Languages size={16}/>{language}</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[235px_minmax(0,1fr)_270px]">
        <aside className="rounded-2xl border border-white/10 bg-[#0c2929] p-4">
          <button onClick={() => fileInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#d6f66a] px-3 py-3 font-semibold text-[#092124]"><Plus size={17}/> Add a document</button>
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readPdf(file); event.currentTarget.value = ""; }}/>
          <p className="mt-7 px-2 text-xs font-semibold uppercase tracking-[.16em] text-[#8da29d]">Study space</p>
          {fileName ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm"><FileText size={17} className="shrink-0 text-[#d6f66a]"/><span className="min-w-0 truncate font-semibold">{fileName}</span></div>
          ) : (
            <p className="mt-3 rounded-xl px-3 py-3 text-sm text-[#91a7a1]">Your document will appear here.</p>
          )}
          <div className="mt-8 rounded-xl border border-[#d6f66a]/20 bg-[#d6f66a]/[.07] p-4"><Sparkles className="mb-2 text-[#d6f66a]" size={20}/><p className="text-sm font-semibold">Private by default</p><p className="mt-1 text-xs leading-5 text-[#a8b9b5]">PDF text is read in your browser. It is sent to the AI only when you ask a question.</p></div>
        </aside>

        <section className="min-w-0">
          <div className="mb-5"><p className="text-sm text-[#9db1ac]">Your study space</p><h1 className="mt-1 break-words text-3xl font-bold sm:text-4xl">{fileName || "Study from your notes"}</h1></div>
          <div className="rounded-2xl border border-white/10 bg-[#f6f3e9] p-5 text-[#173234] sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#d6f66a] px-3 py-1 text-xs font-bold">DOCUMENT EXCERPT</span>{pages.length > 0 && <span className="text-sm text-[#54706e]">{pages.length} text pages · {chunks.length} passages</span>}</div>
            <h2 className="mt-5 text-2xl font-bold">{fileName ? "Your notes are ready" : "Start with a class PDF"}</h2>
            <p className="mt-3 leading-7 text-[#45605e]">{excerpt ? excerpt.slice(0, 750) + (excerpt.length > 750 ? "…" : "") : "Choose a text-based PDF up to 15 MB and 60 pages. TaleemAI will extract its text on this device and find relevant passages for your questions."}</p>
            <button onClick={() => fileInput.current?.click()} disabled={uploadState === "reading"} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0c2929] px-4 py-3 font-semibold text-white disabled:opacity-60">
              {uploadState === "reading" ? <LoaderCircle className="animate-spin" size={18}/> : <Upload size={18}/>}
              {uploadState === "reading" ? "Reading your PDF…" : fileName ? "Choose another PDF" : "Choose PDF"}
            </button>
            {notice && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">{notice}</p>}
            {uploadState === "ready" && <p className="mt-3 text-sm text-[#54706e]">Ready to answer from the text in this PDF.</p>}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0c2929]">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4 font-semibold text-[#d6f66a]"><MessageCircle size={17}/> Ask about your document</div>
            <div className="p-5 sm:p-6">
              {answer ? (
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="whitespace-pre-wrap text-[15px] leading-7">{answer.text}</p>
                  {answer.pages.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{answer.pages.map((page) => <span key={page} className="rounded-lg bg-[#d6f66a]/10 px-3 py-1.5 text-sm text-[#d6f66a]">Page {page}</span>)}</div>}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#a6b7b3]">{chunks.length ? "Ask a question. Answers will use passages from your PDF and show the page references." : "Add a PDF to begin asking questions."}</p>
              )}
              <div className="mt-5 flex gap-2">
                <input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void ask(); }} disabled={!chunks.length || answerState === "thinking"} className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#071a1b] px-4 py-3 text-sm outline-none focus:border-[#d6f66a] disabled:opacity-50" placeholder={language === "اردو" ? "اپنے نوٹس کے بارے میں سوال پوچھیں…" : "Ask about your notes…"} aria-label="Question about your document"/>
                <button onClick={() => void ask()} disabled={!chunks.length || !question.trim() || answerState === "thinking"} className="inline-flex items-center gap-2 rounded-xl bg-[#d6f66a] px-4 font-bold text-[#082326] disabled:cursor-not-allowed disabled:opacity-50">
                  {answerState === "thinking" ? <LoaderCircle className="animate-spin" size={17}/> : <BookOpen size={17}/>}<span className="hidden sm:inline">{answerState === "thinking" ? "Thinking…" : "Ask"}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-[#0c2929] p-5">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#8da29d]">Document details</p>
          <h2 className="mt-2 break-words font-bold">{fileName || "No document selected"}</h2>
          <div className="mt-5 rounded-xl border border-dashed border-[#d6f66a]/40 bg-[#d6f66a]/[.04] p-4">
            <FileText size={22} className="text-[#d6f66a]"/>
            <p className="mt-3 text-sm font-semibold">{pages.length ? pages.length + " pages read" : "PDF text stays in this session"}</p>
            <p className="mt-1 text-sm leading-5 text-[#9dafaa]">{chunks.length ? chunks.length + " searchable passages" : "Refresh the page to clear the document."}</p>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[.16em] text-[#8da29d]">Next study tools</p>
          <div className="mt-3 rounded-xl bg-white/5 p-4"><p className="font-semibold">Quiz & flashcards</p><p className="mt-1 text-sm leading-5 text-[#a2b4b0]">Being built for a later step of the project.</p></div>
        </aside>
      </div>
    </main>
  );
}
