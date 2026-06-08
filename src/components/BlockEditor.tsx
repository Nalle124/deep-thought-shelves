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
import { Type } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { uploadMedia } from "@/lib/storage";
import { StatementBlock, STATEMENT_VARIANTS, type StatementVariant } from "@/components/StatementBlock";

export type BlockEditorHandle = { focus: () => void };

// Schema = the built-in blocks + our "art statement" block.
const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, statement: StatementBlock() },
});

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
    // No Swedish locale ships with BlockNote — override the visible placeholder.
    dictionary: {
      ...en,
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
  function handleWrapClick(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    // Ignore clicks that landed on actual content / controls.
    if (t.closest(".bn-block-content") || t.closest("button") || t.closest('[role="menu"]')) return;
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
    <div className="min-h-[28vh] cursor-text" onClick={handleWrapClick}>
      <BlockNoteView
        editor={editor}
        theme={theme === "dark" ? "dark" : "light"}
        onChange={() => onChange(JSON.stringify(editor.document))}
        className="arkiv-editor"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const items = [...getDefaultReactSlashMenuItems(editor), ...statementItems()];
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
