import { useState } from "react";
import { Connection, PlacedPerson, PlacedClient } from "./OrgChartCanvas";

interface ConnectionLinesProps {
	connections: Connection[];
	placedPeople: PlacedPerson[];
	placedClients: PlacedClient[];
	onRemove: (connectionId: string) => void;
	onToggleStyle: (connectionId: string) => void;
	dragConnection?: {
		fromId: string;
		fromType: "person" | "client";
		fromPoint: "top" | "right" | "bottom" | "left";
		toX: number;
		toY: number;
	} | null;
}

interface LineSegment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

interface PathData {
	path: string;
	segments: LineSegment[];
	connectionId: string;
}

// Check if two line segments intersect and return intersection point
function getLineIntersection(
	seg1: LineSegment,
	seg2: LineSegment
): { x: number; y: number } | null {
	const { x1: x1, y1: y1, x2: x2, y2: y2 } = seg1;
	const { x1: x3, y1: y3, x2: x4, y2: y4 } = seg2;

	const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

	// Lines are parallel
	if (Math.abs(denom) < 0.0001) return null;

	const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
	const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

	// Check if intersection is within both segments
	if (t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99) {
		return {
			x: x1 + t * (x2 - x1),
			y: y1 + t * (y2 - y1),
		};
	}

	return null;
}

