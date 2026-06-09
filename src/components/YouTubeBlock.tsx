import { createReactBlockSpec } from "@blocknote/react";

// Embedded YouTube player. Created automatically when a YouTube link is pasted.
export const YouTubeBlock = createReactBlockSpec(
  {
    type: "youtube",
    propSchema: { videoId: { default: "" } },
    content: "none",
  },
  {
    render: ({ block }) => {
      const id = block.props.videoId;
      return (
        <div
          className="my-2 w-full aspect-video rounded-lg overflow-hidden bg-black/80"
          contentEditable={false}
        >
          {id ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${id}`}
              title="YouTube"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      );
    },
  },
);
