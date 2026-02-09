import type { ModuleNode, ImportEdge } from '../types/graph';

interface Example {
  name: string;
  description: string;
  learningPoint: string;
  nodes: ModuleNode[];
  edges: ImportEdge[];
}

export const examples: Example[] = [
  {
    name: 'Basic App (Single Chunk)',
    description: 'All static imports — everything ends up in one chunk.',
    learningPoint:
      'When every import is a regular static import, the bundler puts all modules into a single output file. This is the simplest case.',
    nodes: [
      {
        id: 'app',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'App.tsx', isEntry: true, exports: ['default'] },
      },
      {
        id: 'header',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Header.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'footer',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Footer.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'utils',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'utils.ts', isEntry: false, exports: ['cn', 'clamp'] },
      },
    ],
    edges: [
      {
        id: 'app-header',
        source: 'app',
        target: 'header',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['default'] },
      },
      {
        id: 'app-footer',
        source: 'app',
        target: 'footer',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['default'] },
      },
      {
        id: 'header-utils',
        source: 'header',
        target: 'utils',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['cn'] },
      },
    ],
  },
  {
    name: 'Lazy-Loaded Routes',
    description: 'Dynamic imports for Dashboard and Settings create separate async chunks.',
    learningPoint:
      'Dynamic import() tells the bundler to split code at that boundary. Each dynamically imported module becomes its own async chunk, loaded only when the user navigates to that route.',
    nodes: [
      {
        id: 'app',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'App.tsx', isEntry: true, exports: ['default'] },
      },
      {
        id: 'nav',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Nav.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'dashboard',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Dashboard.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'chart',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Chart.tsx', isEntry: false, exports: ['default', 'ChartOptions'] },
      },
      {
        id: 'settings',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Settings.tsx', isEntry: false, exports: ['default'] },
      },
    ],
    edges: [
      {
        id: 'app-nav',
        source: 'app',
        target: 'nav',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['default'] },
      },
      {
        id: 'app-dashboard',
        source: 'app',
        target: 'dashboard',
        sourceHandle: 'source-dynamic',
        type: 'dynamic-import',
        data: { importType: 'dynamic', namedImports: ['default'] },
      },
      {
        id: 'app-settings',
        source: 'app',
        target: 'settings',
        sourceHandle: 'source-dynamic',
        type: 'dynamic-import',
        data: { importType: 'dynamic', namedImports: ['default'] },
      },
      {
        id: 'dashboard-chart',
        source: 'dashboard',
        target: 'chart',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['default'] },
      },
    ],
  },
  {
    name: 'Shared Vendor Code',
    description: 'utils.ts is used by multiple async chunks, so it gets extracted into a shared chunk.',
    learningPoint:
      'When a module is imported by two or more async chunks, the bundler extracts it into a shared chunk. This prevents the same code from being downloaded twice.',
    nodes: [
      {
        id: 'app',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'App.tsx', isEntry: true, exports: ['default'] },
      },
      {
        id: 'home',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Home.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'profile',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'Profile.tsx', isEntry: false, exports: ['default'] },
      },
      {
        id: 'utils',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'utils.ts', isEntry: false, exports: ['formatDate', 'parseDate', 'cn'] },
      },
      {
        id: 'api',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'api.ts', isEntry: false, exports: ['fetchUser', 'fetchPosts'] },
      },
    ],
    edges: [
      {
        id: 'app-home',
        source: 'app',
        target: 'home',
        sourceHandle: 'source-dynamic',
        type: 'dynamic-import',
        data: { importType: 'dynamic', namedImports: ['default'] },
      },
      {
        id: 'app-profile',
        source: 'app',
        target: 'profile',
        sourceHandle: 'source-dynamic',
        type: 'dynamic-import',
        data: { importType: 'dynamic', namedImports: ['default'] },
      },
      {
        id: 'home-utils',
        source: 'home',
        target: 'utils',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['formatDate', 'cn'] },
      },
      {
        id: 'profile-utils',
        source: 'profile',
        target: 'utils',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['formatDate'] },
      },
      {
        id: 'profile-api',
        source: 'profile',
        target: 'api',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['fetchUser'] },
      },
    ],
  },
  {
    name: 'Tree Shaking',
    description: 'Named imports allow the bundler to remove unused exports from modules.',
    learningPoint:
      'Tree shaking eliminates dead code by analyzing which exports are actually imported. Named imports (import { x }) let the bundler know exactly what\'s used, while star imports (import *) defeat tree shaking because everything might be needed.',
    nodes: [
      {
        id: 'app',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'App.tsx', isEntry: true, exports: ['render'] },
      },
      {
        id: 'utils',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'utils.ts', isEntry: false, exports: ['formatDate', 'parseDate', 'slugify', 'debounce', 'throttle'] },
      },
      {
        id: 'validators',
        type: 'module',
        position: { x: 0, y: 0 },
        data: { filename: 'validators.ts', isEntry: false, exports: ['validateEmail', 'validatePhone', 'validateAddress'] },
      },
    ],
    edges: [
      {
        id: 'app-utils',
        source: 'app',
        target: 'utils',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['formatDate', 'debounce'] },
      },
      {
        id: 'app-validators',
        source: 'app',
        target: 'validators',
        sourceHandle: 'source-static',
        type: 'static-import',
        data: { importType: 'static', namedImports: ['validateEmail'] },
      },
    ],
  },
];
