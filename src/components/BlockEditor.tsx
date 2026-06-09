import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { forwardRef, useImperativeHandle } from "react";
import {
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  type DefaultReactSuggestionItem,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import {
  withMultiColumn,
  multiColumnDropCursor,
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
} from "@blocknote/xl-multi-column";
import { Type } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { uploadMedia } from "@/lib/storage";
import { youtubeId } from "@/lib/youtube";
import { StatementBlock, STATEMENT_VARIANTS, type StatementVariant } from "@/components/StatementBlock";
import { YouTubeBlock } from "@/components/YouTubeBlock";

export type BlockEditorHandle = { focus: () => void };

// Schema = built-in blocks + custom blocks (art statement, YouTube embed) +
// multi-column support (drag blocks side by side to build rows / collages).
const schema = withMultiColumn(
  BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, statement: StatementBlock(), youtube: YouTubeBlock() },
  }),
);

function blockText(block: any): string {
  return Array.isArray(block?.content)
    ? block.content
        .map((c: any) =>
          c?.type === "text"
            ? c.text
            : c?.type === "link"
              ? (c.content ?? []).map((cc: any) => cc.text ?? "").join("")
              : "",
        )
        .join("")
    : "";
}

// Parse the stored body (BlockNote document JSON). Empty/legacy values start a
// fresh empty document.
function parseInitial(value: string): any[] | undefined {
  if (!value || !value.trim()) return undefined;
  try {
    const blocks = JSON.parse(value);
    if (Array.isArray(blocks) && blocks.length > 0) return blocks;
  } catch {
    return [{ type: "paragraph", content: value }];
  }
  return undefined;
}

const STATEMENT_LABELS: Record<StatementVariant, { title: string; subtext: string }> = {
  grand: { title: "Statement – stor", subtext: "Stor Fraunces-rubrik" },
  editorial: { title: "Statement – editorial", subtext: "Kursiv, lätt display-serif" },
  stamp: { title: "Statement – stämpel", subtext: "Liten, spärrad versal etikett" },
};

/**
 * Notion-style block editor. Slash menu, headings, lists, checkboxes, quote
 * (> + space), divider (---), tables, images, and custom art-statement presets —
 * all live. The body is persisted as BlockNote document JSON.
 */
