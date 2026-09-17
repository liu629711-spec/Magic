// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/markdown.ts
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  py: 'python',
  yml: 'yaml',
  md: 'markdown',
  txt: '',
  text: '',
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_match, label: string, href: string) => {
        if (/^https?:\/\//.test(href)) {
          return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        }
        const fileName = href.split('/').pop() || href;
        const lastDotIdx = fileName.lastIndexOf('.');
        const ext =
          lastDotIdx > 0 ? fileName.slice(lastDotIdx + 1).toLowerCase() : '';
        return `<span class="file-link" data-file-ext="${ext}" data-file-path="${href}">${label}</span>`;
      },
    );
}

function renderProse(value: string) {
  const blocks = value.split(/\n{2,}/).map((item) => item.trim());

  return blocks
    .filter(Boolean)
    .map((block) => {
      if (/^###\s+/.test(block)) {
        return `<h3>${renderInline(block.replace(/^###\s+/, ''))}</h3>`;
      }
      if (/^##\s+/.test(block)) {
        return `<h2>${renderInline(block.replace(/^##\s+/, ''))}</h2>`;
      }
      if (/^#\s+/.test(block)) {
        return `<h1>${renderInline(block.replace(/^#\s+/, ''))}</h1>`;
      }

      const lines = block.split('\n');
      if (lines.every((line) => /^[-*]\s+/.test(line.trim()))) {
        return `<ul>${lines
          .map((line) => `<li>${renderInline(line.trim().replace(/^[-*]\s+/, ''))}</li>`)
          .join('')}</ul>`;
      }
      if (lines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
        return `<ol>${lines
          .map((line) => `<li>${renderInline(line.trim().replace(/^\d+\.\s+/, ''))}</li>`)
          .join('')}</ol>`;
      }

      return `<p>${renderInline(block).replace(/\n/g, '<br />')}</p>`;
    })
    .join('');
}

export function renderMarkdown(text: string): string {
  if (!text) return '';

  const nodes: string[] = [];
  const fence = /```([^\n]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    nodes.push(renderProse(text.slice(cursor, match.index)));

    const rawLang = (match[1] || '').trim().split(/\s+/)[0].toLowerCase();
    const lang = LANG_ALIASES[rawLang] ?? rawLang;
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    const codeClass = lang ? ` class="language-${escapeHtml(lang)}"` : '';
    nodes.push(
      `<pre${langAttr}><code${codeClass}>${escapeHtml(
        match[2].replace(/\n$/, ''),
      )}</code></pre>`,
    );
    cursor = match.index + match[0].length;
  }

  nodes.push(renderProse(text.slice(cursor)));
  return nodes.join('');
}
