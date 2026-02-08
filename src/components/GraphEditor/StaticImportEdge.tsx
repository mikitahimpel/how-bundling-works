import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import type { ImportEdge } from '../../types/graph';
import { useGraphStore } from '../../store/useGraphStore';

function formatBadgeText(namedImports?: string[]): string {
  if (!namedImports || namedImports.length === 0) return 'import';
  if (namedImports.length <= 2) return `import { ${namedImports.join(', ')} }`;
  return `import { ${namedImports.slice(0, 2).join(', ')}, +${namedImports.length - 2} }`;
}

export function StaticImportEdge(props: EdgeProps<ImportEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const toggleEdgeType = useGraphStore((s) => s.toggleEdgeType);
  const updateEdgeNamedImports = useGraphStore((s) => s.updateEdgeNamedImports);
  const editingImportsEdgeId = useGraphStore((s) => s.editingImportsEdgeId);
  const clearEditingState = useGraphStore((s) => s.clearEditingState);
  const targetNode = useGraphStore((s) => s.nodes.find((n) => n.id === props.target));
  const targetExports = targetNode?.data?.exports ?? [];

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  useEffect(() => {
    if (!isPopoverOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isPopoverOpen]);

  if (editingImportsEdgeId === id) {
    queueMicrotask(() => {
      setIsPopoverOpen(true);
      clearEditingState();
    });
  }

  const handleToggleImport = useCallback(
    (name: string) => {
      const current = data?.namedImports ?? [];
      const updated = current.includes(name)
        ? current.filter((n) => n !== name)
        : [...current, name];
      updateEdgeNamedImports(id, updated);
    },
    [id, data?.namedImports, updateEdgeNamedImports]
  );

  const namedImports = data?.namedImports ?? [];
  const namedImportsSet = new Set(namedImports);

  // Find stale imports (in namedImports but not in target's exports)
  const targetExportsSet = new Set(targetExports);
  const staleImports = namedImports.filter((name) => !targetExportsSet.has(name));

  const badgeText = formatBadgeText(data?.namedImports);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#555',
          strokeWidth: 2,
        }}
        markerEnd="url(#arrow)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          <button
            className="edge-label-badge"
            style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              color: '#a0a0a0',
              whiteSpace: 'nowrap',
            }}
            onClick={() => toggleEdgeType(id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsPopoverOpen(true);
            }}
          >
            {badgeText}
          </button>
          {isPopoverOpen && (
            <div ref={popoverRef} className="import-checkbox-popover" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4, zIndex: 10 }}>
              <div className="import-popover-header">Named Imports</div>
              {targetExports.length === 0 && staleImports.length === 0 && (
                <div className="import-popover-empty">No exports declared on target module</div>
              )}
              {targetExports.map((exp) => (
                <label key={exp} className="import-popover-item">
                  <input
                    type="checkbox"
                    className="import-popover-checkbox"
                    checked={namedImportsSet.has(exp)}
                    onChange={() => handleToggleImport(exp)}
                  />
                  <span className="export-keyword">export</span>
                  <span>{exp}</span>
                </label>
              ))}
              {staleImports.map((exp) => (
                <label key={exp} className="import-popover-item stale">
                  <input
                    type="checkbox"
                    className="import-popover-checkbox"
                    checked
                    onChange={() => handleToggleImport(exp)}
                  />
                  <span className="export-keyword">export</span>
                  <span>{exp}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
