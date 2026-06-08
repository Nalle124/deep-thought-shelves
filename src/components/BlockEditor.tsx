import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { forwardRef, useImperativeHandle } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { PartialBlock } from "@blocknote/core";
import { useTheme } from "@/lib/theme";

export type BlockEditorHandle = { focus: () => void };

// Parse the stored body (BlockNote document JSON). Empty/legacy values start a
// fresh empty document.
function parseInitial(value: string): PartialBlock[] | undefined {
  if (!value || !value.trim()) return undefined;
  try {
    const blocks = JSON.parse(value);
    if (Array.isArray(blocks) && blocks.length > 0) return blocks as PartialBlock[];
  } catch {
    // Not JSON (e.g. an older plain-text body) — drop it into a paragraph.
    return [{ type: "paragraph", content: value }];
  }
  return undefined;
}

/**
 * Notion-style block editor. Slash menu, headings, lists, checkboxes, quote
 * (> + space), divider (---), tables, images — all live as you type. The body
 * is persisted as BlockNote document JSON.
 */
export const BlockEditor = forwardRef<BlockEditorHandle, {
  value: string;
  onChange: (json: string) => void;
}>(function BlockEditor({ value, onChange }, ref) {
  const { theme } = useTheme();
  const editor = useCreateBlockNote({ initialContent: parseInitial(value) });

  useImperativeHandle(ref, () => ({
    focus: () => editor.focus(),
  }), [editor]);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme === "dark" ? "dark" : "light"}
      onChange={() => onChange(JSON.stringify(editor.document))}
      className="arkiv-editor"
    />
  );
});
