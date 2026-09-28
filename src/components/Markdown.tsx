import { Fragment, type ReactNode } from 'react';
import { splitBlocks } from '../lib/analyzer';
import { bionicSplit } from '../lib/text';

interface Props {
  source: string;
  bionic?: boolean;
  /** Source ranges to mark, e.g. detected filler phrases. */
  marks?: { index: number; length: number; title: string }[];
}

/**
 * Minimal, safe Markdown renderer: builds React elements directly (no HTML
 * injection) and supports the constructs agents usually emit.
 */
export function Markdown({ source, bionic, marks = [] }: Props) {
  const blocks = splitBlocks(source);
  return (
    <div className="md">
      {blocks.map((b, bi) => {
        const inl = (text: string, offset: number) => renderInline(text, offset, { bionic, marks });
        switch (b.kind) {
          case 'heading': {
            const m = b.text.match(/^(\s{0,3})(#{1,6})\s+(.*)$/)!;
            const level = Math.min(6, m[2].length + 1);
            const Tag = `h${level}` as 'h2';
            return <Tag key={bi}>{inl(m[3], b.start + m[1].length + m[2].length + 1)}</Tag>;
          }
          case 'code': {
            const body = b.text.replace(/^\s*```[^\n]*\n?/, '').replace(/\n?\s*```\s*$/, '');
            return <pre key={bi}><code>{body}</code></pre>;
          }
          case 'quote':
            return <blockquote key={bi}>{inl(b.text.replace(/^\s*>\s?/gm, ''), -1)}</blockquote>;
          case 'table': {
            const rows = b.text.split('\n').filter((l) => !/^\s*\|?[\s:-]+\|[\s|:-]*$/.test(l));
            const cells = rows.map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
            return (
              <div key={bi} className="table-wrap">
                <table>
                  <thead><tr>{cells[0]?.map((c, i) => <th key={i}>{inl(c, -1)}</th>)}</tr></thead>
                  <tbody>{cells.slice(1).map((r, ri) => <tr key={ri}>{r.map((c, i) => <td key={i}>{inl(c, -1)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          }
          case 'list': {
            const lines = b.text.split('\n');
            const items: { text: string; start: number; indent: number }[] = [];
            let off = b.start;
            for (const l of lines) {
              const m = l.match(/^(\s*)([-*+]|\d+[.)])\s+/);
              if (m) items.push({ text: l.slice(m[0].length), start: off + m[0].length, indent: m[1].length });
              else if (items.length) items[items.length - 1].text += ' ' + l.trim();
              off += l.length + 1;
            }
            const ordered = /^\s*\d/.test(lines[0]);
            const Tag = ordered ? 'ol' : 'ul';
            return (
              <Tag key={bi}>
                {items.map((it, i) => (
                  <li key={i} style={it.indent ? { marginLeft: `${it.indent * 0.6}em` } : undefined}>{inl(it.text, it.start)}</li>
                ))}
              </Tag>
            );
          }
          default:
            return <p key={bi}>{inl(b.text, b.start)}</p>;
        }
      })}
    </div>
  );
}

interface InlineOpts {
  bionic?: boolean;
  marks: { index: number; length: number; title: string }[];
}

const INLINE = /(\*\*|__)(.+?)\1|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|(?<![\w*])\*(?!\s)([^*\n]+?)\*(?![\w*])|(?<!\w)_(?!\s)([^_\n]+?)_(?!\w)/g;

/**
 * Renders inline Markdown. `offset` is the text's position in the original
 * source (or -1 if unknown) so filler marks can be placed.
 */
function renderInline(text: string, offset: number, opts: InlineOpts): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  INLINE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const plain = (s: string, at: number) => out.push(<Fragment key={key++}>{renderPlain(s, offset < 0 ? -1 : offset + at, opts)}</Fragment>);
  while ((m = INLINE.exec(text))) {
    if (m.index > last) plain(text.slice(last, m.index), last);
    if (m[2] != null) out.push(<strong key={key++}>{renderPlain(m[2], -1, opts)}</strong>);
    else if (m[3] != null) out.push(<code key={key++}>{m[3]}</code>);
    else if (m[4] != null) {
      const href = /^https?:\/\//i.test(m[5]) ? m[5] : undefined;
      out.push(href ? <a key={key++} href={href} target="_blank" rel="noreferrer noopener">{m[4]}</a> : <span key={key++}>{m[4]}</span>);
    } else if (m[6] != null || m[7] != null) out.push(<em key={key++}>{renderPlain(m[6] ?? m[7], -1, opts)}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) plain(text.slice(last), last);
  return out;
}

function renderPlain(text: string, offset: number, opts: InlineOpts): ReactNode {
  // Split into marked and unmarked segments.
  const segs: { text: string; title?: string }[] = [];
  if (offset >= 0 && opts.marks.length) {
    let pos = 0;
    const rel = opts.marks
      .map((mk) => ({ ...mk, s: mk.index - offset }))
      .filter((mk) => mk.s < text.length && mk.s + mk.length > 0)
      .sort((a, b) => a.s - b.s);
    for (const mk of rel) {
      const s = Math.max(pos, mk.s);
      const e = Math.min(text.length, mk.s + mk.length);
      if (e <= s) continue;
      if (s > pos) segs.push({ text: text.slice(pos, s) });
      segs.push({ text: text.slice(s, e), title: mk.title });
      pos = e;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos) });
  } else {
    segs.push({ text });
  }

  return segs.map((seg, i) => {
    const content = opts.bionic ? bionicText(seg.text) : seg.text;
    return seg.title ? <mark key={i} title={seg.title} className="filler">{content}</mark> : <Fragment key={i}>{content}</Fragment>;
  });
}

function bionicText(text: string): ReactNode {
  return text.split(/(\s+)/).map((w, i) => {
    if (!w.trim()) return w;
    const [b, rest] = bionicSplit(w);
    return <Fragment key={i}><b className="bionic">{b}</b>{rest}</Fragment>;
  });
}
