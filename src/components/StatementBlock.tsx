import { createReactBlockSpec } from "@blocknote/react";

// "Art statement" presets — single, striking typographic lines for an editorial
// look, rendered with the Fraunces display serif (--font-display).
export const STATEMENT_VARIANTS = ["grand", "editorial", "stamp"] as const;
export type StatementVariant = (typeof STATEMENT_VARIANTS)[number];

const VARIANT_CLASS: Record<StatementVariant, string> = {
  grand: "font-display font-semibold text-4xl sm:text-6xl leading-[1.02] tracking-tight my-6",
  editorial: "font-display italic font-light text-3xl sm:text-5xl leading-snug my-6 text-ink/90",
  stamp: "font-sans uppercase tracking-[0.3em] text-xs sm:text-sm text-muted-foreground my-7",
};

export const StatementBlock = createReactBlockSpec(
  {
    type: "statement",
    propSchema: {
      variant: { default: "grand", values: STATEMENT_VARIANTS },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      const variant = (block.props.variant as StatementVariant) ?? "grand";
      return <div ref={contentRef} className={VARIANT_CLASS[variant] ?? VARIANT_CLASS.grand} />;
    },
  },
);
