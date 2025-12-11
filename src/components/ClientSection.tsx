import { useState, useRef, useEffect } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { PlacedClient, PlacedPerson } from "./OrgChartCanvas";
import { AttachmentPoint } from "./AttachmentPoint";

interface ClientSectionProps {
	client: PlacedClient;
	people: PlacedPerson[];
	onMove: (id: string, deltaX: number, deltaY: number) => void;
	onRemove: (id: string) => void;
	onAddPerson: (
		personId: string,
		clientId: string,
		canvasInstanceId?: string
	) => void;
	onRemovePerson: (personId: string, clientId: string) => void;
	onStartConnection: (
		id: string,
		type: "client",
		point: "top" | "right" | "bottom" | "left",
		e: React.MouseEvent
	) => void;
	onEndConnection: (
		id: string,
		type: "client",
		point: "top" | "right" | "bottom" | "left"
	) => void;
	isConnecting: boolean;
	connectingPoint?: "top" | "right" | "bottom" | "left";
	onMoveEnd?: (id: string) => void;
	isSelected?: boolean;
	onSelect?: (id: string, multi: boolean) => void;
}

export function ClientSection({
	client,
	people,
	onMove,
	onRemove,
	onAddPerson,
	onRemovePerson,
	onStartConnection,
	onEndConnection,
	isConnecting,
	connectingPoint,
	onMoveEnd,
	isSelected,
	onSelect,
}: ClientSectionProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const dragStartRef = useRef({ x: 0, y: 0 });
	const containerRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = (e: React.MouseEvent) => {
		if ((e.target as HTMLElement).closest(".attachment-point")) return;
		if ((e.target as HTMLElement).closest("button")) return;
		if ((e.target as HTMLElement).closest(".person-mini-card")) return;
		if ((e.target as HTMLElement).closest(".drop-zone")) return;

		e.stopPropagation();

		// Handle Selection
		if (onSelect) {
			const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;
			onSelect(client.instanceId, isMulti);
		}

		setIsDragging(true);
		dragStartRef.current = {
			x: e.clientX,
			y: e.clientY,
		};
	};

	const handleDragOver = (e: React.DragEvent) => {
		if (people.length >= 3) return;

		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);

		const dataType = e.dataTransfer.getData("type");
		if (dataType === "person") {
			const personData = e.dataTransfer.getData("person");
			if (personData) {
				const person = JSON.parse(personData);
				if (people.length < 3) {
					// Pass the instanceId if it exists (from canvas card)
					onAddPerson(person.id, client.instanceId, person.instanceId);
				}
			}
		}
	};

	const handleClientDragStart = (e: React.DragEvent) => {
		// Only allow attachment point drags for connections
		const target = e.target as HTMLElement;
		if (!target.closest(".attachment-point")) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			const deltaX = e.clientX - dragStartRef.current.x;
			const deltaY = e.clientY - dragStartRef.current.y;

			onMove(client.instanceId, deltaX, deltaY);

			dragStartRef.current = {
				x: e.clientX,
				y: e.clientY,
			};
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			if (onMoveEnd) {
				onMoveEnd(client.instanceId);
			}
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, client.instanceId, onMove, onMoveEnd]);

	const canAddMore = people.length < 3;

	return (
		<div
			className={`absolute select-none pointer-events-auto ${
				isDragging ? "cursor-grabbing" : "cursor-grab"
			}`}
			style={{
				left: `${client.x}px`,
				top: `${client.y}px`,
				zIndex: isDragging ? 50 : 10,
				pointerEvents: "auto", // Ensure clicks are captured
			}}
			onMouseDown={handleMouseDown}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			ref={containerRef}
			data-client-instance-id={client.instanceId}>
			{/* Client Section Card */}
			<div
				className={`relative bg-white rounded-lg border-2 shadow-lg w-[360px] transition-all duration-200 ${
					isSelected
						? "border-blue-500 ring-2 ring-blue-500 ring-offset-2"
						: "border-emerald-200"
				}`}>
				{/* Attachment Points */}
				<AttachmentPoint
					position="top"
					onStartConnection={(e) =>
						onStartConnection(client.instanceId, "client", "top", e)
					}
					onEndConnection={() =>
						onEndConnection(client.instanceId, "client", "top")
					}
					isActive={isConnecting && connectingPoint === "top"}
				/>
				<AttachmentPoint
					position="right"
					onStartConnection={(e) =>
						onStartConnection(client.instanceId, "client", "right", e)
					}
					onEndConnection={() =>
						onEndConnection(client.instanceId, "client", "right")
					}
					isActive={isConnecting && connectingPoint === "right"}
				/>
				<AttachmentPoint
					position="bottom"
					onStartConnection={(e) =>
						onStartConnection(client.instanceId, "client", "bottom", e)
					}
					onEndConnection={() =>
						onEndConnection(client.instanceId, "client", "bottom")
					}
					isActive={isConnecting && connectingPoint === "bottom"}
				/>
				<AttachmentPoint
					position="left"
					onStartConnection={(e) =>
						onStartConnection(client.instanceId, "client", "left", e)
					}
					onEndConnection={() =>
						onEndConnection(client.instanceId, "client", "left")
					}
					isActive={isConnecting && connectingPoint === "left"}
				/>

				{/* Header */}
				<div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-3.5 relative rounded-t-md client-section">
					<div className="relative flex items-center justify-between">
						<div className="flex items-center gap-3">
							{client.logoUrl ? (
								<img
									src={client.logoUrl}
									alt={client.name}
									className="w-9 h-9 rounded-lg object-cover border border-white/30 bg-white"
									draggable={false}
								/>
							) : (
								<div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
									{client.name.charAt(0)}
								</div>
							)}
							<div>
								<h3 className="text-white">{client.name}</h3>
								<p className="text-xs text-emerald-100">
									{client.country ? `${client.country} • ` : ""}
									{people.length}/3 members
								</p>
							</div>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onRemove(client.instanceId);
							}}
							className="p-1.5 bg-white/20 hover:bg-red-500 rounded text-white transition-colors"
							title="Remove Client">
							<Trash2 className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* People Container */}
				<div className="p-4 space-y-2 min-h-[100px] bg-slate-50">
					{people.map((person) => (
						<div
							key={person.instanceId}
							className="person-mini-card relative p-2.5 bg-white rounded-lg border border-slate-200 group">
							<div className="flex items-center gap-2.5">
								{person.imageUrl ? (
									<img
										src={person.imageUrl}
										alt={person.name}
										className="w-9 h-9 rounded-md object-cover border border-slate-200"
										draggable={false}
									/>
								) : (
									<div className="w-9 h-9 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm">
										{person.name.charAt(0)}
									</div>
								)}
								<div className="flex-1 min-w-0">
									<div className="text-slate-900 text-sm truncate">
										{person.name}
									</div>
									<div className="text-xs text-slate-500 truncate">
										{person.title}
									</div>
									<div className="text-xs text-slate-600 truncate mt-0.5">
										{person.country}
									</div>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onRemovePerson(
											person.instanceId,
											client.instanceId
										);
									}}
									className="opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 hover:bg-red-50 rounded text-slate-600 hover:text-red-600 transition-all border border-slate-200"
									title="Remove from group">
									<Trash2 className="w-3 h-3" />
								</button>
							</div>
						</div>
					))}

					{/* Empty slots */}
					{canAddMore && (
						<div
							className={`drop-zone p-3 border-2 border-dashed rounded-lg flex items-center justify-center text-sm transition-all ${
								isDragOver
									? "border-emerald-400 bg-emerald-50 text-emerald-700"
									: "border-slate-300 text-slate-400 bg-white"
							}`}>
							<UserPlus className="w-4 h-4 mr-2" />
							Drop person here ({3 - people.length} slots left)
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
