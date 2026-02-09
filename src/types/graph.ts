import type { Node, Edge } from '@xyflow/react';

export interface ModuleNodeData {
  filename: string;
  isEntry: boolean;
  chunkColor?: string;
  chunkId?: number;
  isUnreachable?: boolean;
  exports?: string[];
  treeShaking?: {
    usedExports: string[];
    unusedExports: string[];
  };
  [key: string]: unknown;
}

export interface ImportEdgeData {
  importType: 'static' | 'dynamic';
  namedImports?: string[];
  bendPoints?: { x: number; y: number }[];
  [key: string]: unknown;
}

export type ModuleNode = Node<ModuleNodeData, 'module'>;
export type ImportEdge = Edge<ImportEdgeData>;

export interface Chunk {
  id: number;
  type: 'main' | 'async' | 'shared';
  modules: string[];
  color: string;
  reason: string;
  treeShakingStats?: {
    totalExports: number;
    usedExports: number;
    removedExports: number;
  };
}

export interface BundleResult {
  chunks: Chunk[];
  unreachableModules: string[];
  nodeTreeShaking?: Map<string, { usedExports: string[]; unusedExports: string[] }>;
}
