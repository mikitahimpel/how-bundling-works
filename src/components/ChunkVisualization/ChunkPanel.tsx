import { useGraphStore } from '../../store/useGraphStore';
import { ChunkCard } from './ChunkCard';

export function ChunkPanel() {
  const bundleResult = useGraphStore((s) => s.bundleResult);
  const nodes = useGraphStore((s) => s.nodes);

  const nodeInfo = nodes.map((n) => ({
    id: n.id,
    filename: n.data.filename,
    treeShaking: n.data.treeShaking,
    exports: n.data.exports,
  }));

  let totalRemoved = 0;
  let modulesWithRemoved = 0;
  if (bundleResult) {
    for (const chunk of bundleResult.chunks) {
      if (chunk.treeShakingStats) {
        totalRemoved += chunk.treeShakingStats.removedExports;
      }
    }
    const seen = new Set<string>();
    for (const node of nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      if (node.data.treeShaking && node.data.treeShaking.unusedExports.length > 0) {
        modulesWithRemoved++;
      }
    }
  }

  return (
    <div className="h-full bg-[#111111] flex flex-col">
      <div className="p-4 border-b border-[#1a1a1a]">
        <h2 className="text-white font-semibold text-xs uppercase tracking-wider">Chunk Results</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!bundleResult ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-[#888888] text-xs mb-2">
              No bundle results yet.
            </p>
            <p className="text-[#666666] text-[11px]">
              Add some modules, connect them with imports, and click
              <span className="text-[#00dc82] font-medium"> "Run Bundler" </span>
              to see how your code gets split into chunks.
            </p>
          </div>
        ) : bundleResult.chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-[#888888] text-xs">
              No entry point found. Right-click a module and select "Set as Entry Point".
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bundleResult.chunks.map((chunk) => (
              <ChunkCard key={chunk.id} chunk={chunk} nodes={nodeInfo} />
            ))}

            {bundleResult.unreachableModules.length > 0 && (
              <div className="rounded-md border border-[#222222] p-4 bg-[#111111]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#444]" />
                  <span className="text-[#888888] font-medium text-xs">
                    Unreachable Modules
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {bundleResult.unreachableModules.map((modId) => {
                    const node = nodeInfo.find((n) => n.id === modId);
                    return (
                      <div key={modId} className="text-[#666666] text-xs pl-2 border-l border-[#333]">
                        {node?.filename ?? modId}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[#666666] text-[11px]">
                  These modules are not reachable from the entry point and will not be included in any bundle.
                </p>
              </div>
            )}

            <div className="mt-6 p-3 bg-[#1a1a1a] rounded-md border border-[#222222]">
              <p className="text-[#a0a0a0] text-[11px] leading-relaxed">
                <span className="font-semibold text-white">Summary: </span>
                {bundleResult.chunks.length} chunk{bundleResult.chunks.length !== 1 ? 's' : ''} generated from {nodes.length} module{nodes.length !== 1 ? 's' : ''}.
                {bundleResult.chunks.some((c) => c.type === 'shared') &&
                  ' Shared dependencies were automatically extracted to avoid duplication.'}
                {totalRemoved > 0 &&
                  ` Tree shaking removed ${totalRemoved} unused export${totalRemoved !== 1 ? 's' : ''} across ${modulesWithRemoved} module${modulesWithRemoved !== 1 ? 's' : ''}.`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
