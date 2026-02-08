import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ModuleNode as ModuleNodeType } from '../../types/graph';
import { useGraphStore } from '../../store/useGraphStore';

const MAX_VISIBLE_EXPORTS = 6;

export function ModuleNode({ id, data }: NodeProps<ModuleNodeType>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.filename);
  const [isEditingExports, setIsEditingExports] = useState(false);
  const [addExportValue, setAddExportValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const exportsSectionRef = useRef<HTMLDivElement>(null);
  const renameNode = useGraphStore((s) => s.renameNode);
  const updateModuleExports = useGraphStore((s) => s.updateModuleExports);
  const highlightedChunkId = useGraphStore((s) => s.highlightedChunkId);
  const editingExportsNodeId = useGraphStore((s) => s.editingExportsNodeId);
  const clearEditingState = useGraphStore((s) => s.clearEditingState);

  const isHighlighted = highlightedChunkId === null || data.chunkId === highlightedChunkId;
  const isDimmed = highlightedChunkId !== null && data.chunkId !== highlightedChunkId;

  const exports = useMemo(() => data.exports ?? [], [data.exports]);
  const treeShaking = data.treeShaking;
  const hasExports = exports.length > 0;
  const visibleExports = exports.slice(0, MAX_VISIBLE_EXPORTS);
  const hiddenCount = exports.length - visibleExports.length;

  const usedCount = treeShaking?.usedExports.length ?? 0;
  const totalCount = exports.length;
  const unusedSet = new Set(treeShaking?.unusedExports ?? []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditingExports && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isEditingExports]);

  // Click-outside handler for exports editing
  useEffect(() => {
    if (!isEditingExports) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (exportsSectionRef.current && !exportsSectionRef.current.contains(e.target as Node)) {
        setIsEditingExports(false);
        setAddExportValue('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isEditingExports]);

  if (editingExportsNodeId === id) {
    queueMicrotask(() => {
      setAddExportValue('');
      setIsEditingExports(true);
      clearEditingState();
    });
  }

  const handleDoubleClick = useCallback(() => {
    setEditValue(data.filename);
    setIsEditing(true);
  }, [data.filename]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim()) {
      renameNode(id, editValue.trim());
    }
  }, [id, editValue, renameNode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleBlur();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(data.filename);
      }
    },
    [handleBlur, data.filename]
  );

  const handleRemoveExport = useCallback(
    (name: string) => {
      const updated = exports.filter((e) => e !== name);
      updateModuleExports(id, updated);
    },
    [id, exports, updateModuleExports]
  );

  const handleAddExport = useCallback(() => {
    const trimmed = addExportValue.trim();
    if (trimmed && !exports.includes(trimmed)) {
      updateModuleExports(id, [...exports, trimmed]);
    }
    setAddExportValue('');
  }, [id, addExportValue, exports, updateModuleExports]);

  const handleAddExportKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddExport();
      } else if (e.key === 'Escape') {
        setIsEditingExports(false);
        setAddExportValue('');
      }
    },
    [handleAddExport]
  );

  const chunkOverlay = data.chunkColor ? `${data.chunkColor}20` : 'transparent';

  // Summary pill color
  let pillColor = '#888';
  if (treeShaking && totalCount > 0) {
    if (usedCount === 0) pillColor = '#ef4444';
    else if (usedCount < totalCount) pillColor = '#22c55e';
    else pillColor = '#22c55e';
  }

  return (
    <div
      className="relative rounded-md border transition-all duration-300"
      style={{
        borderColor: data.isEntry ? '#facc15' : data.isUnreachable ? '#333' : (data.chunkColor ?? '#222222'),
        background: data.isUnreachable
          ? '#1a1a1a'
          : `linear-gradient(to bottom, #111111, #111111) padding-box, linear-gradient(to bottom, ${chunkOverlay}, ${chunkOverlay}) border-box`,
        backgroundColor: '#111111',
        opacity: isDimmed ? 0.3 : data.isUnreachable ? 0.5 : 1,
        transform: isHighlighted && !data.isUnreachable ? 'scale(1)' : 'scale(0.97)',
        minWidth: 180,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#555] !w-2.5 !h-2.5 !border-0" />

      {data.isEntry && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Entry
        </div>
      )}

      <div className="px-4 py-3">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-[#0a0a0a] text-white text-xs w-full px-1 py-0.5 rounded outline-none border border-[#333] focus:border-[#555]"
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            className="text-white text-xs cursor-text truncate"
            title="Double-click to rename"
          >
            {data.filename}
          </div>
        )}
      </div>

      {/* Exports section */}
      {(hasExports || isEditingExports) && (
        <>
          <div className="mx-3 border-t border-[#2a2a2a]" />
          <div
            ref={exportsSectionRef}
            className="px-4 py-2"
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!isEditingExports) {
                setAddExportValue('');
                setIsEditingExports(true);
              }
            }}
          >
            {isEditingExports ? (
              <div className="space-y-1">
                {exports.map((exp) => (
                  <div key={exp} className="export-chip">
                    <span className="export-keyword">export</span>
                    <span className="export-chip-name">{exp}</span>
                    <button
                      className="export-chip-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExport(exp);
                      }}
                      title={`Remove ${exp}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <input
                  ref={addInputRef}
                  value={addExportValue}
                  onChange={(e) => setAddExportValue(e.target.value)}
                  onKeyDown={handleAddExportKeyDown}
                  onBlur={() => {
                    if (addExportValue.trim()) handleAddExport();
                  }}
                  placeholder="add export..."
                  className="export-add-input"
                />
              </div>
            ) : (
              <>
                <div className="space-y-0.5">
                  {visibleExports.map((exp) => {
                    const isUnused = unusedSet.has(exp);
                    return (
                      <div
                        key={exp}
                        className={`export-item ${isUnused ? 'export-unused' : ''}`}
                        style={
                          treeShaking
                            ? { color: isUnused ? '#555' : '#e0e0e0' }
                            : { color: '#888' }
                        }
                      >
                        <span className="export-keyword">export</span>
                        {exp}
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <div className="text-[10px] text-[#555] pl-4">+{hiddenCount} more</div>
                  )}
                </div>
                {treeShaking && totalCount > 0 && (
                  <div
                    className="mt-1.5 text-[10px] text-center font-medium rounded-full px-2 py-0.5"
                    style={{
                      color: pillColor,
                      backgroundColor: `${pillColor}15`,
                    }}
                  >
                    {usedCount}/{totalCount} used
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {!hasExports && !isEditingExports && (
        <div
          className="px-4 pb-2 text-[10px] text-[#444] cursor-pointer hover:text-[#666] transition-colors"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setAddExportValue('');
            setIsEditingExports(true);
          }}
          title="Double-click to add exports"
        >
          + add exports
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-[#555] !w-2.5 !h-2.5 !border-0" />
    </div>
  );
}
