// ============================================================
// conlang-dev / types/index.ts
// ============================================================

// ---------- Language ----------

export interface Language {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  relatedLanguages?: Record<string, string>;
  phonemes?: string[];
  tags?: string[];
  date: number;
}

// ---------- Word ----------

export interface Word {
  id: string;
  name: string;
  languageId: string;
  rootId?: string;
  protoFormId?: string;
  pronunciations?: string[];
  meanIds: string[];
  tags?: string[];
  date: number;
}

// ---------- Mean ----------

export interface Mean {
  id: string;
  wordId: string;
  translate: string;
  class: string;
  description?: string;
  conjugatedForms?: Record<string, string>;
  relatedTerms?: Record<string, string>;
  examples?: Example[];
  date: number;
}

export interface Example {
  original: string;
  translation: string;
  tokens?: string[];
}

// ---------- WordClass（品詞定義） ----------

export interface WordClass {
  id: string;
  languageId: string;
  name: string;
  description?: string;
  /** 親言語の WordClass.id（継承元） */
  inheritedFrom?: string;
  /** 継承元から削除された場合 true */
  deleted?: boolean;
  date: number;
}

// ---------- GrammarArticle（文法Wiki記事） ----------

export interface GrammarArticle {
  id: string;
  languageId: string;
  title: string;
  /** Markdown + [[記事タイトル]] ハイパーリンク記法 */
  body: string;
  /** 大カテゴリー（例："音韻論" "形態論" "統語論"） */
  category: string;
  tags: string[];
  date: number;
  updatedAt: number;
}

// ---------- PhonologicalRule（将来用） ----------

export interface PhonologicalRule {
  id: string;
  languageId: string;
  name: string;
  from: string;
  to: string;
  environment?: string;
  order: number;
  date: number;
}

// ---------- Glyph（将来用） ----------

export interface Glyph {
  id: string;
  languageId: string;
  unicode?: string;
  svgPath?: string;
  phonemes: string[];
  romanization: string;
}

// ---------- AppDB ----------

export interface AppDB {
  languages: Language[];
  words: Word[];
  means: Mean[];
  wordClasses: WordClass[];
  grammarArticles: GrammarArticle[];
  phonologicalRules: PhonologicalRule[];
  glyphs: Glyph[];
}

// ---------- 系統ツリーノード ----------

export interface LangTreeNode {
  language: Language;
  children: LangTreeNode[];
  depth: number;
}
