// ============================================================
// conlang-dev / components/GrammarEditor.tsx
// ============================================================

import { useState } from "react";
import type { GrammarArticle, AppDB } from "../types";
import { MarkdownBody } from "./GrammarViewer";

interface Props {
  article: GrammarArticle;
  db: AppDB;
  onSave: (patch: Partial<Omit<GrammarArticle, "id" | "languageId" | "date">>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onNavigate: (articleId: string) => void;
}

export function GrammarEditor({ article, db, onSave, onCancel, onDelete, onNavigate }: Props) {
  const [title, setTitle] = useState(article.title);
  const [body, setBody] = useState(article.body);
  const [category, setCategory] = useState(article.category);
  const [tags, setTags] = useState<string[]>(article.tags);
  const [tagInput, setTagInput] = useState("");
  const [preview, setPreview] = useState(false);
  const [linkTarget, setLinkTarget] = useState("");

  const existingCategories = [...new Set(
    db.grammarArticles.filter((a) => a.languageId === article.languageId && a.category).map((a) => a.category)
  )];
  const existingTags = [...new Set(
    db.grammarArticles.filter((a) => a.languageId === article.languageId).flatMap((a) => a.tags)
  )].filter((t) => !tags.includes(t));

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    setTags((p) => [...p, t]);
    setTagInput("");
  }
  function removeTag(tag: string) { setTags((p) => p.filter((t) => t !== tag)); }
  function handleSave() { if (!title.trim()) return; onSave({ title: title.trim(), body, category: category.trim(), tags }); }

  function insertLink() {
    if (!linkTarget.trim()) return;
    setBody((b) => b + `[[${linkTarget.trim()}]]`);
    setLinkTarget("");
  }

  // プレビュー用の仮記事（保存前の内容を表示）
  const previewArticle: GrammarArticle = { ...article, title, body, category, tags };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ヘッダー */}
      <div style={{
        padding: "var(--gap-sm) var(--gap-lg)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "var(--gap-sm)", flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
          {article.id ? "記事を編集" : "新しい記事"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "var(--gap-sm)" }}>
          <button className={preview ? "btn-primary" : "btn-ghost"} style={{ fontSize: "var(--text-xs)" }} onClick={() => setPreview((v) => !v)}>
            {preview ? "✦ プレビュー" : "プレビュー"}
          </button>
          <button className="btn-primary" style={{ fontSize: "var(--text-xs)" }} onClick={handleSave}>保存</button>
          <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={onCancel}>キャンセル</button>
          {article.id && <button className="btn-danger" style={{ fontSize: "var(--text-xs)" }} onClick={onDelete}>削除</button>}
        </div>
      </div>

      {preview ? (
        /* プレビューモード：GrammarViewerと同じMarkdown表示 */
        <div className="scrollable" style={{ padding: "var(--gap-lg)" }}>
          <div style={{ marginBottom: "var(--gap-md)" }}>
            {category && <span className="badge" style={{ marginRight: "var(--gap-xs)" }}>{category}</span>}
            {tags.map((t) => <span key={t} className="badge" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", marginRight: "4px" }}>{t}</span>)}
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, marginBottom: "var(--gap-lg)" }}>{title || "（タイトルなし）"}</h2>
          <MarkdownBody body={body} db={db} languageId={article.languageId} onNavigate={onNavigate} />
        </div>
      ) : (
        /* 編集モード */
        <div className="scrollable" style={{ padding: "var(--gap-lg)" }}>
          <div className="form-group">
            <label>タイトル *</label>
            <input autoFocus={!article.id} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例：名詞の格変化" style={{ fontSize: "var(--text-lg)", fontWeight: 600 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-md)" }}>
            <div className="form-group">
              <label>カテゴリー</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                placeholder="例：音韻論、形態論" list="cat-list" />
              <datalist id="cat-list">{existingCategories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="form-group">
              <label>タグ</label>
              <div style={{ display: "flex", gap: "var(--gap-xs)" }}>
                <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  placeholder="タグを追加…" list="tag-list"
                  onKeyDown={(e) => e.key === "Enter" && addTag(tagInput)} />
                <datalist id="tag-list">{existingTags.map((t) => <option key={t} value={t} />)}</datalist>
                <button className="btn-ghost" onClick={() => addTag(tagInput)} style={{ flexShrink: 0 }}>＋</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                {tags.map((tag) => (
                  <span key={tag} className="badge" style={{ cursor: "pointer" }} onClick={() => removeTag(tag)}>{tag} ✕</span>
                ))}
              </div>
            </div>
          </div>

          <hr className="divider" />

          <div className="form-group">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--gap-xs)" }}>
              <label>本文（Markdown）</label>
              <div style={{ display: "flex", gap: "var(--gap-xs)", alignItems: "center" }}>
                <input value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}
                  placeholder="記事タイトル" list="article-list"
                  style={{ width: "140px", fontSize: "var(--text-xs)" }}
                  onKeyDown={(e) => e.key === "Enter" && insertLink()} />
                <datalist id="article-list">
                  {db.grammarArticles.filter((a) => a.languageId === article.languageId).map((a) => <option key={a.id} value={a.title} />)}
                </datalist>
                <button className="btn-ghost" style={{ fontSize: "var(--text-xs)" }} onClick={insertLink}>[[リンク]]</button>
              </div>
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              style={{ minHeight: "360px", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: 1.7, resize: "vertical" }}
              placeholder={"# 見出し1\n## 見出し2\n\n本文。**太字** `コード`\n\n- リスト\n- [[他の記事へのリンク]]"} />
          </div>

          <div style={{ padding: "var(--gap-sm) var(--gap-md)", background: "var(--bg-card)", borderRadius: "var(--radius-sm)", fontSize: "var(--text-xs)", color: "var(--text-muted)", display: "flex", gap: "var(--gap-lg)", flexWrap: "wrap" }}>
            <span># 見出し1 &nbsp; ## 見出し2 &nbsp; ### 見出し3</span>
            <span>**太字**</span>
            <span>`コード`</span>
            <span>- または 1. リスト</span>
            <span>[[記事名]] でリンク</span>
            <span>``` コードブロック ```</span>
          </div>
        </div>
      )}
    </div>
  );
}