export const BlockEditor = forwardRef<BlockEditorHandle, {
  value: string;
  onChange: (json: string) => void;
}>(function BlockEditor({ value, onChange }, ref) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote({
    schema,
    initialContent: parseInitial(value),
    // Drag/drop/paste an image → uploads to Supabase Storage, returns a URL.
    uploadFile: uploadMedia,
    // Drag a block to the side of another to place them in a row (collage).
    dropCursor: multiColumnDropCursor,
    // No Swedish locale ships with BlockNote — override the visible placeholder.
    dictionary: {
      ...en,
      multi_column: multiColumnLocales.en,
      placeholders: {
        ...en.placeholders,
        default: "Skriv något, eller tryck '/' för kommandon",
        emptyDocument: "Skriv något, eller tryck '/' för kommandon",
      },
    },
  });

  useImperativeHandle(ref, () => ({
    focus: () => editor.focus(),
  }), [editor]);

  // Click anywhere in the empty area below the content → start writing there
  // (append a paragraph if the last block isn't already an empty one).
  function focusEnd() {
    const doc = editor.document;
    const last = doc[doc.length - 1];
    const lastEmpty =
      last?.type === "paragraph" &&
      (!last.content || (Array.isArray(last.content) && last.content.length === 0));
    if (last && !lastEmpty) {
      editor.insertBlocks([{ type: "paragraph" }], last, "after");
    }
    const fresh = editor.document;
    editor.setTextCursorPosition(fresh[fresh.length - 1], "end");
    editor.focus();
  }
  function afterChange() {
    // Text-cursor block (throws when a void block like a divider is node-selected).
    let textBlock: any = null;
    try { textBlock = editor.getTextCursorPosition().block; } catch { textBlock = null; }

    // `"` + space at the start of a paragraph → quote (Notion-style; BlockNote's
    // built-in is `>`). Also: a paragraph that is just a YouTube link → embed.
    if (textBlock?.type === "paragraph") {
      const text = blockText(textBlock);
      if (text === '" ' || text === "” " || text === "“ ") {
        editor.updateBlock(textBlock, { type: "quote", content: [] });
        return;
      }
      const trimmed = text.trim();
      const yt = youtubeId(trimmed);
      if (yt && /^https?:\/\/\S+$/.test(trimmed) && !/\s/.test(trimmed)) {
        editor.updateBlock(textBlock, { type: "youtube", props: { videoId: yt } } as any);
        const fresh = editor.document;
        const i = fresh.findIndex((b: any) => b.id === textBlock.id);
        if (!fresh[i + 1]) {
          const ins = editor.insertBlocks([{ type: "paragraph" }], textBlock.id, "after");
          editor.setTextCursorPosition(ins[0].id, "end");
        }
        return;
      }
    }

    // Enter at the end of a statement should drop you into normal text, not make
    // another statement. An empty statement following another → convert to paragraph.
    if (textBlock?.type === "statement") {
      const empty = !textBlock.content || (Array.isArray(textBlock.content) && textBlock.content.length === 0);
      if (empty) {
        const doc = editor.document;
        const idx = doc.findIndex((b: any) => b.id === textBlock.id);
        if (doc[idx - 1]?.type === "statement") {
          editor.updateBlock(textBlock, { type: "paragraph", content: [] });
          return;
        }
      }
    }

    // A freshly created divider (e.g. via `---`) gets node-selected (blue) and you
    // can't keep typing. Drop a paragraph right after it and move the cursor there
    // so writing continues in place — no jump up the page.
    try {
      const selDivider = editor.getSelection()?.blocks?.find((b: any) => b?.type === "divider");
      const divider = selDivider ?? (textBlock?.type === "divider" ? textBlock : null);
      if (divider) {
        const doc = editor.document;
        const idx = doc.findIndex((b: any) => b.id === divider.id);
        const next = doc[idx + 1];
        if (!next) {
          const ins = editor.insertBlocks([{ type: "paragraph" }], divider.id, "after");
          editor.setTextCursorPosition(ins[0].id, "end");
        } else {
          editor.setTextCursorPosition(next.id, "start");
        }
      }
    } catch { /* ignore */ }
  }

  function handleWrapClick(e: React.MouseEvent) {
    // Never steal an active text selection (e.g. finishing a drag-select to copy).
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const t = e.target as HTMLElement;
    // Ignore clicks that landed on actual content / controls.
    if (
      t.closest(".bn-block-content") ||
      t.closest("button") ||
      t.closest('[role="menu"]') ||
      t.closest('[role="toolbar"]')
    )
      return;
    focusEnd();
  }

  function statementItems(): DefaultReactSuggestionItem[] {
    return STATEMENT_VARIANTS.map((variant) => ({
      ...STATEMENT_LABELS[variant],
      aliases: ["statement", "art", "rubrik", "typografi", variant],
      group: "Statements",
      icon: <Type size={18} />,
      onItemClick: () => {
        const cur = editor.getTextCursorPosition().block;
        const empty = !cur.content || (Array.isArray(cur.content) && cur.content.length === 0);
        const block = { type: "statement" as const, props: { variant } };
        if (empty) editor.replaceBlocks([cur], [block as any]);
        else editor.insertBlocks([block as any], cur, "after");
      },
    }));
  }

  return (
    <div className="min-h-[18vh] cursor-text" onClick={handleWrapClick}>
      <BlockNoteView
        editor={editor}
        theme={theme === "dark" ? "dark" : "light"}
        onChange={() => {
          afterChange();
          onChange(JSON.stringify(editor.document));
        }}
        className="arkiv-editor"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const items = [
              ...getDefaultReactSlashMenuItems(editor),
              ...getMultiColumnSlashMenuItems(editor),
              ...statementItems(),
            ];
            const q = query.trim().toLowerCase();
            if (!q) return items;
            return items.filter(
              (it) =>
                it.title.toLowerCase().includes(q) ||
                (it.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
            );
          }}
        />
      </BlockNoteView>
    </div>
  );
});
