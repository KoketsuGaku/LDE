// ============================================================
// conlang-dev / components/GrammarViewer.tsx
// ============================================================

import type { GrammarArticle, AppDB } from "../types";

interface Props {
  article: GrammarArticle;
  db: AppDB;
  onNavigate: (articleId: string) => void;
  onEdit: () => void;
}

export function GrammarViewer({ article, db, onNavigate, onEdit }: Props) {
  const lang = db.languages.find((l) => l.id === article.languageId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        padding: "var(--gap-md) var(--gap-lg)", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "flex-start", gap: "var(--gap-md)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--gap-sm)", flexWrap: "wrap", marginBottom: "var(--gap-xs)" }}>
            {article.category && <span className="badge">{article.category}</span>}
            {article.tags.map((tag) => (
              <span key={tag} className="badge" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>{tag}</span>
            ))}
          </div>
          <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{article.title}</h2>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: "4px" }}>
            {lang?.name} · 更新：{new Date(article.updatedAt).toLocaleDateString("ja-JP")}
          </div>
        </div>
        <button className="btn-ghost" style={{ fontSize: "var(--text-xs)", flexShrink: 0 }} onClick={onEdit}>✎ 編集</button>
      </div>

      <div className="scrollable" style={{ padding: "var(--gap-lg)" }}>
        <MarkdownBody body={article.body} db={db} languageId={article.languageId} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

// ============================================================
// Markdownレンダラー（export してエディタのプレビューでも使用）
// ============================================================

interface MBProps {
  body: string;
  db: AppDB;
  languageId: string;
  onNavigate: (id: string) => void;
}

export function MarkdownBody({ body, db, languageId, onNavigate }: MBProps) {
  if (body.trim() === "") {
    return <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>本文がありません。</div>;
  }

  const articles = db.grammarArticles.filter((a) => a.languageId === languageId);

  // ----------------------------------------------------------------
  // インラインパーサー：[[リンク]] **太字** `コード` を処理
  // ----------------------------------------------------------------
  function parseInline(text: string, baseKey: string): JSX.Element[] {
    // 3種類のトークンを一括で分割
    const TOKEN = /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|`[^`]+`)/g;
    const parts = text.split(TOKEN);

    return parts.map((part, i): JSX.Element => {
      const k = `${baseKey}-${i}`;

      if (part.startsWith("[[") && part.endsWith("]]")) {
        const title = part.slice(2, -2);
        const target = articles.find((a) => a.title === title);
        return target
          ? (
            <span key={k}
              onClick={() => onNavigate(target.id)}
              style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
              title={`→ ${title}`}
            >{title}</span>
          ) : (
            <span key={k}
              style={{ color: "var(--danger)", textDecoration: "underline", textDecorationStyle: "dotted" }}
              title="記事が見つかりません"
            >{title}</span>
          );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={k}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={k} style={{
            fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
            background: "var(--bg-base)", padding: "1px 5px", borderRadius: "3px",
          }}>{part.slice(1, -1)}</code>
        );
      }

      return <span key={k}>{part}</span>;
    });
  }

  // ----------------------------------------------------------------
  // ブロックパーサー
  // ----------------------------------------------------------------
  function renderBlocks(md: string): JSX.Element[] {
    const lines = md.split("\n");
    const result: JSX.Element[] = [];
    let i = 0;
    let ulBuf: JSX.Element[] = [];
    let olBuf: JSX.Element[] = [];

    function flushUL() {
      if (ulBuf.length === 0) return;
      result.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: "1.5em", marginBottom: "var(--gap-md)", fontSize: "var(--text-sm)", lineHeight: 1.8 }}>
          {ulBuf}
        </ul>
      );
      ulBuf = [];
    }
    function flushOL() {
      if (olBuf.length === 0) return;
      result.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: "1.5em", marginBottom: "var(--gap-md)", fontSize: "var(--text-sm)", lineHeight: 1.8 }}>
          {olBuf}
        </ol>
      );
      olBuf = [];
    }
    function flushAll() { flushUL(); flushOL(); }

    while (i < lines.length) {
      const line = lines[i];

      // ---- コードブロック ----
      if (line.startsWith("```")) {
        flushAll();
        const langLabel = line.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        result.push(
          <pre key={`pre-${i}`} style={{
            background: "var(--bg-base)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: "var(--gap-md)",
            fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)",
            overflowX: "auto", marginBottom: "var(--gap-md)",
          }}>
            {langLabel && <div style={{ color: "var(--text-muted)", marginBottom: "4px", fontSize: "10px" }}>{langLabel}</div>}
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        i++;
        continue;
      }

      // ---- 見出し ----
      const h1m = line.match(/^# (.+)/);
      const h2m = line.match(/^## (.+)/);
      const h3m = line.match(/^### (.+)/);
      if (h1m) {
        flushAll();
        result.push(<h2 key={i} style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: "var(--gap-lg) 0 var(--gap-sm)", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>{parseInline(h1m[1], `h1-${i}`)}</h2>);
        i++; continue;
      }
      if (h2m) {
        flushAll();
        result.push(<h3 key={i} style={{ fontSize: "var(--text-lg)", fontWeight: 600, margin: "var(--gap-lg) 0 var(--gap-sm)" }}>{parseInline(h2m[1], `h2-${i}`)}</h3>);
        i++; continue;
      }
      if (h3m) {
        flushAll();
        result.push(<h4 key={i} style={{ fontSize: "var(--text-base)", fontWeight: 600, margin: "var(--gap-md) 0 var(--gap-xs)", color: "var(--text-secondary)" }}>{parseInline(h3m[1], `h3-${i}`)}</h4>);
        i++; continue;
      }

      // ---- 水平線 ----
      if (line.match(/^---+$/)) {
        flushAll();
        result.push(<hr key={i} className="divider" />);
        i++; continue;
      }

      // ---- 番号付きリスト ----
      const olm = line.match(/^\d+\. (.+)/);
      if (olm) {
        flushUL();
        olBuf.push(<li key={i}>{parseInline(olm[1], `oli-${i}`)}</li>);
        i++; continue;
      }

      // ---- 箇条書き ----
      const ulm = line.match(/^[*\-] (.+)/);
      if (ulm) {
        flushOL();
        ulBuf.push(<li key={i}>{parseInline(ulm[1], `uli-${i}`)}</li>);
        i++; continue;
      }

      // ---- 空行 ----
      flushAll();
      if (line.trim() === "") {
        result.push(<div key={i} style={{ height: "var(--gap-sm)" }} />);
        i++; continue;
      }

      // ---- 段落 ----
      result.push(
        <p key={i} style={{ fontSize: "var(--text-sm)", lineHeight: 1.8, marginBottom: "var(--gap-xs)" }}>
          {parseInline(line, `p-${i}`)}
        </p>
      );
      i++;
    }

    flushAll();
    return result;
  }

  return <div style={{ maxWidth: "720px" }}>{renderBlocks(body)}</div>;
}
