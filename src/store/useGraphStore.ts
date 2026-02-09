import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import type { ModuleNode, ImportEdge, BundleResult } from '../types/graph';
import { runBundler } from '../engine/bundler';
import { getLayoutedElements } from '../utils/layout';

let nodeIdCounter = 0;

interface GraphState {
  nodes: ModuleNode[];
  edges: ImportEdge[];
  bundleResult: BundleResult | null;
  isBundling: boolean;
  highlightedChunkId: number | null;
  editingExportsNodeId: string | null;
  editingImportsEdgeId: string | null;

  onNodesChange: OnNodesChange<ModuleNode>;
  onEdgesChange: OnEdgesChange<ImportEdge>;
  onConnect: OnConnect;

  addModule: (position?: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  renameNode: (nodeId: string, filename: string) => void;
  setEntryPoint: (nodeId: string) => void;
  toggleEdgeType: (edgeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateModuleExports: (nodeId: string, exports: string[]) => void;
  updateEdgeNamedImports: (edgeId: string, namedImports: string[]) => void;
  triggerEditExports: (nodeId: string) => void;
  triggerEditImports: (edgeId: string) => void;
  clearEditingState: () => void;
  runBundler: () => Promise<void>;
  clearGraph: () => void;
  loadExample: (nodes: ModuleNode[], edges: ImportEdge[]) => Promise<void>;
  setHighlightedChunkId: (chunkId: number | null) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  bundleResult: null,
  isBundling: false,
  highlightedChunkId: null,
  editingExportsNodeId: null,
  editingImportsEdgeId: null,

  onNodesChange: (changes) => {
    const hasDragEnd = changes.some(
      (c) => c.type === 'position' && c.dragging === false
    );
    let updatedNodes = applyNodeChanges(changes, get().nodes) as ModuleNode[];
    if (hasDragEnd) {
      set({
        nodes: updatedNodes,
        edges: get().edges.map((e) => ({
          ...e,
          data: { ...e.data!, bendPoints: undefined },
        })),
      });
      return;
    }
    set({ nodes: updatedNodes });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as ImportEdge[] });
  },

  onConnect: (connection) => {
    const isDynamic = connection.sourceHandle === 'source-dynamic';
    const newEdge: ImportEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      sourceHandle: isDynamic ? 'source-dynamic' : 'source-static',
      type: isDynamic ? 'dynamic-import' : 'static-import',
      data: { importType: isDynamic ? 'dynamic' : 'static', namedImports: ['default'] },
    } as ImportEdge;
    set({ edges: addEdge(newEdge, get().edges) as ImportEdge[] });
  },

  addModule: (position) => {
    const id = `module-${++nodeIdCounter}`;
    const newNode: ModuleNode = {
      id,
      type: 'module',
      position: position ?? { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { filename: `file${nodeIdCounter}.ts`, isEntry: get().nodes.length === 0, exports: ['default'] },
    };
    set({ nodes: [...get().nodes, newNode] });
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      bundleResult: null,
    });
  },

  renameNode: (nodeId, filename) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, filename } } : n
      ),
    });
  },

  setEntryPoint: (nodeId) => {
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        data: { ...n.data, isEntry: n.id === nodeId },
      })),
    });
  },

  toggleEdgeType: (edgeId) => {
    set({
      edges: get().edges.map((e) => {
        if (e.id !== edgeId) return e;
        const newType = e.data?.importType === 'static' ? 'dynamic' : 'static';
        return {
          ...e,
          type: newType === 'static' ? 'static-import' : 'dynamic-import',
          sourceHandle: newType === 'static' ? 'source-static' : 'source-dynamic',
          data: { ...e.data, importType: newType },
        };
      }),
    });
  },

  removeEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
      bundleResult: null,
    });
  },

  updateModuleExports: (nodeId, exports) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, exports } } : n
      ),
    });
  },

  updateEdgeNamedImports: (edgeId, namedImports) => {
    set({
      edges: get().edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data!, namedImports } } : e
      ),
    });
  },

  triggerEditExports: (nodeId) => {
    set({ editingExportsNodeId: nodeId, editingImportsEdgeId: null });
  },

  triggerEditImports: (edgeId) => {
    set({ editingImportsEdgeId: edgeId, editingExportsNodeId: null });
  },

  clearEditingState: () => {
    set({ editingExportsNodeId: null, editingImportsEdgeId: null });
  },

  runBundler: async () => {
    const { nodes, edges } = get();
    set({ isBundling: true });

    try {
      const result = await runBundler(nodes, edges);

      const chunkMap = new Map<string, { color: string; chunkId: number }>();
      for (const chunk of result.chunks) {
        for (const modId of chunk.modules) {
          chunkMap.set(modId, { color: chunk.color, chunkId: chunk.id });
        }
      }

      const updatedNodes = nodes.map((n) => {
        const chunkInfo = chunkMap.get(n.id);
        const isUnreachable = result.unreachableModules.includes(n.id);
        const treeShaking = result.nodeTreeShaking?.get(n.id);
        return {
          ...n,
          data: {
            ...n.data,
            chunkColor: chunkInfo?.color,
            chunkId: chunkInfo?.chunkId,
            isUnreachable,
            treeShaking: treeShaking ?? undefined,
          },
        };
      });

      set({ nodes: updatedNodes, bundleResult: result, isBundling: false });
    } catch {
      set({ isBundling: false });
    }
  },

  clearGraph: () => {
    nodeIdCounter = 0;
    set({ nodes: [], edges: [], bundleResult: null, isBundling: false, highlightedChunkId: null, editingExportsNodeId: null, editingImportsEdgeId: null });
  },

  loadExample: async (nodes, edges) => {
    nodeIdCounter = nodes.length;
    const { nodes: layoutedNodes, edges: layoutedEdges } = await getLayoutedElements(nodes, edges);

    set({
      nodes: layoutedNodes,
      edges: layoutedEdges,
      bundleResult: null,
      highlightedChunkId: null,
    });
  },

  setHighlightedChunkId: (chunkId) => {
    set({ highlightedChunkId: chunkId });
  },
}));
