import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { PlacedPerson } from "./OrgChartCanvas";
import { AttachmentPoint } from "./AttachmentPoint";

interface PersonCardProps {
	person: PlacedPerson;
	onMove: (id: string, deltaX: number, deltaY: number) => void;
	onRemove: (id: string) => void;
	onStartConnection: (
		id: string,
		type: "person",
		point: "top" | "right" | "bottom" | "left",
		e: React.MouseEvent
	) => void;
	onEndConnection: (
		id: string,
		type: "person",
		point: "top" | "right" | "bottom" | "left"
	) => void;
	isConnecting: boolean;
	connectingPoint?: "top" | "right" | "bottom" | "left";
	onToggleBillable: (id: string) => void;
	onMoveEnd?: (id: string) => void;
	isSelected?: boolean;
	onSelect?: (id: string, multi: boolean) => void;
}

export function PersonCard({
	person,
	onMove,
	onRemove,
	onStartConnection,
	onEndConnection,
	isConnecting,
	connectingPoint,
	onToggleBillable,
	onMoveEnd,
	isSelected,
	onSelect,
}: PersonCardProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const cardRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest(".attachment-point")) return;
		if ((e.target as HTMLElement).closest("button")) return;
		if ((e.target as HTMLElement).closest(".billable-checkbox")) return;

		e.stopPropagation();

		// Handle Selection
		if (onSelect) {
			const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
			onSelect(person.instanceId, isMulti);
		}

		setIsDragging(true);
		setDragStart({
			x: e.clientX,
			y: e.clientY,
		});
	};

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			const deltaX = e.clientX - dragStart.x;
			const deltaY = e.clientY - dragStart.y;

			onMove(person.instanceId, deltaX, deltaY);

			setDragStart({
				x: e.clientX,
				y: e.clientY,
			});
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			if (onMoveEnd) {
				onMoveEnd(person.instanceId);
			}
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, dragStart, person.instanceId, onMove, onMoveEnd]);

	const getDepartmentColor = (department: string) => {
		const colors: Record<string, string> = {
			Technology: "bg-blue-600",
			Delivery: "bg-emerald-600",
			TDC: "bg-violet-600",
			Sales: "bg-indigo-600",
			Operations: "bg-amber-600",
		};
		return colors[department] || "bg-slate-600";
	};

	const getDepartmentDotColor = (department: string) => {
		const colors: Record<string, string> = {
			Technology: "bg-blue-300",
			Delivery: "bg-emerald-300",
			TDC: "bg-violet-300",
			Sales: "bg-indigo-300",
			Operations: "bg-amber-300",
		};
		return colors[department] || "bg-slate-300";
	};

	return (
		<div
			className={`absolute select-none pointer-events-auto ${
				isDragging ? "cursor-grabbing" : "cursor-grab"
			}`}
			style={{
				left: `${person.x}px`,
				top: `${person.y}px`,
				zIndex: isDragging ? 50 : 10,
				pointerEvents: "auto", // Ensure clicks are captured
			}}
			onMouseDown={handleMouseDown}
			ref={cardRef}
			data-instance-id={person.instanceId}>
			{/* Fixed container - wider and shorter */}
			<div className="relative w-[280px] h-[100px]">
				{/* Attachment Points */}
				<AttachmentPoint
					position="top"
					onStartConnection={(e) =>
						onStartConnection(person.instanceId, "person", "top", e)
					}
					onEndConnection={() =>
						onEndConnection(person.instanceId, "person", "top")
					}
					isActive={isConnecting && connectingPoint === "top"}
				/>
				<AttachmentPoint
					position="right"
					onStartConnection={(e) =>
						onStartConnection(person.instanceId, "person", "right", e)
					}
					onEndConnection={() =>
						onEndConnection(person.instanceId, "person", "right")
					}
					isActive={isConnecting && connectingPoint === "right"}
				/>
				<AttachmentPoint
					position="bottom"
					onStartConnection={(e) =>
						onStartConnection(person.instanceId, "person", "bottom", e)
					}
					onEndConnection={() =>
						onEndConnection(person.instanceId, "person", "bottom")
					}
					isActive={isConnecting && connectingPoint === "bottom"}
				/>
				<AttachmentPoint
					position="left"
					onStartConnection={(e) =>
						onStartConnection(person.instanceId, "person", "left", e)
					}
					onEndConnection={() =>
						onEndConnection(person.instanceId, "person", "left")
					}
					isActive={isConnecting && connectingPoint === "left"}
				/>

				{/* Main Card */}
				<div
					className={`absolute inset-0 bg-white rounded-lg border-2 shadow-md overflow-hidden person-card transition-all duration-200 ${
						isSelected
							? "border-blue-500 ring-2 ring-blue-500 ring-offset-2"
							: "border-slate-200"
					}`}>
					{/* Delete Button - Bottom Left */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							onRemove(person.instanceId);
						}}
						className="absolute bottom-2 left-2 w-5 h-5 bg-slate-100 hover:bg-red-50 rounded text-slate-600 hover:text-red-600 transition-colors z-20 flex items-center justify-center border border-slate-300"
						title="Remove">
						<Trash2 className="w-3 h-3" />
					</button>

					{/* Content - Flexbox layout */}
					<div className="relative z-10 h-full flex items-center gap-3 px-3 pt-4 pb-8">
						{/* pt-4 for top padding, pb-8 for billable checkbox space */}

						{/* Avatar */}
						<div className="flex-shrink-0">
							{person.imageUrl ? (
								<img
									src={person.imageUrl}
									alt={person.name}
									className="w-[50px] h-[50px] rounded-lg object-cover border border-slate-200 shadow-sm"
									draggable={false}
								/>
							) : (
								<div
									className={`w-[50px] h-[50px] rounded-lg ${getDepartmentColor(
										person.department
									)} flex items-center justify-center text-white border border-slate-200 shadow-sm text-xl`}>
									{person.name.charAt(0)}
								</div>
							)}
						</div>

						{/* Text Content */}
						<div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
							<div>
								<h3 className="text-slate-900 truncate">
									{person.name}
								</h3>
								<p className="text-slate-600 text-xs truncate">
									{person.title}
								</p>
							</div>

							{/* Department and Country Badges - Side by Side */}
							<div className="flex items-center gap-1.5">
								<div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
									<div
										className={`w-1.5 h-1.5 rounded-full ${getDepartmentDotColor(
											person.department
										)}`}></div>
									<span className="text-slate-700 text-xs">
										{person.department}
									</span>
								</div>
								<div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
									<span className="text-slate-700 text-xs">
										{person.country}
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Billable Checkbox - Bottom Right */}
					<button
						onClick={(e) => {
							e.stopPropagation();
							onToggleBillable(person.instanceId);
						}}
						className={`billable-checkbox absolute bottom-2 right-2 w-5 h-5 rounded transition-colors z-20 flex items-center justify-center cursor-pointer border ${
							person.billable
								? "border-emerald-500 bg-emerald-500 hover:bg-emerald-600"
								: "border-amber-500 bg-amber-500 hover:bg-amber-600"
						}`}
						title={person.billable ? "Billable" : "Non-billable"}>
						{person.billable ? (
							<div className="w-2 h-2 rounded-sm bg-white"></div>
						) : (
							<div className="w-2 h-2 rounded-sm bg-white"></div>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
