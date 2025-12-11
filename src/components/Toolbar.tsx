import { Editor } from 'tldraw';
import { GitBranch, Minus, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { Employee } from './OrgChartBuilder';

interface ToolbarProps {
  editor: Editor;
  employees: Employee[];
}

export function Toolbar({ editor, employees }: ToolbarProps) {
  const handleAddConnection = () => {
    editor.setCurrentTool('arrow');
  };

  const handleAddLine = () => {
    editor.setCurrentTool('line');
  };

  const handleSelect = () => {
    editor.setCurrentTool('select');
  };

  const handleZoomIn = () => {
    editor.zoomIn();
  };

  const handleZoomOut = () => {
    editor.zoomOut();
  };

  const handleZoomToFit = () => {
    editor.zoomToFit();
  };

  return (
    <div className="absolute bottom-6 right-6 flex gap-3 z-10">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-2 flex gap-1">
        <button
          onClick={handleSelect}
          className="group relative p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Select Tool"
        >
          <Move className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleAddConnection}
          className="group relative p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Add Connection (Arrow)"
        >
          <GitBranch className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleAddLine}
          className="group relative p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Add Line"
        >
          <Minus className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
      </div>

      <div className="bg-black/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-2 flex gap-1">
        <button
          onClick={handleZoomOut}
          className="group p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleZoomToFit}
          className="group p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Zoom to Fit"
        >
          <Maximize className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
        <button
          onClick={handleZoomIn}
          className="group p-3 hover:bg-white/10 rounded-xl transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}