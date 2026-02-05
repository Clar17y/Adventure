'use client';

import { useState, useEffect } from 'react';
import { PixelCard } from '@/components/PixelCard';
import { PixelButton } from '@/components/PixelButton';
import { Slider } from '@/components/ui/Slider';
import { Pickaxe, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { GATHERING_CONSTANTS } from '@adventure/shared';

interface ResourceNode {
  id: string;
  name: string;
  icon?: string;
  imageSrc?: string;
  levelRequired: number;
  baseYield: number;
  zoneId: string;
  zoneName: string;
  remainingCapacity: number;
  maxCapacity: number;
  sizeName: string;
}

interface GatheringLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success';
}

interface GatheringProps {
  skillName: string;
  skillLevel: number;
  efficiency: number;
  nodes: ResourceNode[];
  currentZoneId: string | null;
  availableTurns: number;
  gatheringLog: GatheringLog[];
  onStartGathering: (nodeId: string, turns: number) => void;
  isRecovering?: boolean;
  recoveryCost?: number | null;
}

export function Gathering({
  skillName,
  skillLevel,
  efficiency,
  nodes,
  currentZoneId,
  availableTurns,
  gatheringLog,
  onStartGathering,
  isRecovering = false,
  recoveryCost,
}: GatheringProps) {
  const [selectedNode, setSelectedNode] = useState<ResourceNode | null>(nodes[0] || null);
  const [turnInvestment, setTurnInvestment] = useState([Math.min(100, availableTurns)]);

  // Sync selected node with updated data from props (e.g., after mining reduces capacity)
  useEffect(() => {
    if (!selectedNode) return;

    const updatedNode = nodes.find((n) => n.id === selectedNode.id);
    if (!updatedNode) {
      // Node was depleted/removed - select first available or null
      setSelectedNode(nodes[0] || null);
    } else if (updatedNode.remainingCapacity !== selectedNode.remainingCapacity) {
      // Node still exists but capacity changed - update with fresh data
      setSelectedNode(updatedNode);
    }
  }, [nodes, selectedNode]);

  const calculateYield = (node: ResourceNode, turns: number) => {
    // Match backend formula exactly: linear +10% per level above requirement
    const maxActionsByTurns = Math.floor(turns / GATHERING_CONSTANTS.BASE_TURN_COST);
    const levelsAbove = Math.max(0, skillLevel - node.levelRequired);
    const yieldMultiplier = 1 + levelsAbove * GATHERING_CONSTANTS.YIELD_MULTIPLIER_PER_LEVEL;
    const baseYield = Math.max(node.baseYield, GATHERING_CONSTANTS.BASE_YIELD);
    const yieldPerAction = Math.floor(baseYield * yieldMultiplier);

    // Cap by remaining capacity
    const maxActionsByCapacity = Math.ceil(node.remainingCapacity / yieldPerAction);
    const actions = Math.min(maxActionsByTurns, maxActionsByCapacity);
    const totalYield = Math.min(actions * yieldPerAction, node.remainingCapacity);
    const willDeplete = totalYield >= node.remainingCapacity;

    return { actions, baseYield, yieldMultiplier, totalYield, willDeplete };
  };

  const yieldInfo = selectedNode ? calculateYield(selectedNode, turnInvestment[0]) : null;

  return (
    <div className="space-y-4">
      {/* Knockout Banner */}
      {isRecovering && (
        <div className="bg-[var(--rpg-red)]/20 border border-[var(--rpg-red)] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-[var(--rpg-red)] flex-shrink-0" />
            <div>
              <div className="font-bold text-[var(--rpg-red)]">Knocked Out</div>
              <div className="text-sm text-[var(--rpg-text-secondary)]">
                You must recover before gathering. Cost: {recoveryCost?.toLocaleString()} turns
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--rpg-text-primary)]">{skillName}</h2>
          <div className="px-2 py-1 bg-[var(--rpg-gold)] rounded text-[var(--rpg-background)] text-sm font-bold">
            Lv. {skillLevel}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--rpg-text-secondary)]">Efficiency</div>
          <div className="text-sm font-bold text-[var(--rpg-green-light)]">{efficiency}%</div>
        </div>
      </div>

      {/* Resource Nodes */}
      <div className="space-y-2">
        <h3 className="font-semibold text-[var(--rpg-text-primary)] text-sm">Discovered Veins</h3>
        {nodes.length === 0 ? (
          <div className="text-sm text-[var(--rpg-text-secondary)] text-center py-4">
            No resource veins discovered. Explore to find some!
          </div>
        ) : nodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const canGather = skillLevel >= node.levelRequired;
          const isInZone = currentZoneId === node.zoneId;
          const canSelect = canGather && isInZone;
          const capacityPct = Math.round((node.remainingCapacity / node.maxCapacity) * 100);

          return (
            <button
              key={node.id}
              onClick={() => canSelect && setSelectedNode(node)}
              disabled={!canSelect}
              className={`w-full text-left transition-all ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <PixelCard padding="sm" className={isSelected ? 'border-[var(--rpg-gold)]' : ''}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[var(--rpg-background)] flex items-center justify-center text-2xl flex-shrink-0">
                    {node.imageSrc ? (
                      <img
                        src={node.imageSrc}
                        alt={node.name}
                        className="w-10 h-10 object-contain image-rendering-pixelated"
                      />
                    ) : (
                      node.icon
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <h4 className="font-semibold text-[var(--rpg-text-primary)] text-sm">
                        {node.sizeName} {node.name}
                      </h4>
                      <span className="text-xs text-[var(--rpg-text-secondary)]">Lv. {node.levelRequired}</span>
                    </div>
                    {/* Zone indicator */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={10} className={isInZone ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-text-secondary)]'} />
                      <span className={`text-xs ${isInZone ? 'text-[var(--rpg-green-light)]' : 'text-[var(--rpg-text-secondary)]'}`}>
                        {node.zoneName}
                        {!isInZone && ' (travel here to mine)'}
                      </span>
                    </div>
                    {/* Capacity bar */}
                    <div className="mt-1.5 h-2 bg-[var(--rpg-background)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--rpg-gold)] transition-all"
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--rpg-text-secondary)]">
                        {node.remainingCapacity} / {node.maxCapacity} remaining
                      </span>
                      <span className="text-xs text-[var(--rpg-gold)]">
                        {Math.max(node.baseYield, GATHERING_CONSTANTS.BASE_YIELD)}/action
                      </span>
                    </div>
                  </div>
                </div>
              </PixelCard>
            </button>
          );
        })}
      </div>

      {/* Turn Investment */}
      {selectedNode && (
        <PixelCard>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-[var(--rpg-text-primary)]">Turn Investment</h3>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--rpg-gold)] font-mono">{turnInvestment[0]}</div>
                <div className="text-xs text-[var(--rpg-text-secondary)]">of {availableTurns.toLocaleString()} available</div>
              </div>
            </div>

            <Slider
              value={turnInvestment}
              onValueChange={setTurnInvestment}
              min={10}
              max={Math.min(1000, availableTurns)}
              step={10}
              className="w-full"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setTurnInvestment([Math.min(100, availableTurns)])}
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
              >
                100
              </button>
              <button
                onClick={() => setTurnInvestment([Math.min(250, availableTurns)])}
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
              >
                250
              </button>
              <button
                onClick={() => setTurnInvestment([Math.min(500, availableTurns)])}
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
              >
                500
              </button>
              <button
                onClick={() => setTurnInvestment([Math.min(1000, availableTurns)])}
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--rpg-background)] border border-[var(--rpg-border)] rounded hover:border-[var(--rpg-gold)] transition-colors text-[var(--rpg-text-primary)]"
              >
                1K
              </button>
            </div>
          </div>
        </PixelCard>
      )}

      {/* Estimated Yield */}
      {selectedNode && yieldInfo && (
        <PixelCard className="bg-[var(--rpg-background)]">
          <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-3">Estimated Yield</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-[var(--rpg-surface)] flex items-center justify-center text-3xl">
              {selectedNode.imageSrc ? (
                <img
                  src={selectedNode.imageSrc}
                  alt={selectedNode.name}
                  className="w-14 h-14 object-contain image-rendering-pixelated"
                />
              ) : (
                selectedNode.icon
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-[var(--rpg-text-secondary)]">{selectedNode.name}</div>
              <div className="text-3xl font-bold text-[var(--rpg-gold)] font-mono">{yieldInfo.totalYield}</div>
              <div className="text-xs text-[var(--rpg-text-secondary)]">
                {yieldInfo.actions} action{yieldInfo.actions !== 1 ? 's' : ''} × {yieldInfo.baseYield} base
                {yieldInfo.yieldMultiplier > 1 && (
                  <span className="text-[var(--rpg-green-light)]"> × {yieldInfo.yieldMultiplier.toFixed(1)}</span>
                )}
              </div>
              {yieldInfo.willDeplete && (
                <div className="text-xs text-[var(--rpg-red)] mt-1 font-semibold">
                  ⚠️ Will exhaust vein completely
                </div>
              )}
            </div>
          </div>
        </PixelCard>
      )}

      {/* Start Button */}
      {selectedNode && (
        <PixelButton
          variant="gold"
          size="lg"
          className="w-full"
          onClick={() => onStartGathering(selectedNode.id, turnInvestment[0])}
          disabled={isRecovering || turnInvestment[0] > availableTurns}
        >
          <div className="flex items-center justify-center gap-2">
            <Pickaxe size={20} />
            {isRecovering ? 'Recover First' : `Start ${skillName}`}
          </div>
        </PixelButton>
      )}

      {/* Gathering Log */}
      <PixelCard>
        <h3 className="font-semibold text-[var(--rpg-text-primary)] mb-3">Recent Activity</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {gatheringLog.length === 0 ? (
            <div className="text-sm text-[var(--rpg-text-secondary)] text-center py-4">No recent activity</div>
          ) : (
            gatheringLog.map((entry, index) => {
              const typeColors = {
                info: 'text-[var(--rpg-text-secondary)]',
                success: 'text-[var(--rpg-green-light)]',
              };
              return (
                <div key={index} className="flex gap-2 text-sm">
                  <Clock size={14} className="text-[var(--rpg-text-secondary)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--rpg-text-secondary)] flex-shrink-0 font-mono">{entry.timestamp}</span>
                  <span className={typeColors[entry.type]}>{entry.message}</span>
                </div>
              );
            })
          )}
        </div>
      </PixelCard>
    </div>
  );
}
