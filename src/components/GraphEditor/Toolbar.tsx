import { useState, useRef, useEffect } from 'react';
import { useGraphStore } from '../../store/useGraphStore';
import { examples } from '../../data/examples';

export function Toolbar() {
  const [showExamples, setShowExamples] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addModule = useGraphStore((s) => s.addModule);
  const runBundler = useGraphStore((s) => s.runBundler);
  const isBundling = useGraphStore((s) => s.isBundling);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const loadExample = useGraphStore((s) => s.loadExample);
  const nodes = useGraphStore((s) => s.nodes);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowExamples(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 p-3 bg-[#111111] border-b border-[#1a1a1a]">
      <h1 className="text-sm font-semibold text-white mr-4 tracking-tight">How Bundling Works</h1>

      <button
        onClick={() => addModule()}
        className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-md transition-colors"
      >
        + Add Module
      </button>

      <button
        onClick={runBundler}
        disabled={nodes.length === 0 || isBundling}
        className="px-3 py-1.5 bg-[#00dc82] hover:bg-[#00c472] disabled:bg-[#222222] disabled:text-[#666666] text-black text-xs font-medium rounded-md transition-colors"
      >
        {isBundling ? 'Bundling...' : 'Run Bundler'}
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="px-3 py-1.5 bg-transparent border border-[#333] hover:border-[#555] text-[#a0a0a0] hover:text-white text-xs font-medium rounded-md transition-colors"
        >
          Examples
        </button>

        {showExamples && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-[#1a1a1a] border border-[#222222] rounded-md z-50">
            {examples.map((example, i) => (
              <button
                key={i}
                onClick={() => {
                  loadExample(example.nodes, example.edges);
                  setShowExamples(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-[#222222] transition-colors first:rounded-t-md last:rounded-b-md"
              >
                <div className="text-white text-xs font-medium">{example.name}</div>
                <div className="text-[#666666] text-[11px] mt-0.5">{example.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={clearGraph}
        className="px-3 py-1.5 bg-transparent border border-[#333] hover:border-red-800 text-[#a0a0a0] hover:text-red-400 text-xs font-medium rounded-md transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
