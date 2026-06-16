'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_PX = 30;

const HANDLES = [
  { id: 'nw', cx: 0,   cy: 0,   cursor: 'nwse-resize' },
  { id: 'n',  cx: 0.5, cy: 0,   cursor: 'ns-resize'   },
  { id: 'ne', cx: 1,   cy: 0,   cursor: 'nesw-resize' },
  { id: 'e',  cx: 1,   cy: 0.5, cursor: 'ew-resize'   },
  { id: 'se', cx: 1,   cy: 1,   cursor: 'nwse-resize' },
  { id: 's',  cx: 0.5, cy: 1,   cursor: 'ns-resize'   },
  { id: 'sw', cx: 0,   cy: 1,   cursor: 'nesw-resize' },
  { id: 'w',  cx: 0,   cy: 0.5, cursor: 'ew-resize'   },
];

function initBox(cW, cH, ratio) {
  let w = cW * 0.8;
  let h = ratio != null ? w / ratio : cH * 0.8;
  if (h > cH * 0.8) { h = cH * 0.8; w = ratio != null ? h * ratio : cW * 0.8; }
  return { x: (cW - w) / 2, y: (cH - h) / 2, w, h };
}

// ratio     → constraint for resize (null = free in all directions)
// initRatio → used only when snapping/resetting the box to a preset shape
export default function CropOverlay({ containerWidth: cW, containerHeight: cH, ratio, initRatio, resetKey, onChange }) {
  const [box, setBox] = useState(null);
  const dragRef = useRef(null);

  const clamp = useCallback(({ x, y, w, h }) => {
    w = Math.max(MIN_PX, Math.min(w, cW));
    h = Math.max(MIN_PX, Math.min(h, cH));
    x = Math.max(0, Math.min(x, cW - w));
    y = Math.max(0, Math.min(y, cH - h));
    return { x, y, w, h };
  }, [cW, cH]);

  const emit = useCallback((b) => {
    onChange?.({ x: b.x / cW, y: b.y / cH, width: b.w / cW, height: b.h / cH });
  }, [cW, cH, onChange]);

  const reset = useCallback(() => {
    if (!cW || !cH) return;
    const b = clamp(initBox(cW, cH, initRatio ?? ratio));
    setBox(b);
    emit(b);
  }, [cW, cH, ratio, initRatio, clamp, emit]);

  useEffect(() => { reset(); }, [reset, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = useCallback((e, type, hId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!box) return;
    dragRef.current = { type, hId, sx: e.clientX, sy: e.clientY, b0: { ...box } };
  }, [box]);

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current) return;
      const { type, hId, sx, sy, b0 } = dragRef.current;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let n = { ...b0 };

      if (type === 'move') {
        n.x = b0.x + dx;
        n.y = b0.y + dy;
      } else {
        const ar = ratio;
        switch (hId) {
          case 'se': n.w = b0.w + dx; n.h = ar != null ? n.w / ar : b0.h + dy; break;
          case 'sw': n.w = b0.w - dx; n.h = ar != null ? n.w / ar : b0.h + dy; n.x = b0.x + b0.w - n.w; break;
          case 'nw':
            n.w = b0.w - dx; n.h = ar != null ? n.w / ar : b0.h - dy;
            n.x = b0.x + b0.w - n.w; n.y = b0.y + b0.h - n.h; break;
          case 'ne':
            n.w = b0.w + dx; n.h = ar != null ? n.w / ar : b0.h - dy;
            n.y = b0.y + b0.h - n.h; break;
          case 'e':
            n.w = b0.w + dx;
            if (ar != null) { n.h = n.w / ar; n.y = b0.y + (b0.h - n.h) / 2; }
            break;
          case 'w':
            n.w = b0.w - dx; n.x = b0.x + dx;
            if (ar != null) { n.h = n.w / ar; n.y = b0.y + (b0.h - n.h) / 2; }
            break;
          case 's':
            n.h = b0.h + dy;
            if (ar != null) { n.w = n.h * ar; n.x = b0.x + (b0.w - n.w) / 2; }
            break;
          case 'n':
            n.h = b0.h - dy; n.y = b0.y + dy;
            if (ar != null) { n.w = n.h * ar; n.x = b0.x + (b0.w - n.w) / 2; }
            break;
        }
      }

      const c = clamp(n);
      setBox(c);
      emit(c);
    }

    function onUp() { dragRef.current = null; }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [ratio, clamp, emit]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (!box) return;
    const f = e.deltaY < 0 ? 1.08 : 0.93;
    const nw = box.w * f;
    const nh = ratio != null ? nw / ratio : box.h * f;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const c = clamp({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
    setBox(c);
    emit(c);
  }, [box, ratio, clamp, emit]);

  if (!box || !cW || !cH) return null;
  const { x, y, w, h } = box;

  return (
    <div
      style={{ position: 'absolute', inset: 0, userSelect: 'none' }}
      onWheel={onWheel}
      onDoubleClick={reset}
    >
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        viewBox={`0 0 ${cW} ${cH}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="crop-hole">
            <rect width={cW} height={cH} fill="white" />
            <rect x={x} y={y} width={w} height={h} fill="black" />
          </mask>
        </defs>
        <rect width={cW} height={cH} fill="rgba(0,0,0,0.52)" mask="url(#crop-hole)" />
        <rect x={x} y={y} width={w} height={h} fill="none" stroke="white" strokeWidth="1.5" />
        {[1, 2].map(i => (
          <g key={i} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8">
            <line x1={x + (w / 3) * i} y1={y} x2={x + (w / 3) * i} y2={y + h} />
            <line x1={x} y1={y + (h / 3) * i} x2={x + w} y2={y + (h / 3) * i} />
          </g>
        ))}
      </svg>

      {/* Move area */}
      <div
        style={{ position: 'absolute', left: x, top: y, width: w, height: h, cursor: 'move' }}
        onMouseDown={e => startDrag(e, 'move', null)}
      />

      {/* Resize handles */}
      {HANDLES.map(({ id, cx, cy, cursor }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            left: x + w * cx - 5, top: y + h * cy - 5,
            width: 10, height: 10, cursor, zIndex: 10,
          }}
          onMouseDown={e => startDrag(e, 'resize', id)}
        >
          <div style={{
            position: 'absolute', inset: 1.5,
            background: 'white', borderRadius: 1,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          }} />
        </div>
      ))}
    </div>
  );
}
