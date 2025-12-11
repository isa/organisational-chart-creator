import { Trash2, X } from "lucide-react";

interface GroupBackgroundProps {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	color?: string;
}

export function GroupBackground({
	x,
	y,
	width,
	height,
	color = "rgba(249, 250, 251, 0.6)", // gray-50 with opacity
}: GroupBackgroundProps) {
	return (
		<div
			className="absolute border border-slate-200 rounded-xl"
			style={{
				left: x,
				top: y,
				width: width,
				height: height,
				backgroundColor: color,
				pointerEvents: "none",
				zIndex: 0,
			}}
		/>
	);
}

interface GroupControlsProps {
	id: string;
	title: string;
	x: number;
	y: number;
	width: number;
	height: number;
	onDelete: (id: string) => void;
	onUpdateTitle?: (id: string, newTitle: string) => void;
}

export function GroupControls({
	id,
	title,
	x,
	y,
	width,
	height,
	onDelete,
}: GroupControlsProps) {
	return (
		<div
			className="absolute"
			style={{
				left: x,
				top: y,
				width: width,
				height: height,
				zIndex: 100, // Ensure controls are on top
				pointerEvents: "none",
			}}>
			{/* Title */}
			<div
				className="absolute text-slate-400 font-medium pointer-events-auto group-title cursor-text select-text"
				onMouseDown={(e) => {
					e.stopPropagation();
				}}
				style={{
					position: "absolute",
					top: "10px",
					left: "10px",
					fontSize: "20px",
					lineHeight: "1.2",
					zIndex: 101,
				}}>
				{title}
			</div>

			{/* Delete Button */}
			<button
				onMouseDown={(e) => {
					e.stopPropagation();
				}}
				onClick={(e) => {
					e.stopPropagation();
					onDelete(id);
				}}
				className="absolute p-1.5 bg-white hover:bg-red-100 rounded-full text-slate-600 hover:text-red-600 transition-colors shadow-sm cursor-pointer border border-slate-200"
				style={{
					zIndex: 101,
					pointerEvents: "all",
					cursor: "pointer",
					top: "-10px",
					right: "-10px",
				}}
				title="Delete Group">
				<X className="w-3 h-3 pointer-events-none" />
			</button>
		</div>
	);
}
