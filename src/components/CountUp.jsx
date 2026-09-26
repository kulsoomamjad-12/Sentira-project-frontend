import React, { useEffect, useRef, useState } from 'react';

// Animates a number tweening up (or down) to `value` whenever it changes,
// instead of the new number just snapping into place. Used for dashboard
// stats like the sentiment breakdown's total count and percentages.
export default function CountUp({ value, duration = 700, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef();

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return undefined;

    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3; // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}
