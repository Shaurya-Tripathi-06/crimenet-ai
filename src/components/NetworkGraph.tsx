import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";
import {
  X,
  User,
  Building2,
  MapPin,
  Car,
  Phone,
  FileText,
  Calendar,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  confidence: number;
  alias?: string;
  city?: string;
  phone?: string;
  registrationNumber?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence: number;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeSelect?: (nodeId: string) => void;
  height?: string;
}

const TYPE_COLORS: Record<string, string> = {
  person: "#22d3ee",
  organization: "#a78bfa",
  location: "#34d399",
  vehicle: "#fb923c",
  phone: "#f472b6",
  case: "#ef4444",
  event: "#facc15",
};

const TYPE_ICONS: Record<string, any> = {
  person: User,
  organization: Building2,
  location: MapPin,
  vehicle: Car,
  phone: Phone,
  case: FileText,
  event: Calendar,
};

export function NetworkGraph({
  nodes,
  edges,
  onNodeSelect,
  height = "100%",
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeConnections, setNodeConnections] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          confidence: n.confidence,
          alias: n.alias,
          city: n.city,
          phone: n.phone,
          registrationNumber: n.registrationNumber,
        },
        classes: `type-${n.type}`,
      })),
      ...edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          confidence: e.confidence,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "background-color": (ele: any) =>
              TYPE_COLORS[ele.data("type")] || "#64748b",
            color: "#e2e8f0",
            "font-size": "11px",
            "font-weight": "500",
            "text-outline-color": "#080c14",
            "text-outline-width": 2,
            width: (ele: any) => {
              const connections = edges.filter(
                (e) =>
                  e.source === ele.data("id") || e.target === ele.data("id")
              ).length;
              return Math.max(20, 14 + connections * 4);
            },
            height: (ele: any) => {
              const connections = edges.filter(
                (e) =>
                  e.source === ele.data("id") || e.target === ele.data("id")
              ).length;
              return Math.max(20, 14 + connections * 4);
            },
            "border-width": 2,
            "border-color": (ele: any) => {
              const c = TYPE_COLORS[ele.data("type")] || "#64748b";
              return c;
            },
            "border-opacity": 0.5,
            "text-valign": "bottom",
            "text-margin-y": 6,
          } as any,
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            label: "data(label)",
            "font-size": "9px",
            color: "#64748b",
            "text-outline-color": "#080c14",
            "text-outline-width": 1.5,
            "text-rotation": "autorotate",
            "text-margin-y": -8,
            "line-color": "#334155",
            "target-arrow-color": "#334155",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.8,
          } as any,
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 3,
            "border-color": "#22d3ee",
            "border-opacity": 1,
            "background-color": "#22d3ee",
            "font-size": "12px",
            "font-weight": "700",
          } as any,
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 3,
            "border-color": "#22d3ee",
            "border-opacity": 1,
            "font-weight": "700",
          } as any,
        },
        {
          selector: "edge.highlighted",
          style: {
            "line-color": "#22d3ee",
            width: 3,
            "target-arrow-color": "#22d3ee",
          } as any,
        },
        {
          selector: "node.faded",
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: "edge.faded",
          style: {
            opacity: 0.1,
          },
        },
      ],
      layout: {
        name: "cose",
        idealEdgeLength: 150,
        nodeOverlap: 30,
        refresh: 20,
        randomize: false,
        componentSpacing: 80,
        nodeRepulsion: 6000,
        edgeElasticity: 200,
        nestingFactor: 1.2,
        gravity: 0.25,
        numIter: 1500,
        animate: true,
        animationDuration: 800,
      } as any,
    });

    cyRef.current = cy;

    // Node click handler
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const data = node.data();
      const conns = edges.filter(
        (e) => e.source === data.id || e.target === data.id
      ).length;
      setSelectedNode({
        id: data.id,
        label: data.label,
        type: data.type,
        confidence: data.confidence,
        alias: data.alias,
        city: data.city,
        phone: data.phone,
        registrationNumber: data.registrationNumber,
      });
      setNodeConnections(conns);

      // Highlight connected nodes
      cy.elements().removeClass("highlighted faded");
      const neighborhood = node.closedNeighborhood();
      neighborhood.addClass("highlighted");
      cy.elements().not(neighborhood).addClass("faded");

      onNodeSelect?.(data.id);
    });

    // Background click - deselect
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass("highlighted faded");
        setSelectedNode(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, onNodeSelect]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-[#0f1520]/90 backdrop-blur-md border border-white/[0.08] rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Node Types
        </div>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] text-gray-400 capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.3)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f1520]/90 border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors text-sm font-bold"
        >
          +
        </button>
        <button
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.7)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f1520]/90 border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors text-sm font-bold"
        >
          −
        </button>
        <button
          onClick={() => cyRef.current?.fit()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f1520]/90 border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Fit to screen"
        >
          <Network className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 right-3 lg:left-auto lg:right-3 lg:w-80 bg-[#0f1520]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-2xl">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: `${TYPE_COLORS[selectedNode.type]}20`,
                }}
              >
                {(() => {
                  const Icon = TYPE_ICONS[selectedNode.type] || User;
                  return (
                    <Icon
                      className="w-5 h-5"
                      style={{ color: TYPE_COLORS[selectedNode.type] }}
                    />
                  );
                })()}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {selectedNode.label}
                </h3>
                <p className="text-xs text-gray-400 capitalize">
                  {selectedNode.type}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedNode(null);
                cyRef.current?.elements().removeClass("highlighted faded");
              }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {selectedNode.alias && (
              <div className="flex justify-between">
                <span className="text-gray-500">Alias</span>
                <span className="text-gray-300">{selectedNode.alias}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Connections</span>
              <span className="text-cyan-400 font-medium">{nodeConnections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Confidence</span>
              <span className="text-gray-300">
                {(selectedNode.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {selectedNode.city && (
              <div className="flex justify-between">
                <span className="text-gray-500">City</span>
                <span className="text-gray-300">{selectedNode.city}</span>
              </div>
            )}
            {selectedNode.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-300">{selectedNode.phone}</span>
              </div>
            )}
            {selectedNode.registrationNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">Reg. No.</span>
                <span className="text-gray-300">
                  {selectedNode.registrationNumber}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
