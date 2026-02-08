import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toolbar } from './components/GraphEditor/Toolbar';
import { GraphEditor } from './components/GraphEditor/GraphEditor';
import { ChunkPanel } from './components/ChunkVisualization/ChunkPanel';
import { useGraphStore } from './store/useGraphStore';
import { examples } from './data/examples';

export default function App() {
  const loadExample = useGraphStore((s) => s.loadExample);
  const runBundler = useGraphStore((s) => s.runBundler);
  const hasNodes = useGraphStore((s) => s.nodes.length > 0);

  useEffect(() => {
    if (!hasNodes) {
      const example = examples[1];
      loadExample(example.nodes, example.edges);
      queueMicrotask(() => runBundler());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-white font-sans">
        <Toolbar />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <GraphEditor />
          </div>
          <div className="w-[380px] shrink-0 min-w-0">
            <ChunkPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
