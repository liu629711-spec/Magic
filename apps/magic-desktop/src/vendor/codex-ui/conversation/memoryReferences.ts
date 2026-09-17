// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/memoryReferences.ts
import type {
  ConversationMemoryReference,
  ConversationMemoryReferenceGroup,
  ConversationMessage,
} from './types.ts';

interface ParsedMemoryReferenceText {
  text: string;
  memoryReferences?: ConversationMemoryReferenceGroup;
}

const MEMORY_CITATION_BLOCK_RE =
  /<oai-mem-citation\b[^>]*>[\s\S]*?<\/oai-mem-citation>/gi;
const CITATION_ENTRIES_RE =
  /<citation_entries\b[^>]*>([\s\S]*?)<\/citation_entries>/i;
const ROLLOUT_IDS_RE = /<rollout_ids\b[^>]*>([\s\S]*?)<\/rollout_ids>/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_REFERENCE_LINE_RE =
  /^(.+):(\d+)(?:-(\d+))?\|note=\[(.*)\](?:\s+([0-9a-f-]{36}))?$/i;

function uniqueTexts(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function parseReferenceLine(line: string): {
  reference?: ConversationMemoryReference;
  rolloutId?: string;
} {
  const text = line.trim();
  const match = text.match(LEGACY_REFERENCE_LINE_RE);
  if (!match) return {};

  const lineStart = Number(match[2]);
  const lineEnd = match[3] ? Number(match[3]) : lineStart;
  const rolloutId = match[5]?.trim();

  return {
    reference: {
      filePath: match[1],
      lineStart,
      lineEnd,
      note: match[4]?.trim() || undefined,
      raw: text,
    },
    rolloutId: rolloutId && UUID_RE.test(rolloutId) ? rolloutId : undefined,
  };
}

function parseReferenceLines(lines: string[]) {
  const items: ConversationMemoryReference[] = [];
  const rolloutIds: string[] = [];

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    if (UUID_RE.test(text)) {
      rolloutIds.push(text);
      continue;
    }

    const parsed = parseReferenceLine(text);
    if (parsed.reference) items.push(parsed.reference);
    if (parsed.rolloutId) rolloutIds.push(parsed.rolloutId);
  }

  return {
    items,
    rolloutIds: uniqueTexts(rolloutIds),
  };
}

function parseXmlCitationBlock(raw: string): ConversationMemoryReferenceGroup {
  const entriesText = raw.match(CITATION_ENTRIES_RE)?.[1] || '';
  const rolloutIdsText = raw.match(ROLLOUT_IDS_RE)?.[1] || '';
  const parsedEntries = parseReferenceLines(entriesText.split(/\r?\n/));
  const parsedIds = parseReferenceLines(rolloutIdsText.split(/\r?\n/));

  return {
    items: parsedEntries.items,
    rolloutIds: uniqueTexts([
      ...parsedEntries.rolloutIds,
      ...parsedIds.rolloutIds,
    ]),
    raw,
  };
}

function parseLegacyTrailingReferences(
  text: string,
): ParsedMemoryReferenceText {
  const lines = text.split(/\r?\n/);
  let start = lines.length;
  let hasReference = false;

  while (start > 0) {
    const line = lines[start - 1].trim();
    if (!line) {
      start -= 1;
      continue;
    }
    const parsedLine = parseReferenceLine(line);
    if (UUID_RE.test(line) || parsedLine.reference) {
      hasReference = hasReference || Boolean(parsedLine.reference);
      start -= 1;
      continue;
    }
    break;
  }

  if (!hasReference || start === lines.length) return { text };

  const referenceLines = lines.slice(start);
  const parsed = parseReferenceLines(referenceLines);
  if (!parsed.items.length) return { text };

  return {
    text: lines.slice(0, start).join('\n').trimEnd(),
    memoryReferences: {
      items: parsed.items,
      rolloutIds: parsed.rolloutIds,
      raw: referenceLines.join('\n'),
    },
  };
}

export function mergeMemoryReferenceGroups(
  first?: ConversationMemoryReferenceGroup,
  second?: ConversationMemoryReferenceGroup,
): ConversationMemoryReferenceGroup | undefined {
  if (!first) return second;
  if (!second) return first;

  const seenRefs = new Set<string>();
  const items = [...first.items, ...second.items].filter((item) => {
    const key = `${item.filePath}:${item.lineStart || ''}:${
      item.lineEnd || ''
    }:${item.note || ''}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  });

  return {
    items,
    rolloutIds: uniqueTexts([
      ...(first.rolloutIds || []),
      ...(second.rolloutIds || []),
    ]),
    raw: [first.raw, second.raw].filter(Boolean).join('\n'),
  };
}

export function parseMemoryReferencesFromText(
  value: string,
): ParsedMemoryReferenceText {
  const text = String(value || '');
  if (!text) return { text };

  let memoryReferences: ConversationMemoryReferenceGroup | undefined;
  const withoutXml = text.replace(MEMORY_CITATION_BLOCK_RE, (raw) => {
    const parsed = parseXmlCitationBlock(raw);
    if (parsed.items.length) {
      memoryReferences = mergeMemoryReferenceGroups(memoryReferences, parsed);
    }
    return '';
  });

  const strippedText = withoutXml.trimEnd();
  if (memoryReferences?.items.length) {
    return {
      text: strippedText,
      memoryReferences,
    };
  }

  return parseLegacyTrailingReferences(strippedText);
}

export function normalizeMessageMemoryReferences(
  message: ConversationMessage,
): ConversationMessage {
  if (message.role !== 'assistant') return message;

  const parsed = parseMemoryReferencesFromText(message.text);
  const mergedReferences = mergeMemoryReferenceGroups(
    message.memoryReferences,
    parsed.memoryReferences,
  );

  if (
    parsed.text === message.text &&
    mergedReferences === message.memoryReferences
  ) {
    return message;
  }

  return {
    ...message,
    text: parsed.text,
    memoryReferences: mergedReferences,
  };
}
