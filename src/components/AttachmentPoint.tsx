import { useState } from "react";

interface AttachmentPointProps {
	position: "top" | "right" | "bottom" | "left";
	onStartConnection: (e: React.MouseEvent) => void;
	onEndConnection: () => void;
	isActive: boolean;
}

export function AttachmentPoint({
	position,
	onStartConnection,
	onEndConnection,
	isActive,
}: AttachmentPointProps) {
	const [isHovered, setIsHovered] = useState(false);

	const getPositionStyles = () => {
		switch (position) {
			case "top":
				return "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2";
			case "right":
				return "top-1/2 right-0 translate-x-1/2 -translate-y-1/2";
			case "bottom":
				return "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2";
			case "left":
				return "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2";
		}
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		e.stopPropagation();
		e.preventDefault(); // Prevent default text selection
		onStartConnection(e);
	};

	const handleMouseUp = (e: React.MouseEvent) => {
		e.stopPropagation();
		onEndConnection();
	};

	return (
		<div
			className={`attachment-point absolute ${getPositionStyles()} z-20 cursor-pointer group`}
			onMouseDown={handleMouseDown}
			onMouseUp={handleMouseUp}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}>
			{/* Outer ring - much more subtle */}
			<div
				className={`w-3 h-3 rounded-full border-2 transition-all ${
					isActive
						? "border-blue-500 bg-blue-500 shadow-md scale-125"
						: isHovered
						? "border-emerald-500 bg-emerald-500 shadow-md scale-125"
						: "border-slate-300 bg-white opacity-50 group-hover:opacity-100 group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:scale-110"
				}`}>
				{/* Inner dot */}
				<div
					className={`absolute inset-0 m-auto w-1 h-1 rounded-full ${
						isActive
							? "bg-white"
							: isHovered
							? "bg-white"
							: "bg-slate-400 group-hover:bg-blue-400"
					}`}></div>
			</div>

			{/* Tooltip */}
			{isHovered && !isActive && (
				<div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none z-50 shadow-lg">
					Drop to connect
				</div>
			)}
		</div>
	);
}
