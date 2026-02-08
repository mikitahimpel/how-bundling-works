import { rollup } from '@rollup/browser';
import type { ModuleNode, ImportEdge, BundleResult, Chunk } from '../types/graph';
import { getChunkColor } from '../utils/colors';

function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

function generateVirtualModules(
  nodes: ModuleNode[],
  edges: ImportEdge[],
): Record<string, string> {
  const modules: Record<string, string> = {};

  const filenameCount = new Map<string, number>();
  for (const node of nodes) {
    filenameCount.set(node.data.filename, (filenameCount.get(node.data.filename) ?? 0) + 1);
  }

  const nodeIdToModuleId = new Map<string, string>();
  const seenFilenames = new Map<string, number>();
  for (const node of nodes) {
    let moduleId = node.data.filename;
    if ((filenameCount.get(node.data.filename) ?? 0) > 1) {
      const count = seenFilenames.get(node.data.filename) ?? 0;
      if (count > 0) {
        moduleId = `${node.data.filename}?id=${node.id}`;
      }
      seenFilenames.set(node.data.filename, count + 1);
    }
    nodeIdToModuleId.set(node.id, moduleId);
  }

  for (const node of nodes) {
    const moduleId = nodeIdToModuleId.get(node.id)!;
    const lines: string[] = [];

    const outEdges = edges.filter((e) => e.source === node.id);
    let importIdx = 0;
    for (const edge of outEdges) {
      const targetModuleId = nodeIdToModuleId.get(edge.target);
      if (!targetModuleId) continue;

      const importPath = `./${targetModuleId}`;
      const importType = edge.data?.importType ?? 'static';
      const namedImports = edge.data?.namedImports ?? [];
      const suffix = importIdx++;

      if (importType === 'static') {
        if (namedImports.length === 0) {
          lines.push(`import '${importPath}';`);
        } else {
          const hasDefault = namedImports.includes('default');
          const nonDefault = namedImports.filter((n) => n !== 'default');
          const defAlias = `_def${suffix}`;

          if (hasDefault) {
            if (nonDefault.length > 0) {
              lines.push(`import ${defAlias}, { ${nonDefault.join(', ')} } from '${importPath}';`);
              lines.push(`console.log(${defAlias}, ${nonDefault.join(', ')});`);
            } else {
              lines.push(`import ${defAlias} from '${importPath}';`);
              lines.push(`console.log(${defAlias});`);
            }
          } else {
            lines.push(`import { ${namedImports.join(', ')} } from '${importPath}';`);
            lines.push(`console.log(${namedImports.join(', ')});`);
          }
        }
      } else {
        if (namedImports.length === 0) {
          lines.push(`import('${importPath}');`);
        } else {
          const accessors = namedImports.map((n) =>
            n === 'default' ? 'm.default' : `m.${n}`
          ).join(', ');
          lines.push(`import('${importPath}').then(m => { ${accessors}; });`);
        }
      }
    }

    const exports = node.data.exports ?? [];
    for (const exp of exports) {
      if (exp === 'default') {
        lines.push(`export default function _default() {}`);
      } else if (isValidIdentifier(exp)) {
        lines.push(`export function ${exp}() {}`);
      } else {
        const safeName = `_export_${exp.replace(/[^a-zA-Z0-9_$]/g, '_')}`;
        lines.push(`const ${safeName} = 1; export { ${safeName} as "${exp}" };`);
      }
    }

    modules[moduleId] = lines.join('\n');
  }

  return modules;
}

