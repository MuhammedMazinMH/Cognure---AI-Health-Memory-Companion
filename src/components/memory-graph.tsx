// A visual knowledge graph of the user's health, drawn with React Flow.
// Each health entity becomes a colored node. Low-confidence symptoms appear
// as faint "shadow" nodes with a dashed lavender border.
//
// CLIENT component: React Flow renders in the browser and needs interactivity.
"use client";

import { useMemo, useState, useCallback } from "react";
import React from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import type { HealthEntity, HealthEntityType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Brand-aligned color for each entity type.
const TYPE_COLORS: Record<HealthEntityType, string> = {
  medication: "#5b8def", // blue
  symptom: "#e07a5f", // red / coral
  diagnosis: "#9b6dc9", // purple
  procedure: "#4caf7d", // green
  provider: "#e8983b", // orange
};

const LAVENDER = "#b8a9c9";

// How many nodes to show at once for performance
const NODES_PER_PAGE = 30;

// Sample data so the graph looks alive before the user adds anything real.
const SAMPLE_ENTITIES: HealthEntity[] = [
  { name: "Metformin", type: "medication", confidence: 0.95 },
  { name: "Lisinopril", type: "medication", confidence: 0.9 },
  { name: "Type 2 Diabetes", type: "diagnosis", confidence: 0.92 },
  { name: "Hypertension", type: "diagnosis", confidence: 0.88 },
  { name: "Fatigue", type: "symptom", confidence: 0.7 },
  { name: "Blurred vision", type: "symptom", confidence: 0.35 },
  { name: "Blood test", type: "procedure", confidence: 0.8 },
  { name: "Dr. Patel", type: "provider", confidence: 0.97 },
];

interface MemoryGraphProps {
  entities?: HealthEntity[];
}

export function MemoryGraph({ entities }: MemoryGraphProps) {
  // State for entity details dialog
  const [selectedEntity, setSelectedEntity] = useState<HealthEntity | null>(null);
  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  // Category filter
  const [activeFilter, setActiveFilter] = useState<HealthEntityType | "all">("all");
  // How many nodes to show (pagination)
  const [displayCount, setDisplayCount] = useState(NODES_PER_PAGE);

  // Get all entities (real or sample)
  const allEntities = useMemo(() => {
    const data = entities && entities.length > 0 ? entities : SAMPLE_ENTITIES;
    // Sort by confidence (highest first)
    return [...data].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }, [entities]);

  // Filter entities based on search and category
  const filteredEntities = useMemo(() => {
    let result = allEntities;

    // Filter by category
    if (activeFilter !== "all") {
      result = result.filter((e) => e.type === activeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(query));
    }

    return result;
  }, [allEntities, activeFilter, searchQuery]);

  // Paginate: only show first N entities
  const visibleEntities = useMemo(() => {
    return filteredEntities.slice(0, displayCount);
  }, [filteredEntities, displayCount]);

  // Reset display count when filters change
  const handleFilterChange = useCallback((filter: HealthEntityType | "all") => {
    setActiveFilter(filter);
    setDisplayCount(NODES_PER_PAGE);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setDisplayCount(NODES_PER_PAGE);
  }, []);

  // Build nodes and edges
  const { nodes, edges } = useMemo(() => {
    const data = visibleEntities;

    // A central node representing the user
    const centerNode: Node = {
      id: "center",
      position: { x: 0, y: 0 },
      data: { label: "You" },
      style: {
        background: "#8a9a87",
        color: "white",
        border: "none",
        borderRadius: 9999,
        width: 80,
        height: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: 14,
        cursor: "default",
      },
    };

    // Tighter radius so nodes don't spread too far
    const radius = 140;

    // Arrange entity nodes evenly around the center
    const entityNodes: Node[] = data.map((entity, index) => {
      const angle = (index / Math.max(data.length, 1)) * 2 * Math.PI;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const isShadow = entity.type === "symptom" && entity.confidence < 0.5;
      const baseColor = TYPE_COLORS[entity.type];

      return {
        id: `entity-${index}`,
        position: { x, y },
        data: {
          label: entity.name,
          confidence: Math.round(entity.confidence * 100),
          entity: entity,
        },
        style: {
          background: isShadow ? "#ffffff" : baseColor,
          color: isShadow ? "#2c2c2c" : "white",
          border: isShadow ? `2px dashed ${LAVENDER}` : "2px solid transparent",
          borderRadius: 8,
          padding: "4px 6px",
          fontSize: 10,
          fontWeight: 500,
          textAlign: "center",
          width: 110,
          height: "auto",
          minHeight: 32,
          maxHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: "1.2",
          wordWrap: "break-word",
          overflow: "hidden",
          opacity: isShadow ? 0.85 : 1,
          cursor: "pointer",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        },
      };
    });

    // Connect every entity to the center
    const entityEdges: Edge[] = data.map((entity, index) => {
      const isShadow = entity.type === "symptom" && entity.confidence < 0.5;
      return {
        id: `edge-${index}`,
        source: "center",
        target: `entity-${index}`,
        animated: !isShadow,
        style: {
          stroke: isShadow ? LAVENDER : "#c4bca8",
          strokeWidth: isShadow ? 1 : 1.5,
          strokeDasharray: isShadow ? "4 4" : undefined,
        },
      };
    });

    return {
      nodes: [centerNode, ...entityNodes],
      edges: entityEdges,
    };
  }, [visibleEntities]);

  // Handle node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.id !== "center" && node.data?.entity) {
      setSelectedEntity(node.data.entity as HealthEntity);
    }
  }, []);

  // Category filter buttons
  const categories: { label: string; value: HealthEntityType | "all" }[] = [
    { label: "All", value: "all" },
    { label: "Medications", value: "medication" },
    { label: "Symptoms", value: "symptom" },
    { label: "Diagnoses", value: "diagnosis" },
    { label: "Procedures", value: "procedure" },
    { label: "Providers", value: "provider" },
  ];

  const hasMore = filteredEntities.length > displayCount;

  return (
    <div className="flex h-full w-full flex-col rounded-xl border bg-card">
      {/* Filter Bar */}
      <div className="flex flex-col gap-3 p-4 border-b">
        {/* Search */}
        <Input
          placeholder="Search entities..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={activeFilter === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(cat.value)}
              style={{
                backgroundColor: activeFilter === cat.value ? "#8a9a87" : undefined,
              }}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Count info */}
        <p className="text-xs text-muted-foreground">
          Showing {visibleEntities.length} of {filteredEntities.length} entities
          {entities && entities.length > 0 && ` (total: ${allEntities.length})`}
        </p>
      </div>

      {/* Graph */}
      <div className="flex-1 relative" style={{ minHeight: "400px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d8d0bf" gap={20} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>

        {/* Load More button */}
        {hasMore && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Button
              onClick={() => setDisplayCount((prev) => prev + NODES_PER_PAGE)}
              variant="outline"
              className="bg-white shadow-lg"
            >
              Load More ({filteredEntities.length - displayCount} remaining)
            </Button>
          </div>
        )}
      </div>

      {/* Entity Details Dialog */}
      <Dialog
        open={selectedEntity !== null}
        onOpenChange={() => setSelectedEntity(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading">
              {selectedEntity?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedEntity && (
            <div className="space-y-4">
              <div>
                <Badge
                  style={{
                    backgroundColor: TYPE_COLORS[selectedEntity.type],
                    color: "white",
                  }}
                  className="text-sm"
                >
                  {selectedEntity.type}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">
                    {Math.round(selectedEntity.confidence * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${selectedEntity.confidence * 100}%`,
                      backgroundColor: TYPE_COLORS[selectedEntity.type],
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Source:</strong> Document analysis
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Extracted:</strong> {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}