export function ConnectionLines({
	connections,
	placedPeople,
	placedClients,
	onRemove,
	onToggleStyle,
	dragConnection,
}: ConnectionLinesProps) {
	const [hoveredId, setHoveredId] = useState<string | null>(null);

	const getAttachmentPosition = (
		id: string,
		type: "person" | "client",
		point: "top" | "right" | "bottom" | "left"
	) => {
		let x = 0;
		let y = 0;
		let width = 0;
		let height = 0;

		if (type === "person") {
			const person = placedPeople.find((p) => p.instanceId === id);
			if (!person) return { x: 0, y: 0 };
			x = person.x;
			y = person.y;
			width = 280; // Updated to match new PersonCard width
			height = 100; // Updated to match new PersonCard height
		} else {
			const client = placedClients.find((c) => c.instanceId === id);
			if (!client) return { x: 0, y: 0 };
			x = client.x;
			y = client.y;
			// Client section has a fixed width of 360px (w-[360px])
			width = 360;

			// Calculate actual client section height:
			// Header: p-3.5 padding (14px top + 14px bottom) + content height (~50px for logo/text/button) = ~78px
			// People container: p-4 (16px top + 16px bottom) + min-h-[100px] + actual people cards
			// Each person mini-card: p-2.5 (10px) + content (~46px for image/text) = ~56px total
			// space-y-2 between cards = 8px gap
			// Drop zone (if visible): p-3 (12px) + content (~20px) = ~32px total

			const peopleInClient = placedPeople.filter((p) =>
				client.peopleIds.includes(p.instanceId)
			);
			const numPeople = peopleInClient.length;
			const hasDropZone = numPeople < 3;

			// More accurate measurements based on actual Tailwind classes:
			// Header div: p-3.5 = 3.5 * 4px = 14px on all sides
			// Content inside: h-9 = 36px for image, text lines, button
			// Total header ≈ 14 + 36 + text + 14 = ~70px (accounting for text height)
			const headerHeight = 70;

			// People container: p-4 = 4 * 4px = 16px top and bottom
			const containerPaddingTop = 16;
			const containerPaddingBottom = 16;

			// min-h-[100px] means minimum 100px for the content area
			const minContentHeight = 100;

			// Each person mini-card:
			// - p-2.5 = 2.5 * 4px = 10px on all sides
			// - Inside: h-9 image (36px) + text (2-3 lines ≈ 48px total including padding)
			// Total per card ≈ 10 + 48 + 10 = 68px
			const personCardHeight = 68;

			// space-y-2 = 2 * 4px = 8px gap between cards
			const cardGap = 8;

			// Drop zone: p-3 = 3 * 4px = 12px on all sides
			// Content: icon + text ≈ 20px
			// Total ≈ 12 + 20 + 12 = 44px
			const dropZoneHeight = 44;

			// Calculate total people cards height
			let peopleCardsHeight = 0;
			if (numPeople > 0) {
				peopleCardsHeight =
					numPeople * personCardHeight + (numPeople - 1) * cardGap;
			}

			// Add drop zone if visible
			const totalDropZoneHeight = hasDropZone
				? dropZoneHeight + (numPeople > 0 ? cardGap : 0)
				: 0;

			// Content height is at least minContentHeight
			const contentAreaHeight = Math.max(
				minContentHeight,
				peopleCardsHeight + totalDropZoneHeight
			);

			height =
				headerHeight +
				containerPaddingTop +
				contentAreaHeight +
				containerPaddingBottom;

			console.log(`Client ${client.name} attachment calc:`, {
				x,
				y,
				width,
				height,
				headerHeight,
				containerPaddingTop,
				containerPaddingBottom,
				contentAreaHeight,
				peopleCardsHeight,
				numPeople,
				hasDropZone,
				point,
			});
		}

		switch (point) {
			case "top":
				return { x: x + width / 2, y };
			case "right":
				return { x: x + width, y: y + height / 2 };
			case "bottom":
				return { x: x + width / 2, y: y + height };
			case "left":
				return { x, y: y + height / 2 };
		}
	};

	const calculatePath = (
		from: { x: number; y: number },
		to: { x: number; y: number },
		fromPoint: "top" | "right" | "bottom" | "left",
		toPoint: "top" | "right" | "bottom" | "left" | "auto" = "auto"
	) => {
		const segments: LineSegment[] = [];
		const points: { x: number; y: number }[] = [];

		// Determine target point if auto
		let targetPoint = toPoint;
		if (targetPoint === "auto") {
			// Simple logic to pick best target side based on relative position
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			if (Math.abs(dx) > Math.abs(dy)) {
				targetPoint = dx > 0 ? "left" : "right";
			} else {
				targetPoint = dy > 0 ? "top" : "bottom";
			}
		}

		let path = "";

		// Minimum offset for clean connections
		const minOffset = 30;

		// For vertical connections (bottom -> top), calculate optimal horizontal bus line position
		let fromOffset = minOffset;
		let toOffset = minOffset;

		// If this is a parent connecting to children below (bottom -> top)
		if (fromPoint === "bottom" && targetPoint === "top") {
			// Calculate the available space between parent's bottom and child's top
			const availableSpace = to.y - from.y;

			// If there's enough space, keep both offsets at minimum
			// Otherwise, split the available space proportionally
			if (availableSpace >= minOffset * 2) {
				fromOffset = minOffset;
				toOffset = minOffset;
			} else {
				// Split available space evenly
				fromOffset = availableSpace / 2;
				toOffset = availableSpace / 2;
			}
		} else if (fromPoint === "top" && targetPoint === "bottom") {
			// Parent above, child below (top -> bottom)
			const availableSpace = from.y - to.y;
			if (availableSpace >= minOffset * 2) {
				fromOffset = minOffset;
				toOffset = minOffset;
			} else {
				fromOffset = availableSpace / 2;
				toOffset = availableSpace / 2;
			}
		} else if (fromPoint === "right" && targetPoint === "left") {
			// Left to right connection
			const availableSpace = to.x - from.x;
			if (availableSpace >= minOffset * 2) {
				fromOffset = minOffset;
				toOffset = minOffset;
			} else {
				fromOffset = availableSpace / 2;
				toOffset = availableSpace / 2;
			}
		} else if (fromPoint === "left" && targetPoint === "right") {
			// Right to left connection
			const availableSpace = from.x - to.x;
			if (availableSpace >= minOffset * 2) {
				fromOffset = minOffset;
				toOffset = minOffset;
			} else {
				fromOffset = availableSpace / 2;
				toOffset = availableSpace / 2;
			}
		}

		// Start point
		let currentX = from.x;
		let currentY = from.y;
		path = `M ${currentX} ${currentY}`;
		points.push({ x: currentX, y: currentY });

		// First segment: extend from the "from" attachment point
		switch (fromPoint) {
			case "top":
				currentY -= fromOffset;
				path += ` L ${currentX} ${currentY}`;
				break;
			case "bottom":
				currentY += fromOffset;
				path += ` L ${currentX} ${currentY}`;
				break;
			case "left":
				currentX -= fromOffset;
				path += ` L ${currentX} ${currentY}`;
				break;
			case "right":
				currentX += fromOffset;
				path += ` L ${currentX} ${currentY}`;
				break;
		}
		points.push({ x: currentX, y: currentY });

		// Determine the end extension point
		let endX = to.x;
		let endY = to.y;
		let beforeEndX = to.x;
		let beforeEndY = to.y;

		switch (targetPoint) {
			case "top":
				beforeEndY -= toOffset;
				break;
			case "bottom":
				beforeEndY += toOffset;
				break;
			case "left":
				beforeEndX -= toOffset;
				break;
			case "right":
				beforeEndX += toOffset;
				break;
		}

		// Check if cards are aligned for simplified routing
		const isVerticallyAligned = Math.abs(currentX - beforeEndX) < 5;
		const isHorizontallyAligned = Math.abs(currentY - beforeEndY) < 5;

		// Check if cards are very close together
		const isVeryClose =
			Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)) <
			100;

		// Middle segments: create right-angle path
		if (
			isVerticallyAligned &&
			(fromPoint === "top" || fromPoint === "bottom")
		) {
			// Perfectly vertical alignment - just one line segment
			path += ` L ${beforeEndX} ${beforeEndY}`;
			points.push({ x: beforeEndX, y: beforeEndY });
		} else if (
			isHorizontallyAligned &&
			(fromPoint === "left" || fromPoint === "right")
		) {
			// Perfectly horizontal alignment - just one line segment
			path += ` L ${beforeEndX} ${beforeEndY}`;
			points.push({ x: beforeEndX, y: beforeEndY });
		} else if (isVeryClose && Math.abs(currentX - beforeEndX) < 40) {
			// Very close AND nearly aligned horizontally - use simpler path
			// Go horizontal to target X, then vertical to target
			path += ` L ${beforeEndX} ${currentY}`;
			points.push({ x: beforeEndX, y: currentY });
			path += ` L ${beforeEndX} ${beforeEndY}`;
			points.push({ x: beforeEndX, y: beforeEndY });
		} else if (fromPoint === "top" || fromPoint === "bottom") {
			// Vertical-first routing
			if (targetPoint === "left" || targetPoint === "right") {
				// Vertical -> horizontal -> vertical -> horizontal
				const midY = (currentY + beforeEndY) / 2;
				path += ` L ${currentX} ${midY}`;
				points.push({ x: currentX, y: midY });
				path += ` L ${beforeEndX} ${midY}`;
				points.push({ x: beforeEndX, y: midY });
				path += ` L ${beforeEndX} ${beforeEndY}`;
				points.push({ x: beforeEndX, y: beforeEndY });
			} else {
				// Vertical -> horizontal -> vertical (direct routing)
				path += ` L ${beforeEndX} ${currentY}`;
				points.push({ x: beforeEndX, y: currentY });
				path += ` L ${beforeEndX} ${beforeEndY}`;
				points.push({ x: beforeEndX, y: beforeEndY });
			}
		} else {
			// Horizontal-first routing
			const midX = (currentX + beforeEndX) / 2;

			if (targetPoint === "top" || targetPoint === "bottom") {
				// Horizontal -> vertical -> horizontal -> vertical
				path += ` L ${midX} ${currentY}`;
				points.push({ x: midX, y: currentY });
				path += ` L ${midX} ${beforeEndY}`;
				points.push({ x: midX, y: beforeEndY });
				path += ` L ${beforeEndX} ${beforeEndY}`;
				points.push({ x: beforeEndX, y: beforeEndY });
			} else {
				// Horizontal -> vertical -> horizontal
				path += ` L ${midX} ${currentY}`;
				points.push({ x: midX, y: currentY });
				path += ` L ${midX} ${beforeEndY}`;
				points.push({ x: midX, y: beforeEndY });
				path += ` L ${beforeEndX} ${beforeEndY}`;
				points.push({ x: beforeEndX, y: beforeEndY });
			}
		}

		// Final segment: reach the target
		path += ` L ${endX} ${endY}`;
		points.push({ x: endX, y: endY });

		// Convert points to segments
		for (let i = 0; i < points.length - 1; i++) {
			segments.push({
				x1: points[i].x,
				y1: points[i].y,
				x2: points[i + 1].x,
				y2: points[i + 1].y,
			});
		}

		return { path, segments };
	};

	// Build path data with segments for all connections
	const pathsData: PathData[] = connections.map((connection) => {
		const from = getAttachmentPosition(
			connection.fromId,
			connection.fromType,
			connection.fromPoint
		);
		const to = getAttachmentPosition(
			connection.toId,
			connection.toType,
			connection.toPoint
		);

		if (!from || !to)
			return { path: "", segments: [], connectionId: connection.id };

		const { path, segments } = calculatePath(
			from,
			to,
			connection.fromPoint,
			connection.toPoint
		);
		return { path, segments, connectionId: connection.id };
	});

	// Find all intersections
	const intersections = new Map<string, { x: number; y: number }[]>();

	for (let i = 0; i < pathsData.length; i++) {
		for (let j = i + 1; j < pathsData.length; j++) {
			const path1 = pathsData[i];
			const path2 = pathsData[j];

			for (const seg1 of path1.segments) {
				for (const seg2 of path2.segments) {
					const intersection = getLineIntersection(seg1, seg2);
					if (intersection) {
						// Add intersection to the "lower" path (drawn first)
						if (!intersections.has(path1.connectionId)) {
							intersections.set(path1.connectionId, []);
						}
						intersections.get(path1.connectionId)!.push(intersection);
					}
				}
			}
		}
	}

	const getPointOnPath = (segments: LineSegment[], t: number) => {
		// Calculate total length
		let totalLength = 0;
		const segmentLengths = segments.map((seg) => {
			const length = Math.sqrt(
				Math.pow(seg.x2 - seg.x1, 2) + Math.pow(seg.y2 - seg.y1, 2)
			);
			totalLength += length;
			return length;
		});

		// Find target distance
		let targetDist = totalLength * t;

		// Find segment containing target
		let currentDist = 0;
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			const len = segmentLengths[i];

			if (currentDist + len >= targetDist) {
				const segmentT = (targetDist - currentDist) / len;
				return {
					x: seg.x1 + (seg.x2 - seg.x1) * segmentT,
					y: seg.y1 + (seg.y2 - seg.y1) * segmentT,
				};
			}
			currentDist += len;
		}

		// Fallback to end of last segment
		const lastSeg = segments[segments.length - 1];
		return { x: lastSeg.x2, y: lastSeg.y2 };
	};

	return (
		<svg
			className="connections-container absolute inset-0 w-full h-full pointer-events-none"
			style={{ overflow: "visible" }}>
			<defs>
				<linearGradient
					id="connectionGradient"
					gradientUnits="userSpaceOnUse"
					x1="0"
					y1="0"
					x2="1000"
					y2="1000">
					<stop
						offset="0%"
						style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
					/>
					<stop
						offset="100%"
						style={{ stopColor: "#1e40af", stopOpacity: 1 }}
					/>
				</linearGradient>
				<linearGradient
					id="connectionGradientHover"
					gradientUnits="userSpaceOnUse"
					x1="0"
					y1="0"
					x2="1000"
					y2="1000">
					<stop
						offset="0%"
						style={{ stopColor: "#60a5fa", stopOpacity: 1 }}
					/>
					<stop
						offset="100%"
						style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
					/>
				</linearGradient>
			</defs>

			{/* Debug: Show calculated attachment positions */}
			{connections.map((connection) => {
				const from = getAttachmentPosition(
					connection.fromId,
					connection.fromType,
					connection.fromPoint
				);
				const to = getAttachmentPosition(
					connection.toId,
					connection.toType,
					connection.toPoint
				);

				return (
					<g key={`debug-${connection.id}`}>
						{/* Show where we think the attachment points are */}
						<circle
							cx={from.x}
							cy={from.y}
							r="8"
							fill="red"
							opacity="0.5"
						/>
						<circle
							cx={to.x}
							cy={to.y}
							r="8"
							fill="green"
							opacity="0.5"
						/>
					</g>
				);
			})}

			{connections.map((connection) => {
				const from = getAttachmentPosition(
					connection.fromId,
					connection.fromType,
					connection.fromPoint
				);
				const to = getAttachmentPosition(
					connection.toId,
					connection.toType,
					connection.toPoint
				);

				if (!from || !to) return null;

				// Find the path data for this connection
				const pathData = pathsData.find(
					(p) => p.connectionId === connection.id
				);
				if (!pathData) return null;

				const path = pathData.path;

				const isHovered = hoveredId === connection.id;

				// Calculate midpoint for delete button
				// Use the actual path segments to find the true midpoint on the line
				const midPoint = getPointOnPath(pathData.segments, 0.5);
				const midX = midPoint.x;
				const midY = midPoint.y;

				// Get intersections for this connection (where it needs bridges)
				const connectionIntersections =
					intersections.get(connection.id) || [];

				return (
					<g key={connection.id}>
						{/* Invisible thick line for hover */}
						<path
							d={path}
							stroke="transparent"
							strokeWidth="20"
							fill="none"
							style={{ cursor: "pointer", pointerEvents: "stroke" }}
							onMouseEnter={() => setHoveredId(connection.id)}
							onMouseLeave={() => setHoveredId(null)}
							onClick={(e) => {
								e.stopPropagation();
								onRemove(connection.id);
							}}
						/>

						{/* White bridge gaps at intersections (makes line appear to go under) */}
						{connectionIntersections.map((intersection, idx) => (
							<circle
								key={`bridge-${connection.id}-${idx}`}
								cx={intersection.x}
								cy={intersection.y}
								r="6"
								fill="white"
								style={{ pointerEvents: "none" }}
							/>
						))}

						{/* Glow */}
						<path
							d={path}
							stroke={
								isHovered
									? "url(#connectionGradientHover)"
									: "url(#connectionGradient)"
							}
							strokeWidth={isHovered ? "5" : "4"}
							fill="none"
							opacity="0.3"
							filter="blur(4px)"
							style={{ pointerEvents: "none" }}
						/>

						{/* Main line */}
						<path
							d={path}
							stroke={
								isHovered
									? "url(#connectionGradientHover)"
									: "url(#connectionGradient)"
							}
							strokeWidth={isHovered ? "4" : "3"}
							fill="none"
							strokeLinecap="round"
							strokeDasharray={
								connection.style === "dashed" ? "8,8" : "none"
							}
							style={{ pointerEvents: "none" }}
						/>

						{/* Arrow at end */}
						<circle
							cx={to.x}
							cy={to.y}
							r={isHovered ? "5" : "4"}
							fill={
								isHovered
									? "url(#connectionGradientHover)"
									: "url(#connectionGradient)"
							}
							style={{ pointerEvents: "none" }}
						/>

						{/* Actions on hover */}
						<g
							style={{
								cursor: "pointer",
								pointerEvents: "all",
								opacity: isHovered ? 1 : 0,
								transition: "opacity 0.2s ease-in-out",
								transitionDelay: isHovered ? "0s" : "0.5s", // Delay fade out
							}}
							onMouseEnter={() => setHoveredId(connection.id)}>
							{/* Style Toggle Button (Dashed/Solid) */}
							<g
								onClick={(e) => {
									e.stopPropagation();
									onToggleStyle(connection.id);
								}}
								transform={`translate(${midX - 12}, ${midY})`}>
								<circle
									r="10"
									fill="white"
									stroke="#3b82f6"
									strokeWidth="1.5"
									className="hover:fill-blue-50 transition-colors"
								/>
								{connection.style === "dashed" ? (
									<line
										x1="-5"
										y1="0"
										x2="5"
										y2="0"
										stroke="#3b82f6"
										strokeWidth="2"
										strokeLinecap="round"
									/>
								) : (
									<line
										x1="-5"
										y1="0"
										x2="5"
										y2="0"
										stroke="#3b82f6"
										strokeWidth="2"
										strokeLinecap="round"
										strokeDasharray="2,2"
									/>
								)}
							</g>

							{/* Delete Button */}
							<g
								onClick={(e) => {
									e.stopPropagation();
									onRemove(connection.id);
								}}
								transform={`translate(${midX + 12}, ${midY})`}>
								<circle
									r="10"
									fill="#ef4444"
									className="hover:fill-red-600 transition-colors"
								/>
								<path
									d="M-3 -3 L3 3 M3 -3 L-3 3"
									stroke="white"
									strokeWidth="2"
									strokeLinecap="round"
								/>
							</g>
						</g>
					</g>
				);
			})}

			{/* Drag Connection Line */}
			{dragConnection &&
				(() => {
					const from = getAttachmentPosition(
						dragConnection.fromId,
						dragConnection.fromType,
						dragConnection.fromPoint
					);
					if (!from) return null;

					const to = { x: dragConnection.toX, y: dragConnection.toY };
					const { path } = calculatePath(
						from,
						to,
						dragConnection.fromPoint,
						"auto"
					);

					return (
						<g>
							<path
								d={path}
								stroke="url(#connectionGradient)"
								strokeWidth="3"
								fill="none"
								strokeDasharray="5,5"
								className="animate-pulse"
							/>
							<circle cx={to.x} cy={to.y} r="4" fill="#3b82f6" />
						</g>
					);
				})()}
		</svg>
	);
}