export async function runBundler(
  nodes: ModuleNode[],
  edges: ImportEdge[],
): Promise<BundleResult> {
  const entryNode = nodes.find((n) => n.data.isEntry);
  if (!entryNode) {
    return { chunks: [], unreachableModules: nodes.map((n) => n.id) };
  }

  const virtualModules = generateVirtualModules(nodes, edges);

  const moduleIdToNodeId = new Map<string, string>();
  const nodeIdToModuleId = new Map<string, string>();
  for (const node of nodes) {
    for (const modId of Object.keys(virtualModules)) {
      const baseFilename = modId.split('?')[0];
      if (baseFilename === node.data.filename) {
        if (modId === node.data.filename || modId.includes(`?id=${node.id}`)) {
          moduleIdToNodeId.set(modId, node.id);
          nodeIdToModuleId.set(node.id, modId);
        }
      }
    }
  }

  const entryModuleId = nodeIdToModuleId.get(entryNode.id);
  if (!entryModuleId) {
    return { chunks: [], unreachableModules: nodes.map((n) => n.id) };
  }

  try {
    const bundle = await rollup({
      input: entryModuleId,
      plugins: [
        {
          name: 'virtual-graph',
          resolveId(source: string) {
            if (virtualModules[source] != null) return source;
            const resolved = source.replace(/^\.\//, '');
            if (virtualModules[resolved] != null) return resolved;
            return null;
          },
          load(id: string) {
            return virtualModules[id] ?? null;
          },
        },
      ],
    });

    const { output } = await bundle.generate({ format: 'es' });
    await bundle.close();

    const chunks: Chunk[] = [];
    const allIncludedModuleIds = new Set<string>();
    let chunkIdCounter = 0;

    for (const item of output) {
      if (item.type !== 'chunk') continue;

      const chunkModuleIds = Object.keys(item.modules);
      const chunkNodeIds: string[] = [];

      for (const modId of chunkModuleIds) {
        allIncludedModuleIds.add(modId);
        const nodeId = moduleIdToNodeId.get(modId);
        if (nodeId) chunkNodeIds.push(nodeId);
      }

      if (chunkNodeIds.length === 0) continue;

      let type: 'main' | 'async' | 'shared';
      if (item.isEntry) {
        type = 'main';
      } else if (item.isDynamicEntry) {
        type = 'async';
      } else {
        type = 'shared';
      }

      let reason: string;
      if (type === 'main') {
        reason = 'Entry point and its static dependencies form the main bundle.';
      } else if (type === 'async') {
        const facadeNodeId = item.facadeModuleId
          ? moduleIdToNodeId.get(item.facadeModuleId)
          : undefined;
        const facadeNode = facadeNodeId
          ? nodes.find((n) => n.id === facadeNodeId)
          : undefined;
        const facadeName = facadeNode?.data.filename ?? item.facadeModuleId ?? 'unknown';
        reason = `"${facadeName}" is loaded with a dynamic import(), so it becomes a separate async chunk that is only downloaded when needed.`;
      } else {
        const moduleNames = chunkNodeIds.map((nid) => {
          const n = nodes.find((node) => node.id === nid);
          return n?.data.filename ?? nid;
        });
        reason = `${moduleNames.join(', ')} ${chunkNodeIds.length === 1 ? 'is' : 'are'} shared by multiple chunks to avoid duplication.`;
      }

      const chunkId = chunkIdCounter++;
      const chunk: Chunk = {
        id: chunkId,
        type,
        modules: chunkNodeIds,
        color: getChunkColor(chunkId),
        reason,
      };

      let totalExports = 0;
      let usedExports = 0;
      for (const modId of chunkModuleIds) {
        const modInfo = item.modules[modId];
        if (modInfo) {
          totalExports += modInfo.renderedExports.length + modInfo.removedExports.length;
          usedExports += modInfo.renderedExports.length;
        }
      }
      chunk.treeShakingStats = {
        totalExports,
        usedExports,
        removedExports: totalExports - usedExports,
      };

      chunks.push(chunk);
    }

    const nodeTreeShaking = new Map<string, { usedExports: string[]; unusedExports: string[] }>();
    for (const item of output) {
      if (item.type !== 'chunk') continue;
      for (const [modId, modInfo] of Object.entries(item.modules)) {
        const nodeId = moduleIdToNodeId.get(modId);
        if (!nodeId || nodeTreeShaking.has(nodeId)) continue;
        nodeTreeShaking.set(nodeId, {
          usedExports: modInfo.renderedExports,
          unusedExports: modInfo.removedExports,
        });
      }
    }

    const unreachableModules = nodes
      .filter((n) => !allIncludedModuleIds.has(nodeIdToModuleId.get(n.id) ?? ''))
      .map((n) => n.id);

    return { chunks, unreachableModules, nodeTreeShaking };
  } catch (error) {
    console.error('Rollup bundling error:', error);
    return { chunks: [], unreachableModules: nodes.map((n) => n.id) };
  }
}
