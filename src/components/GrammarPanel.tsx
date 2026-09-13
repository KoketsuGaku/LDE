// ============================================================
// conlang-dev / components/GrammarPanel.tsx
// 文法Wiki：記事一覧・フィルタ・記事表示・編集の統合パネル
// ============================================================

import { useState } from "react";
import type { AppDB, GrammarArticle } from "../types";
import {
  createGrammarArticle,
  updateGrammarArticle,
  deleteGrammarArticle,
  searchGrammarArticles,
} from "../store/db";
import { GrammarViewer } from "./GrammarViewer";
import { GrammarEditor } from "./GrammarEditor";
import { WordClassSettings } from "./WordClassSettings";

interface Props {
  db: AppDB;
  languageId: string;
  onChange: (db: AppDB) => void;
}

type PanelView =
  | { type: "list" }
  | { type: "view"; articleId: string }
  | { type: "edit"; articleId: string }
  | { type: "new" }
  | { type: "wordclass" };

const EMPTY_ARTICLE: Omit<GrammarArticle, "id" | "date" | "updatedAt"> = {
  languageId: "",
  title: "",
  body: "",
  category: "",
  tags: [],
};

export function GrammarPanel({ db, languageId, onChange }: Props) {
  const [view, setView] = useState<PanelView>({ type: "list" });
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const articles = searchGrammarArticles(db, languageId, query, filterCategory || undefined, filterTag || undefined);

  // カテゴリー・タグ一覧（フィルタ用）
  const allArticles = db.grammarArticles.filter((a) => a.languageId === languageId);
  const categories = [...new Set(allArticles.map((a) => a.category).filter(Boolean))];
  const allTags = [...new Set(allArticles.flatMap((a) => a.tags))];

  // ---------- 記事操作 ----------
  function handleCreate(data: Partial<Omit<GrammarArticle, "id" | "languageId" | "date" | "updatedAt">>) {
    const { db: next, article } = createGrammarArticle(db, {
      languageId,
      title: data.title ?? "新しい記事",
      body: data.body ?? "",
      category: data.category ?? "",
      tags: data.tags ?? [],
    });
    onChange(next);
    setView({ type: "view", articleId: article.id });
  }

  function handleUpdate(id: string, patch: Partial<Omit<GrammarArticle, "id" | "languageId" | "date">>) {
    onChange(updateGrammarArticle(db, id, patch));
    setView({ type: "view", articleId: id });
  }

  function handleDelete(id: string) {
    if (!confirm("この記事を削除しますか？")) return;
    onChange(deleteGrammarArticle(db, id));
    setView({ type: "list" });
  }

  // ---------- 現在表示中の記事 ----------
  const currentArticle =
    (view.type === "view" || view.type === "edit")
      ? db.grammarArticles.find((a) => a.id === view.articleId)
      : null;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>

      {/* 左：記事リスト */}
      <div
        style={{
          width: "240px",
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-panel)",
        }}
      >
        {/* ヘッダー */}
        <div
          style={{
            padding: "var(--gap-sm) var(--gap-md)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>文法Wiki</span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className="btn-icon"
              title="新しい記事"
              onClick={() => setView({ type: "new" })}
            >
              ＋
            </button>
            <button
              className={view.type === "wordclass" ? "btn-primary" : "btn-icon"}
              title="品詞の設定"
              style={{ fontSize: "0.75rem" }}
              onClick={() => setView(view.type === "wordclass" ? { type: "list" } : { type: "wordclass" })}
            >
              品詞
            </button>
          </div>
        </div>

        {/* 検索 */}
        <div style={{ padding: "var(--gap-xs) var(--gap-sm)", borderBottom: "1px solid var(--border)" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="記事を検索…"
            style={{ fontSize: "var(--text-xs)", marginBottom: "var(--gap-xs)" }}
          />
          {/* カテゴリーフィルタ */}
          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ fontSize: "var(--text-xs)", marginBottom: "var(--gap-xs)" }}
            >
              <option value="">すべてのカテゴリー</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {/* タグフィルタ */}
          {allTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={{ fontSize: "var(--text-xs)" }}
            >
              <option value="">すべてのタグ</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {/* 記事リスト */}
        <div className="scrollable">
          {articles.length === 0 && (
            <div className="empty-state" style={{ padding: "var(--gap-lg)" }}>
              {query || filterCategory || filterTag ? "見つかりません" : "記事がありません"}
            </div>
          )}
          {articles
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((article) => {
              const isSelected =
                (view.type === "view" || view.type === "edit") &&
                view.articleId === article.id;
              return (
                <div
                  key={article.id}
                  onClick={() => setView({ type: "view", articleId: article.id })}
                  style={{
                    padding: "var(--gap-sm) var(--gap-md)",
                    cursor: "pointer",
                    background: isSelected ? "var(--bg-active)" : "transparent",
                    borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: isSelected ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {article.title}
                  </div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                    {article.category && (
                      <span className="badge" style={{ fontSize: "9px" }}>{article.category}</span>
                    )}
                    {article.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="badge"
                        style={{ fontSize: "9px", background: "var(--bg-hover)", color: "var(--text-muted)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "2px" }}>
                    {new Date(article.updatedAt).toLocaleDateString("ja-JP")}
                  </div>
                </div>
              );
            })}
        </div>

        {/* フッター */}
        <div style={{ padding: "var(--gap-xs) var(--gap-md)", borderTop: "1px solid var(--border)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {articles.length} / {allArticles.length} 記事
        </div>
      </div>

      {/* 右：記事表示・編集・品詞設定 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {view.type === "list" && (
          <div className="empty-state">
            <span style={{ fontSize: "var(--text-xl)" }}>📖</span>
            <span>記事を選択するか、＋ から新しい記事を作成してください</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              [[記事タイトル]] で記事間をリンクできます
            </span>
          </div>
        )}

        {view.type === "wordclass" && (
          <div className="scrollable">
            <WordClassSettings db={db} languageId={languageId} onChange={onChange} />
          </div>
        )}

        {view.type === "new" && (
          <GrammarEditor
            article={{ ...EMPTY_ARTICLE, languageId, id: "", date: 0, updatedAt: 0 }}
            db={db}
            onSave={(patch) => handleCreate(patch)}
            onNavigate={(id) => setView({ type: "view", articleId: id })}
            onCancel={() => setView({ type: "list" })}
            onDelete={() => setView({ type: "list" })}
          />
        )}

        {view.type === "view" && currentArticle && (
          <GrammarViewer
            article={currentArticle}
            db={db}
            onNavigate={(id) => setView({ type: "view", articleId: id })}
            onEdit={() => setView({ type: "edit", articleId: currentArticle.id })}
          />
        )}

        {view.type === "edit" && currentArticle && (
          <GrammarEditor
            article={currentArticle}
            db={db}
            onSave={(patch) => handleUpdate(currentArticle.id, patch)}
            onNavigate={(id) => setView({ type: "view", articleId: id })}
            onCancel={() => setView({ type: "view", articleId: currentArticle.id })}
            onDelete={() => handleDelete(currentArticle.id)}
          />
        )}
      </div>
    </div>
  );
}
