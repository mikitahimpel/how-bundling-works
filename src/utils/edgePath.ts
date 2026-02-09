interface Point {
  x: number;
  y: number;
}

/**
 * Build an SVG path string from a series of points with rounded corners.
 * Uses quadratic bezier curves (Q) at each bend point for smooth turns.
 */
export function buildEdgePath(points: Point[], borderRadius = 8): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const parts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Distance from current point to neighbors
    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);

    // Clamp radius so it doesn't exceed half the segment length
    const r = Math.min(borderRadius, dPrev / 2, dNext / 2);

    // Points along the segments at distance r from the bend
    const beforeX = curr.x - (r * (curr.x - prev.x)) / dPrev;
    const beforeY = curr.y - (r * (curr.y - prev.y)) / dPrev;
    const afterX = curr.x + (r * (next.x - curr.x)) / dNext;
    const afterY = curr.y + (r * (next.y - curr.y)) / dNext;

    parts.push(`L ${beforeX} ${beforeY}`);
    parts.push(`Q ${curr.x} ${curr.y} ${afterX} ${afterY}`);
  }

  const last = points[points.length - 1];
  parts.push(`L ${last.x} ${last.y}`);

  return parts.join(' ');
}

/**
 * Find the midpoint of the longest segment in the polyline.
 * For orthogonal edge routing, this places labels on the longest
 * horizontal segment between layers, keeping them in clear space.
 */
export function getPathMidpoint(points: Point[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0].x, y: points[0].y };

  let longestLen = 0;
  let longestIdx = 0;

  for (let i = 1; i < points.length; i++) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    if (segLen > longestLen) {
      longestLen = segLen;
      longestIdx = i;
    }
  }

  return {
    x: (points[longestIdx - 1].x + points[longestIdx].x) / 2,
    y: (points[longestIdx - 1].y + points[longestIdx].y) / 2,
  };
}
