import ELK from 'elkjs/lib/elk.bundled.js';
import type { ModuleNode, ImportEdge } from '../types/graph';

const NODE_WIDTH = 180;
const BASE_NODE_HEIGHT = 60;
const EXPORT_ROW_HEIGHT = 18;

function getNodeHeight(node: ModuleNode): number {
  const exportsCount = node.data.exports?.length ?? 0;
  if (exportsCount === 0) return BASE_NODE_HEIGHT;
  return BASE_NODE_HEIGHT + exportsCount * EXPORT_ROW_HEIGHT;
}

const elk = new ELK();

export async function getLayoutedElements(
  nodes: ModuleNode[],
  edges: ImportEdge[],
): Promise<{ nodes: ModuleNode[]; edges: ImportEdge[] }> {
  if (nodes.length === 0) return { nodes, edges };

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '140',
      'elk.layered.spacing.nodeNodeBetweenLayers': '180',
      'elk.spacing.edgeNode': '60',
      'elk.spacing.edgeEdge': '30',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: nodes.map((node) => {
      const h = getNodeHeight(node);
      return {
        id: node.id,
        width: NODE_WIDTH,
        height: h,
        ports: [
          {
            id: `${node.id}__source-static`,
            properties: {
              'port.side': 'SOUTH',
              'port.index': '0',
            },
            x: NODE_WIDTH * 0.4,
            y: h,
          },
          {
            id: `${node.id}__source-dynamic`,
            properties: {
              'port.side': 'SOUTH',
              'port.index': '1',
            },
            x: NODE_WIDTH * 0.6,
            y: h,
          },
          {
            id: `${node.id}__target`,
            properties: {
              'port.side': 'NORTH',
              'port.index': '0',
            },
            x: NODE_WIDTH / 2,
            y: 0,
          },
        ],
        properties: {
          'portConstraints': 'FIXED_POS',
        },
      };
    }),
    edges: edges.map((edge) => {
      const isDynamic = edge.data?.importType === 'dynamic';
      const sourcePort = isDynamic ? 'source-dynamic' : 'source-static';
      return {
        id: edge.id,
        sources: [`${edge.source}__${sourcePort}`],
        targets: [`${edge.target}__target`],
      };
    }),
  };

  const layout = await elk.layout(elkGraph);

  const nodePositions = new Map<string, { x: number; y: number }>();
  for (const child of layout.children ?? []) {
    nodePositions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
  }

  const edgeBendPoints = new Map<string, { x: number; y: number }[]>();
  for (const edge of layout.edges ?? []) {
    const sections = (edge as { sections?: { bendPoints?: { x: number; y: number }[] }[] }).sections;
    if (sections?.[0]?.bendPoints) {
      edgeBendPoints.set(edge.id, sections[0].bendPoints);
    }
  }

  const layoutedNodes = nodes.map((node) => ({
    ...node,
    position: nodePositions.get(node.id) ?? { x: 0, y: 0 },
  }));

  const layoutedEdges = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data!,
      bendPoints: edgeBendPoints.get(edge.id),
    },
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
}
