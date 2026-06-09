import { useEffect, useRef, useState, type RefObject } from "react";

// A discrete, draggable scroll thumb on the right edge — only appears on long
// (scrollable) pages and fades out when idle. Lets you jump down a long document.
export function QuickScroll({ scrollRef }: { scrollRef: RefObject<HTMLDivElement | null> }) {
  const [m, setM] = useState({ thumbH: 0, thumbTop: 0, scrollable: false });
  const [active, setActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const dragging = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const trackH = trackRef.current?.clientHeight || el.clientHeight;
      const scrollable = el.scrollHeight > el.clientHeight + 60;
      const thumbH = Math.max(28, (el.clientHeight / el.scrollHeight) * trackH);
      const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
      setM({ thumbH, thumbTop: ratio * (trackH - thumbH), scrollable });
      if (!dragging.current) {
        setActive(true);
        clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setActive(false), 1400);
      }
    };
    el.addEventListener("scroll", update, { passive: true });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef]);

  function onThumbDown(e: React.PointerEvent) {
    e.preventDefault();
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    dragging.current = true;
    setActive(true);
    const startY = e.clientY;
    const startScroll = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const range = track.clientHeight - m.thumbH;
    const move = (ev: PointerEvent) => {
      const dScroll = ((ev.clientY - startY) / (range || 1)) * maxScroll;
      el.scrollTop = Math.min(maxScroll, Math.max(0, startScroll + dScroll));
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setActive(false), 1000);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  if (!m.scrollable) return null;
  return (
    <div
      ref={trackRef}
      className="absolute right-1 top-14 bottom-3 w-3 z-20"
      onPointerEnter={() => setActive(true)}
    >
      <div
        onPointerDown={onThumbDown}
        style={{ height: m.thumbH, transform: `translateY(${m.thumbTop}px)` }}
        className={`absolute right-0.5 w-1.5 rounded-full bg-ink/30 hover:bg-ink/55 cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
