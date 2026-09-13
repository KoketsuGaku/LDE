// ============================================================
// conlang-dev / store/db.ts
// ============================================================

import type {
  AppDB, Language, Word, Mean,
  WordClass, GrammarArticle,
  PhonologicalRule, Glyph, LangTreeNode,
} from "../types";

// ---------- ULID ----------
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = ENCODING.length;
function encodeTime(ms: number, len: number): string {
  let str = "";
  for (let i = len - 1; i >= 0; i--) { str = ENCODING[ms % ENCODING_LEN] + str; ms = Math.floor(ms / ENCODING_LEN); }
  return str;
}
function encodeRandom(len: number): string {
  let str = "";
  for (let i = 0; i < len; i++) str += ENCODING[Math.floor(Math.random() * ENCODING_LEN)];
  return str;
}
export function ulid(): string { return encodeTime(Date.now(), 10) + encodeRandom(16); }

// ---------- ストレージ ----------
const STORAGE_KEY = "conlang_dev_db";
const INITIAL_DB: AppDB = {
  languages: [], words: [], means: [],
  wordClasses: [], grammarArticles: [],
  phonologicalRules: [], glyphs: [],
};

export function loadDB(): AppDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(INITIAL_DB);
    return { ...INITIAL_DB, ...(JSON.parse(raw) as Partial<AppDB>) };
  } catch { return structuredClone(INITIAL_DB); }
}
export function saveDB(db: AppDB): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
export function exportDB(db: AppDB): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `conlang_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(url);
}
export function importDB(file: File): Promise<AppDB> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => { try { resolve({ ...INITIAL_DB, ...(JSON.parse(e.target?.result as string) as Partial<AppDB>) }); } catch { reject(new Error("Invalid JSON")); } };
    r.onerror = () => reject(new Error("File read error"));
    r.readAsText(file);
  });
}

// ---------- Language CRUD ----------
export function createLanguage(db: AppDB, data: Omit<Language, "id" | "date">): { db: AppDB; language: Language } {
  const language: Language = { ...data, id: ulid(), date: Date.now() };
  return { db: { ...db, languages: [...db.languages, language] }, language };
}
export function updateLanguage(db: AppDB, id: string, patch: Partial<Omit<Language, "id" | "date">>): AppDB {
  return { ...db, languages: db.languages.map((l) => l.id === id ? { ...l, ...patch } : l) };
}
export function deleteLanguage(db: AppDB, id: string): AppDB {
  const wordIds = db.words.filter((w) => w.languageId === id).map((w) => w.id);
  return {
    ...db,
    languages: db.languages.filter((l) => l.id !== id),
    words: db.words.filter((w) => w.languageId !== id),
    means: db.means.filter((m) => !wordIds.includes(m.wordId)),
    wordClasses: db.wordClasses.filter((c) => c.languageId !== id),
    grammarArticles: db.grammarArticles.filter((a) => a.languageId !== id),
  };
}

// ---------- Word CRUD ----------
export function createWord(db: AppDB, data: Omit<Word, "id" | "date" | "meanIds">): { db: AppDB; word: Word } {
  const word: Word = { ...data, id: ulid(), meanIds: [], date: Date.now() };
  return { db: { ...db, words: [...db.words, word] }, word };
}
export function updateWord(db: AppDB, id: string, patch: Partial<Omit<Word, "id" | "date">>): AppDB {
  return { ...db, words: db.words.map((w) => w.id === id ? { ...w, ...patch } : w) };
}
export function deleteWord(db: AppDB, id: string): AppDB {
  return { ...db, words: db.words.filter((w) => w.id !== id), means: db.means.filter((m) => m.wordId !== id) };
}

// ---------- Mean CRUD ----------
export function createMean(db: AppDB, wordId: string, data: Omit<Mean, "id" | "wordId" | "date">): { db: AppDB; mean: Mean } {
  const mean: Mean = { ...data, id: ulid(), wordId, date: Date.now() };
  return {
    db: {
      ...db, means: [...db.means, mean],
      words: db.words.map((w) => w.id === wordId ? { ...w, meanIds: [...w.meanIds, mean.id] } : w),
    }, mean,
  };
}
export function updateMean(db: AppDB, id: string, patch: Partial<Omit<Mean, "id" | "wordId" | "date">>): AppDB {
  return { ...db, means: db.means.map((m) => m.id === id ? { ...m, ...patch, date: Date.now() } : m) };
}
export function deleteMean(db: AppDB, id: string): AppDB {
  const mean = db.means.find((m) => m.id === id);
  if (!mean) return db;
  return {
    ...db,
    means: db.means.filter((m) => m.id !== id),
    words: db.words.map((w) => w.id === mean.wordId ? { ...w, meanIds: w.meanIds.filter((mid) => mid !== id) } : w),
  };
}

// ---------- WordClass CRUD ----------
export function createWordClass(db: AppDB, data: Omit<WordClass, "id" | "date">): { db: AppDB; wc: WordClass } {
  const wc: WordClass = { ...data, id: ulid(), date: Date.now() };
  return { db: { ...db, wordClasses: [...db.wordClasses, wc] }, wc };
}
export function updateWordClass(db: AppDB, id: string, patch: Partial<Omit<WordClass, "id" | "date">>): AppDB {
  return { ...db, wordClasses: db.wordClasses.map((c) => c.id === id ? { ...c, ...patch } : c) };
}
export function deleteWordClass(db: AppDB, id: string): AppDB {
  return { ...db, wordClasses: db.wordClasses.filter((c) => c.id !== id) };
}

/**
 * 指定言語の有効な品詞リストを返す。
 * 親言語の品詞を継承し、deleted=true のものは除外する。
 * 自言語で追加されたものはそのまま追加。
 */
export function getEffectiveWordClasses(db: AppDB, languageId: string): WordClass[] {
  const lang = db.languages.find((l) => l.id === languageId);
  const own = db.wordClasses.filter((c) => c.languageId === languageId);

  if (!lang?.parentId) return own.filter((c) => !c.deleted);

  // 親言語の品詞を再帰的に取得
  const parentClasses = getEffectiveWordClasses(db, lang.parentId);

  // 自言語で「削除」または「上書き」されているものを除外
  const overriddenIds = new Set(own.map((c) => c.inheritedFrom).filter(Boolean) as string[]);
  const inherited = parentClasses.filter((c) => !overriddenIds.has(c.id) && !own.find((o) => o.inheritedFrom === c.id && o.deleted));

  // 自言語追加分（継承でないもの・deletedでないもの）
  const added = own.filter((c) => !c.inheritedFrom && !c.deleted);

  return [...inherited, ...added];
}

/**
 * 親言語の品詞を子言語にコピー（継承エントリを作成）
 */
export function inheritWordClasses(db: AppDB, childLangId: string, parentLangId: string): AppDB {
  const parentClasses = getEffectiveWordClasses(db, parentLangId);
  const existing = db.wordClasses.filter((c) => c.languageId === childLangId);
  const existingInheritedIds = new Set(existing.map((c) => c.inheritedFrom).filter(Boolean));

  const toAdd: WordClass[] = parentClasses
    .filter((pc) => !existingInheritedIds.has(pc.id))
    .map((pc) => ({
      id: ulid(),
      languageId: childLangId,
      name: pc.name,
      description: pc.description,
      inheritedFrom: pc.id,
      date: Date.now(),
    }));

  return { ...db, wordClasses: [...db.wordClasses, ...toAdd] };
}

// ---------- GrammarArticle CRUD ----------
export function createGrammarArticle(db: AppDB, data: Omit<GrammarArticle, "id" | "date" | "updatedAt">): { db: AppDB; article: GrammarArticle } {
  const now = Date.now();
  const article: GrammarArticle = { ...data, id: ulid(), date: now, updatedAt: now };
  return { db: { ...db, grammarArticles: [...db.grammarArticles, article] }, article };
}
export function updateGrammarArticle(db: AppDB, id: string, patch: Partial<Omit<GrammarArticle, "id" | "languageId" | "date">>): AppDB {
  return {
    ...db,
    grammarArticles: db.grammarArticles.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a
    ),
  };
}
export function deleteGrammarArticle(db: AppDB, id: string): AppDB {
  return { ...db, grammarArticles: db.grammarArticles.filter((a) => a.id !== id) };
}

// ---------- 検索 ----------
export function searchWords(db: AppDB, languageId: string, query: string): Word[] {
  const q = query.trim().toLowerCase();
  if (!q) return db.words.filter((w) => w.languageId === languageId);
  const wordMatches = db.words.filter((w) => w.languageId === languageId && w.name.toLowerCase().includes(q));
  const meanMatchIds = new Set(
    db.means.filter((m) => m.translate.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)).map((m) => m.wordId)
  );
  const seen = new Set(wordMatches.map((w) => w.id));
  return [...wordMatches, ...db.words.filter((w) => w.languageId === languageId && meanMatchIds.has(w.id) && !seen.has(w.id))];
}

export function searchGrammarArticles(db: AppDB, languageId: string, query: string, category?: string, tag?: string): GrammarArticle[] {
  let articles = db.grammarArticles.filter((a) => a.languageId === languageId);
  if (category) articles = articles.filter((a) => a.category === category);
  if (tag) articles = articles.filter((a) => a.tags.includes(tag));
  if (!query.trim()) return articles;
  const q = query.toLowerCase();
  return articles.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.tags.some((t) => t.toLowerCase().includes(q)));
}

// ---------- ユーティリティ ----------
export function getMeansForWord(db: AppDB, wordId: string): Mean[] {
  return db.means.filter((m) => m.wordId === wordId);
}
export function getWordsForLanguage(db: AppDB, languageId: string): Word[] {
  return db.words.filter((w) => w.languageId === languageId);
}

// ---------- 系統ツリー ----------
export function buildLangTree(languages: Language[]): LangTreeNode[] {
  const map = new Map(languages.map((l) => [l.id, l]));
  function buildNode(lang: Language, depth: number, visited: Set<string>): LangTreeNode {
    if (visited.has(lang.id)) return { language: lang, children: [], depth };
    visited.add(lang.id);
    const children = languages.filter((l) => l.parentId === lang.id).map((l) => buildNode(l, depth + 1, new Set(visited)));
    return { language: lang, children, depth };
  }
  return languages.filter((l) => !l.parentId || !map.has(l.parentId)).map((l) => buildNode(l, 0, new Set()));
}
export function flattenLangTree(nodes: LangTreeNode[]): LangTreeNode[] {
  const result: LangTreeNode[] = [];
  function walk(list: LangTreeNode[]) { for (const n of list) { result.push(n); walk(n.children); } }
  walk(nodes); return result;
}
export function getAncestors(languages: Language[], id: string): Language[] {
  const map = new Map(languages.map((l) => [l.id, l]));
  const result: Language[] = [];
  let cur = map.get(id);
  const visited = new Set<string>();
  while (cur?.parentId && !visited.has(cur.id)) {
    visited.add(cur.id);
    const p = map.get(cur.parentId);
    if (p) result.push(p);
    cur = p;
  }
  return result;
}

// ---------- 将来用スタブ ----------
export function createPhonologicalRule(db: AppDB, data: Omit<PhonologicalRule, "id" | "date">): { db: AppDB; rule: PhonologicalRule } {
  const rule: PhonologicalRule = { ...data, id: ulid(), date: Date.now() };
  return { db: { ...db, phonologicalRules: [...db.phonologicalRules, rule] }, rule };
}
export function createGlyph(db: AppDB, data: Omit<Glyph, "id">): { db: AppDB; glyph: Glyph } {
  const glyph: Glyph = { ...data, id: ulid() };
  return { db: { ...db, glyphs: [...db.glyphs, glyph] }, glyph };
}
