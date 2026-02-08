import type { ModuleNode, ImportEdge } from '../types/graph';

const NODE_WIDTH = 180;
const BASE_NODE_HEIGHT = 60;
const EXPORT_ROW_HEIGHT = 18;
const H_GAP = 200;
const V_GAP = 120;

function getNodeHeight(node: ModuleNode): number {
  const exportsCount = node.data.exports?.length ?? 0;
  if (exportsCount === 0) return BASE_NODE_HEIGHT;
  return BASE_NODE_HEIGHT + exportsCount * EXPORT_ROW_HEIGHT;
}

export function getLayoutedElements(
  nodes: ModuleNode[],
  edges: ImportEdge[],
): { nodes: ModuleNode[]; edges: ImportEdge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Build adjacency (source → targets) and track in-degrees
  const children = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    children.get(e.source)?.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  // BFS to assign layers (rank)
  const rank = new Map<string, number>();
  const queue: string[] = [];

  // Start from roots (in-degree 0). If none, start from first node.
  for (const n of nodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) {
      queue.push(n.id);
      rank.set(n.id, 0);
    }
  }
  if (queue.length === 0) {
    queue.push(nodes[0].id);
    rank.set(nodes[0].id, 0);
  }

  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentRank = rank.get(current) ?? 0;
    for (const child of children.get(current) ?? []) {
      const existingRank = rank.get(child);
      if (existingRank === undefined) {
        rank.set(child, currentRank + 1);
        queue.push(child);
      } else {
        // Push deeper if reached from a later rank
        rank.set(child, Math.max(existingRank, currentRank + 1));
      }
    }
  }

  // Assign rank 0 to any unvisited nodes
  for (const n of nodes) {
    if (!rank.has(n.id)) rank.set(n.id, 0);
  }

  const layers = new Map<number, string[]>();
  for (const n of nodes) {
    const r = rank.get(n.id)!;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r)!.push(n.id);
  }

  const nodeMap = new Map<string, ModuleNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // Compute cumulative Y offsets per layer based on max node height in each layer
  const sortedRanks = [...layers.keys()].sort((a, b) => a - b);
  const layerY = new Map<number, number>();
  let cumulativeY = 0;
  for (const r of sortedRanks) {
    layerY.set(r, cumulativeY);
    const ids = layers.get(r)!;
    const maxHeight = Math.max(...ids.map((id) => getNodeHeight(nodeMap.get(id)!)));
    cumulativeY += maxHeight + V_GAP;
  }

  const positions = new Map<string, { x: number; y: number }>();
  const maxLayerWidth = Math.max(...[...layers.values()].map((l) => l.length));
  const totalWidth = maxLayerWidth * (NODE_WIDTH + H_GAP) - H_GAP;

  for (const [r, ids] of layers) {
    const layerWidth = ids.length * (NODE_WIDTH + H_GAP) - H_GAP;
    const offsetX = (totalWidth - layerWidth) / 2;
    const y = layerY.get(r) ?? 0;
    ids.forEach((id, i) => {
      positions.set(id, {
        x: offsetX + i * (NODE_WIDTH + H_GAP),
        y,
      });
    });
  }

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
  }));

  return { nodes: layoutedNodes, edges };
}
