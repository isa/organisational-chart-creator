import { useState, useRef, useEffect } from "react";
import {
	Upload,
	Save,
	ZoomIn,
	ZoomOut,
	RotateCcw,
	Sparkles,
	MousePointer2,
	ChevronLeft,
	ChevronRight,
	Download,
	Users,
} from "lucide-react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { PeopleSidebar } from "./PeopleSidebar";
import { ClientSidebar } from "./ClientSidebar";
import { PersonCard } from "./PersonCard";
import { ClientSection } from "./ClientSection";
import { ConnectionLines } from "./ConnectionLines";
import { GroupBackground, GroupControls } from "./GroupOverlay";

export interface Person {
	id: string;
	name: string;
	title: string;
	department: string;
	country: string;
	imageUrl?: string;
	billable?: boolean;
}

export interface PlacedPerson extends Person {
	x: number;
	y: number;
	parentClientId?: string; // If inside a client section
	instanceId: string; // Unique instance ID for each placed person
}

export interface Client {
	id: string;
	name: string;
	logoUrl?: string;
	country?: string;
}

export interface PlacedClient {
	id: string;
	name: string;
	logoUrl?: string;
	country?: string;
	x: number;
	y: number;
	peopleIds: string[]; // Max 3 people
	instanceId: string; // Unique instance ID for each placed client
}

export interface Connection {
	id: string;
	fromId: string;
	fromType: "person" | "client";
	toId: string;
	toType: "person" | "client";
	fromPoint: "top" | "right" | "bottom" | "left";
	toPoint: "top" | "right" | "bottom" | "left";
	style?: "solid" | "dashed";
}

export interface Group {
	id: string;
	title: string;
	memberIds: string[];
	color?: string;
}

export function OrgChartCanvas() {
	// Initialize state from localStorage if available
	const [people, setPeople] = useState<Person[]>(() => {
		const saved = localStorage.getItem("org-chart-people");
		return saved ? JSON.parse(saved) : [];
	});

	const [clients, setClients] = useState<Client[]>(() => {
		const saved = localStorage.getItem("org-chart-clients");
		return saved ? JSON.parse(saved) : [];
	});

	const [placedPeople, setPlacedPeople] = useState<PlacedPerson[]>(() => {
		const saved = localStorage.getItem("org-chart-placedPeople");
		return saved ? JSON.parse(saved) : [];
	});

	const [placedClients, setPlacedClients] = useState<PlacedClient[]>(() => {
		const saved = localStorage.getItem("org-chart-placedClients");
		return saved ? JSON.parse(saved) : [];
	});

	const [connections, setConnections] = useState<Connection[]>(() => {
		const saved = localStorage.getItem("org-chart-connections");
		return saved ? JSON.parse(saved) : [];
	});

	const [groups, setGroups] = useState<Group[]>(() => {
		const saved = localStorage.getItem("org-chart-groups");
		return saved ? JSON.parse(saved) : [];
	});

	const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

	const [isAutoPanEnabled, setIsAutoPanEnabled] = useState(() => {
		const saved = localStorage.getItem("org-chart-auto-pan");
		return saved ? JSON.parse(saved) : false;
	});

	// Persist state changes to localStorage
	useEffect(() => {
		localStorage.setItem("org-chart-people", JSON.stringify(people));
	}, [people]);

	useEffect(() => {
		localStorage.setItem("org-chart-clients", JSON.stringify(clients));
	}, [clients]);

	useEffect(() => {
		localStorage.setItem(
			"org-chart-placedPeople",
			JSON.stringify(placedPeople)
		);
	}, [placedPeople]);

	useEffect(() => {
		localStorage.setItem(
			"org-chart-placedClients",
			JSON.stringify(placedClients)
		);
	}, [placedClients]);

	useEffect(() => {
		localStorage.setItem(
			"org-chart-connections",
			JSON.stringify(connections)
		);
	}, [connections]);

	useEffect(() => {
		localStorage.setItem("org-chart-groups", JSON.stringify(groups));
	}, [groups]);

	useEffect(() => {
		localStorage.setItem(
			"org-chart-auto-pan",
			JSON.stringify(isAutoPanEnabled)
		);
	}, [isAutoPanEnabled]);

	const [scale, setScale] = useState(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [panStart, setPanStart] = useState({ x: 0, y: 0 });

	const [connectingFrom, setConnectingFrom] = useState<{
		id: string;
		type: "person" | "client";
		point: "top" | "right" | "bottom" | "left";
	} | null>(null);

	const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

	const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
	const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

	const canvasRef = useRef<HTMLDivElement>(null);

	// Helper to get item dimensions (used in AutoLayout and AutoPan)
	const getItemDimensions = (item: PlacedPerson | PlacedClient) => {
		if ("title" in item) {
			// PersonCard dimensions
			return { width: 280, height: 100 };
		} else {
			// ClientSection dimensions - need to match actual rendered size
			const peopleInClient = placedPeople.filter(
				(p) => p.parentClientId === item.instanceId
			);
			const numPeople = peopleInClient.length;
			const hasDropZone = numPeople < 3;

			const headerHeight = 70;
			const containerPaddingTop = 16;
			const containerPaddingBottom = 16;
			const minContentHeight = 100;
			const personCardHeight = 68;
			const cardGap = 8;
			const dropZoneHeight = 44;

			let peopleCardsHeight = 0;
			if (numPeople > 0) {
				peopleCardsHeight =
					numPeople * personCardHeight + (numPeople - 1) * cardGap;
			}

			const totalDropZoneHeight = hasDropZone
				? dropZoneHeight + (numPeople > 0 ? cardGap : 0)
				: 0;
			const contentAreaHeight = Math.max(
				minContentHeight,
				peopleCardsHeight + totalDropZoneHeight
			);
			const height =
				headerHeight +
				containerPaddingTop +
				contentAreaHeight +
				containerPaddingBottom;

			return { width: 360, height };
		}
	};

	const fitView = (
		currentPeople = placedPeople,
		currentClients = placedClients
	) => {
		const canvasRefCurrent = canvasRef.current;
		if (!canvasRefCurrent) return;

		const allItems = [
			...currentPeople.filter((p) => !p.parentClientId),
			...currentClients,
		];

		if (allItems.length === 0) return;

		const padding = 100;
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		allItems.forEach((item) => {
			const dims = getItemDimensions(item);
			minX = Math.min(minX, item.x);
			minY = Math.min(minY, item.y);
			maxX = Math.max(maxX, item.x + dims.width);
			maxY = Math.max(maxY, item.y + dims.height);
		});

		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;
		const containerWidth = canvasRefCurrent.clientWidth;
		const containerHeight = canvasRefCurrent.clientHeight;

		const scaleX = (containerWidth - padding * 2) / contentWidth;
		const scaleY = (containerHeight - padding * 2) / contentHeight;
		let newScale = Math.min(scaleX, scaleY);

		newScale = Math.min(Math.max(newScale, 0.3), 2);

		const contentCenterX = minX + contentWidth / 2;
		const contentCenterY = minY + contentHeight / 2;

		const newPanX = containerWidth / 2 - contentCenterX * newScale;
		const newPanY = containerHeight / 2 - contentCenterY * newScale;

		setScale(newScale);
		setPan({ x: newPanX, y: newPanY });
	};

	const prevPeopleLength = useRef(placedPeople.length);
	const prevClientsLength = useRef(placedClients.length);

	useEffect(() => {
		if (isAutoPanEnabled) {
			const peopleChanged = placedPeople.length !== prevPeopleLength.current;
			const clientsChanged =
				placedClients.length !== prevClientsLength.current;

			if (peopleChanged || clientsChanged) {
				fitView();
			}
		}
		prevPeopleLength.current = placedPeople.length;
		prevClientsLength.current = placedClients.length;
	}, [placedPeople, placedClients, isAutoPanEnabled]);

	useEffect(() => {
		if (isAutoPanEnabled) {
			fitView();
		}
	}, [isAutoPanEnabled]);

	const snapToGrid = (value: number, gridSize: number = 20) => {
		return Math.round(value / gridSize) * gridSize;
	};

	const handleDropPerson = (e: React.DragEvent, person: Person) => {
		e.preventDefault();

		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (!canvasRect) return;

		const x = snapToGrid((e.clientX - canvasRect.left - pan.x) / scale);
		const y = snapToGrid((e.clientY - canvasRect.top - pan.y) / scale);

		setPlacedPeople([
			...placedPeople,
			{ ...person, instanceId: Date.now().toString(), x, y },
		]);
	};

	const handleDropClient = (e: React.DragEvent, client: Client) => {
		e.preventDefault();

		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (!canvasRect) return;

		const x = snapToGrid((e.clientX - canvasRect.left - pan.x) / scale);
		const y = snapToGrid((e.clientY - canvasRect.top - pan.y) / scale);

		setPlacedClients([
			...placedClients,
			{ ...client, instanceId: Date.now().toString(), x, y, peopleIds: [] },
		]);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();

		const dataType = e.dataTransfer.getData("type");

		if (dataType === "person") {
			const personData = e.dataTransfer.getData("person");
			if (personData) {
				const person: Person = JSON.parse(personData);
				handleDropPerson(e, person);
			}
		} else if (dataType === "client") {
			const clientData = e.dataTransfer.getData("client");
			if (clientData) {
				const client: Client = JSON.parse(clientData);
				handleDropClient(e, client);
			}
		}
	};

	const handlePersonMove = (
		instanceId: string,
		deltaX: number,
		deltaY: number
	) => {
		setPlacedPeople((prev) =>
			prev.map((person) =>
				person.instanceId === instanceId && !person.parentClientId
					? {
							...person,
							x: person.x + deltaX / scale,
							y: person.y + deltaY / scale,
					  }
					: person
			)
		);
	};

	const handlePersonMoveEnd = (instanceId: string) => {
		// Snap to grid when drag ends
		setPlacedPeople((prev) =>
			prev.map((person) =>
				person.instanceId === instanceId && !person.parentClientId
					? { ...person, x: snapToGrid(person.x), y: snapToGrid(person.y) }
					: person
			)
		);
	};

	const handleClientMove = (
		instanceId: string,
		deltaX: number,
		deltaY: number
	) => {
		setPlacedClients((prev) =>
			prev.map((client) =>
				client.instanceId === instanceId
					? {
							...client,
							x: client.x + deltaX / scale,
							y: client.y + deltaY / scale,
					  }
					: client
			)
		);
	};

	const handleClientMoveEnd = (instanceId: string) => {
		// Snap to grid when drag ends
		setPlacedClients((prev) =>
			prev.map((client) =>
				client.instanceId === instanceId
					? { ...client, x: snapToGrid(client.x), y: snapToGrid(client.y) }
					: client
			)
		);
	};

	const handleToggleBillable = (instanceId: string) => {
		setPlacedPeople((prev) =>
			prev.map((person) =>
				person.instanceId === instanceId
					? { ...person, billable: !person.billable }
					: person
			)
		);
	};

	const handleUpdatePersonRank = (instanceId: string, rank: number) => {
		setPlacedPeople((prev) =>
			prev.map((person) =>
				person.instanceId === instanceId ? { ...person, rank } : person
			)
		);
	};

	const handleUpdateClientRank = (instanceId: string, rank: number) => {
		setPlacedClients((prev) =>
			prev.map((client) =>
				client.instanceId === instanceId ? { ...client, rank } : client
			)
		);
	};

	const handleRemovePerson = (instanceId: string) => {
		setPlacedPeople((prev) =>
			prev.filter((p) => p.instanceId !== instanceId)
		);
		setConnections((prev) =>
			prev.filter((c) => c.fromId !== instanceId && c.toId !== instanceId)
		);

		// Remove from client sections
		setPlacedClients((prev) =>
			prev.map((client) => ({
				...client,
				peopleIds: client.peopleIds.filter((pid) => pid !== instanceId),
			}))
		);
	};

	const handleRemoveClient = (instanceId: string) => {
		// Identify people inside this client to remove connections
		const peopleToRemove = placedPeople
			.filter((p) => p.parentClientId === instanceId)
			.map((p) => p.instanceId);

		// Remove people from this client
		setPlacedPeople((prev) =>
			prev.filter((person) => person.parentClientId !== instanceId)
		);

		setPlacedClients((prev) =>
			prev.filter((c) => c.instanceId !== instanceId)
		);

		// Remove connections for client AND removed people
		setConnections((prev) =>
			prev.filter(
				(c) =>
					c.fromId !== instanceId &&
					c.toId !== instanceId &&
					!peopleToRemove.includes(c.fromId) &&
					!peopleToRemove.includes(c.toId)
			)
		);
	};

	const handleAddPersonToClient = (
		personId: string,
		clientInstanceId: string,
		canvasInstanceId?: string
	) => {
		const client = placedClients.find(
			(c) => c.instanceId === clientInstanceId
		);
		if (!client || client.peopleIds.length >= 3) return;

		// Always create a NEW instance for the client (allows same person in multiple clients)
		const person = people.find((p) => p.id === personId);
		if (!person) return;

		// Check if there's an existing placed person to preserve billability and rank
		const existingPlacedPerson = placedPeople.find((p) => p.id === personId);

		const newInstanceId = Date.now().toString() + Math.random(); // Ensure uniqueness
		const newPerson: PlacedPerson = {
			...person,
			instanceId: newInstanceId,
			x: client.x,
			y: client.y,
			parentClientId: clientInstanceId,
			// Preserve billability from existing placed instance if available
			billable: existingPlacedPerson?.billable ?? person.billable,
		};

		setPlacedPeople((prev) => {
			// If this is from a canvas card, remove the original canvas instance
			if (canvasInstanceId) {
				return [
					...prev.filter((p) => p.instanceId !== canvasInstanceId),
					newPerson,
				];
			}
			return [...prev, newPerson];
		});

		setPlacedClients((prev) =>
			prev.map((c) =>
				c.instanceId === clientInstanceId
					? { ...c, peopleIds: [...c.peopleIds, newInstanceId] }
					: c
			)
		);

		// If removing from canvas, also remove any connections
		if (canvasInstanceId) {
			setConnections((prev) =>
				prev.filter(
					(c) =>
						c.fromId !== canvasInstanceId && c.toId !== canvasInstanceId
				)
			);
		}
	};

	const handleRemovePersonFromClient = (
		personInstanceId: string,
		clientInstanceId: string
	) => {
		// Remove from client
		setPlacedClients((prev) =>
			prev.map((c) =>
				c.instanceId === clientInstanceId
					? {
							...c,
							peopleIds: c.peopleIds.filter(
								(id) => id !== personInstanceId
							),
					  }
					: c
			)
		);

		// Completely remove the person instance (cannot be dragged back)
		setPlacedPeople((prev) =>
			prev.filter((p) => p.instanceId !== personInstanceId)
		);

		// Remove any connections to this person
		setConnections((prev) =>
			prev.filter(
				(c) => c.fromId !== personInstanceId && c.toId !== personInstanceId
			)
		);
	};

	const handleStartConnection = (
		id: string,
		type: "person" | "client",
		point: "top" | "right" | "bottom" | "left",
		e: React.MouseEvent
	) => {
		setConnectingFrom({ id, type, point });
		// Initialize mouse position immediately
		const canvasRect = canvasRef.current?.getBoundingClientRect();
		if (canvasRect) {
			const x = (e.clientX - canvasRect.left - pan.x) / scale;
			const y = (e.clientY - canvasRect.top - pan.y) / scale;
			setMousePos({ x, y });
		}
	};

	// Handle global mouse events for connection dragging
	useEffect(() => {
		if (connectingFrom) {
			const handleGlobalMouseMove = (e: MouseEvent) => {
				const canvasRect = canvasRef.current?.getBoundingClientRect();
				if (canvasRect) {
					const x = (e.clientX - canvasRect.left - pan.x) / scale;
					const y = (e.clientY - canvasRect.top - pan.y) / scale;
					setMousePos({ x, y });
				}
			};

			const handleGlobalMouseUp = () => {
				// If we released over a valid target, AttachmentPoint's onMouseUp would have fired
				// and stopped propagation. If we get here, it means we dropped on empty space.
				setConnectingFrom(null);
			};

			window.addEventListener("mousemove", handleGlobalMouseMove);
			window.addEventListener("mouseup", handleGlobalMouseUp);

			return () => {
				window.removeEventListener("mousemove", handleGlobalMouseMove);
				window.removeEventListener("mouseup", handleGlobalMouseUp);
			};
		}
	}, [connectingFrom, pan, scale]);

	const handleEndConnection = (
		toId: string,
		toType: "person" | "client",
		toPoint: "top" | "right" | "bottom" | "left"
	) => {
		if (!connectingFrom) return;

		// Don't connect to self
		if (connectingFrom.id === toId) {
			setConnectingFrom(null);
			return;
		}

		const newConnection: Connection = {
			id: Date.now().toString(),
			fromId: connectingFrom.id,
			fromType: connectingFrom.type,
			toId,
			toType,
			fromPoint: connectingFrom.point,
			toPoint,
			style: "solid",
		};

		setConnections([...connections, newConnection]);
		setConnectingFrom(null);
	};

	const handleRemoveConnection = (connectionId: string) => {
		setConnections((prev) => prev.filter((c) => c.id !== connectionId));
	};

	const handleToggleConnectionStyle = (connectionId: string) => {
		setConnections((prev) =>
			prev.map((c) =>
				c.id === connectionId
					? { ...c, style: c.style === "dashed" ? "solid" : "dashed" }
					: c
			)
		);
	};

	const handleSelect = (id: string, multi: boolean) => {
		if (multi) {
			setSelectedItemIds((prev) =>
				prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
			);
		} else {
			setSelectedItemIds([id]);
		}
	};

	const handleCreateGroup = () => {
		if (selectedItemIds.length === 0) {
			alert("Please select at least one item to group.");
			return;
		}

		const title = prompt("Enter group name:", "Marketing Team of EMEA");
		if (!title) return;

		const newGroup: Group = {
			id: crypto.randomUUID(),
			title,
			memberIds: [...selectedItemIds],
		};

		setGroups((prev) => [...prev, newGroup]);
		setSelectedItemIds([]);
	};

	const handleDeleteGroup = (id: string) => {
		if (confirm("Are you sure you want to delete this group?")) {
			setGroups((prev) => prev.filter((g) => g.id !== id));
		}
	};

	const handleCanvasMouseDown = (e: React.MouseEvent) => {
		// Clear selection if clicking on empty space
		const target = e.target as HTMLElement;
		const isInteractiveElement = target.closest(
			".person-card, .client-section, button, .attachment-point, .group-overlay, .group-title"
		);

		if (!isInteractiveElement) {
			setSelectedItemIds([]);
		}

		if (e.button === 0 && !isInteractiveElement) {
			setIsPanning(true);
			setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
		}
	};

	const handleCanvasMouseMove = (e: React.MouseEvent) => {
		if (isPanning) {
			setPan({
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y,
			});
		}
	};

	const handleCanvasMouseUp = () => {
		setIsPanning(false);
	};

	const handleZoomIn = () => {
		setScale((prev) => Math.min(prev + 0.1, 2));
	};

	const handleZoomOut = () => {
		setScale((prev) => Math.max(prev - 0.1, 0.3));
	};

	const handleResetView = () => {
		setScale(1);
		setPan({ x: 0, y: 0 });
	};

	const handleAddPerson = (person: Omit<Person, "id">) => {
		const id = crypto.randomUUID();
		let imageUrl = person.imageUrl?.trim();

		// If using pravatar, append UUID to ensure consistent unique avatar
		if (
			imageUrl &&
			imageUrl.includes("pravatar.cc") &&
			!imageUrl.includes("u=")
		) {
			const separator = imageUrl.includes("?") ? "&" : "?";
			imageUrl = `${imageUrl}${separator}u=${id}`;
		}

		const newPerson: Person = {
			...person,
			id,
			imageUrl,
		};
		setPeople((prev) => [...prev, newPerson]);
	};

	const handleDeletePerson = (personId: string) => {
		// Remove from people list
		setPeople((prev) => prev.filter((p) => p.id !== personId));
		// Remove all instances from canvas
		setPlacedPeople((prev) => prev.filter((p) => p.id !== personId));
		// Remove from all client sections
		setPlacedClients((prev) =>
			prev.map((client) => ({
				...client,
				peopleIds: client.peopleIds.filter(
					(id) => !id.startsWith(personId)
				),
			}))
		);
		// Remove all connections involving this person's instances
		setConnections((prev) =>
			prev.filter(
				(c) =>
					!c.fromId.startsWith(personId) && !c.toId.startsWith(personId)
			)
		);
	};

	const handleUpdatePersonRankInSidebar = (personId: string, rank: number) => {
		setPeople((prev) =>
			prev.map((person) =>
				person.id === personId ? { ...person, rank } : person
			)
		);
	};

	const handleAddClient = (client: Omit<Client, "id">) => {
		const newClient: Client = {
			...client,
			id: crypto.randomUUID(),
		};
		setClients((prev) => [...prev, newClient]);
	};

	const handleDeleteClient = (clientId: string) => {
		// Remove from clients list
		setClients((prev) => prev.filter((c) => c.id !== clientId));
		// Remove all instances from canvas
		const clientInstancesToRemove = placedClients
			.filter((c) => c.id === clientId)
			.map((c) => c.instanceId);
		setPlacedClients((prev) => prev.filter((c) => c.id !== clientId));
		// Remove people that were inside these client instances
		setPlacedPeople((prev) =>
			prev.filter(
				(p) => !clientInstancesToRemove.includes(p.parentClientId || "")
			)
		);
		// Remove all connections involving these client instances
		setConnections((prev) =>
			prev.filter(
				(c) =>
					!clientInstancesToRemove.includes(c.fromId) &&
					!clientInstancesToRemove.includes(c.toId)
			)
		);
	};

	const handleUpdateClientRankInSidebar = (clientId: string, rank: number) => {
		setClients((prev) =>
			prev.map((client) =>
				client.id === clientId ? { ...client, rank } : client
			)
		);
	};

	const handleAutoLayout = () => {
		console.log("=== AUTO LAYOUT CLICKED ===");

		// Get all items on canvas
		const allItems = [
			...placedPeople.filter((p) => !p.parentClientId),
			...placedClients,
		];

		if (allItems.length === 0) {
			console.log("No items on canvas");
			alert("No items on canvas to layout!");
			return;
		}

		// Helper to get item dimensions
		// Using the component-level helper now

		// 1. Build Graph & Hierarchy
		const nodeMap = new Map<string, PlacedPerson | PlacedClient>();
		allItems.forEach((item) => nodeMap.set(item.instanceId, item));

		// Map to store parent lookup for items inside clients
		const itemToClientMap = new Map<string, string>();
		placedClients.forEach((client) => {
			client.peopleIds.forEach((personId) => {
				itemToClientMap.set(personId, client.instanceId);
			});
		});

		const childrenMap = new Map<string, string[]>();
		const parentsMap = new Map<string, string[]>();

		// Initialize maps
		allItems.forEach((item) => {
			childrenMap.set(item.instanceId, []);
			parentsMap.set(item.instanceId, []);
		});

		// Build relationships based on connections and ranks
		connections.forEach((conn) => {
			// Resolve IDs to their containers if they are inside clients
			let fromId = conn.fromId;
			let toId = conn.toId;

			if (itemToClientMap.has(fromId)) {
				fromId = itemToClientMap.get(fromId)!;
			}
			if (itemToClientMap.has(toId)) {
				toId = itemToClientMap.get(toId)!;
			}

			// Skip self-connections (e.g. connecting two people inside same client)
			if (fromId === toId) return;

			const fromItem = nodeMap.get(fromId);
			const toItem = nodeMap.get(toId);

			if (fromItem && toItem) {
				let parentId = fromId;
				let childId = toId;

				// Rule: Structure (Visual Hierarchy) > Rank > Connection Direction
				// The user wants "Structure" to take priority. In a canvas, "Structure" is best inferred from
				// vertical position (Y-coordinate). Top items are parents of bottom items.

				const yDiff = toItem.y - fromItem.y; // Positive if To is below From
				const isVerticalGapSignificant = Math.abs(yDiff) > 40; // Significant gap

				if (isVerticalGapSignificant) {
					// 1. Visual Hierarchy: The item higher on screen (smaller Y) is the Parent
					if (fromItem.y < toItem.y) {
						parentId = fromId;
						childId = toId;
					} else {
						parentId = toId;
						childId = fromId;
					}
				} else {
					// 2. No clear visual hierarchy (side-by-side or overlapping) -> Fallback to Connection Direction
					// If From -> To, assume From is Parent
					parentId = fromId;
					childId = toId;
				}

				// Strict Tree Rule:
				// A child should ideally have only ONE parent for layout purposes.
				// If multiple parents claim a child, we pick the one that is visually higher (smaller Y).
				const existingParents = parentsMap.get(childId) || [];
				if (existingParents.length > 0) {
					// Compare with existing parent
					const currentParentId = existingParents[0];
					const currentParent = nodeMap.get(currentParentId);
					const currentParentY = currentParent?.y ?? 9999;
					const newParentY = nodeMap.get(parentId)?.y ?? 9999;

					if (newParentY < currentParentY) {
						// New parent is better (visually higher), replace old parent
						// Remove child from old parent's list
						const oldParentChildren =
							childrenMap.get(currentParentId) || [];
						childrenMap.set(
							currentParentId,
							oldParentChildren.filter((id) => id !== childId)
						);
						// Clear child's parent list and add new one
						parentsMap.set(childId, [parentId]);
						childrenMap.get(parentId)?.push(childId);
					} else {
						// Existing parent is better or equal, ignore this connection for layout
					}
				} else {
					// No existing parent, just add
					childrenMap.get(parentId)?.push(childId);
					parentsMap.get(childId)?.push(parentId);
				}
			}
		});

		// 2. Identify Roots (nodes with no parents in our hierarchy)
		let roots = allItems.filter((item) => {
			const parents = parentsMap.get(item.instanceId) || [];
			return parents.length === 0;
		});

		// Fallback: If no roots found (cycle?), pick the one with smallest Y coordinate
		if (roots.length === 0 && allItems.length > 0) {
			const minY = Math.min(...allItems.map((i) => i.y));
			roots = allItems.filter((i) => Math.abs(i.y - minY) < 10);
		}

		// 3. Tree Layout Algorithm
		const MIN_HORIZONTAL_GAP = 60;
		const MIN_VERTICAL_GAP = 120; // Increased vertical gap for cleaner lines
		const START_X = 100;
		const START_Y = 100;

		const visited = new Set<string>();
		const nodeLevels = new Map<string, number>();
		const subtreeWidths = new Map<string, number>();

		// Pass 1: Calculate Subtree Widths (Post-Order Traversal)
		const calculateMetrics = (nodeId: string, level: number): number => {
			if (visited.has(nodeId)) return subtreeWidths.get(nodeId) || 0;
			visited.add(nodeId);
			nodeLevels.set(nodeId, level);

			const item = nodeMap.get(nodeId)!;
			const dims = getItemDimensions(item);
			const children = childrenMap.get(nodeId) || [];

			if (children.length === 0) {
				subtreeWidths.set(nodeId, dims.width);
				return dims.width;
			}

			let childrenTotalWidth = 0;
			children.forEach((childId) => {
				childrenTotalWidth += calculateMetrics(childId, level + 1);
			});

			// Add gaps between children
			childrenTotalWidth += (children.length - 1) * MIN_HORIZONTAL_GAP;

			// Subtree width is max of node width and children block width
			const width = Math.max(dims.width, childrenTotalWidth);
			subtreeWidths.set(nodeId, width);
			return width;
		};

		// Reset visited for calculation
		visited.clear();
		roots.forEach((root) => calculateMetrics(root.instanceId, 0));

		// Pass 2: Assign Positions (Pre-Order Traversal)
		const newPeoplePositions = new Map<string, { x: number; y: number }>();
		const newClientPositions = new Map<string, { x: number; y: number }>();

		// Helper to store position
		const savePosition = (nodeId: string, x: number, y: number) => {
			const item = nodeMap.get(nodeId);
			if (!item) return;
			if ("title" in item) {
				newPeoplePositions.set(nodeId, {
					x: snapToGrid(x),
					y: snapToGrid(y),
				});
			} else {
				newClientPositions.set(nodeId, {
					x: snapToGrid(x),
					y: snapToGrid(y),
				});
			}
		};

		// Calculate Level Y positions to ensure alignment
		const levelHeights = new Map<number, number>();
		nodeLevels.forEach((level, id) => {
			const item = nodeMap.get(id)!;
			const h = getItemDimensions(item).height;
			levelHeights.set(level, Math.max(levelHeights.get(level) || 0, h));
		});

		const levelY = new Map<number, number>();
		let currentLevelY = START_Y;
		const maxLevel = Math.max(0, ...Array.from(nodeLevels.values()));

		for (let l = 0; l <= maxLevel; l++) {
			levelY.set(l, currentLevelY);
			currentLevelY += (levelHeights.get(l) || 100) + MIN_VERTICAL_GAP;
		}

		// Recursive positioning
		const positionNode = (nodeId: string, x: number) => {
			const item = nodeMap.get(nodeId)!;
			const dims = getItemDimensions(item);
			const children = childrenMap.get(nodeId) || [];
			const width = subtreeWidths.get(nodeId)!;
			const level = nodeLevels.get(nodeId)!;
			const y = levelY.get(level)!;

			// Center node within its allocated subtree width
			const nodeX = x + width / 2 - dims.width / 2;
			savePosition(nodeId, nodeX, y);

			// Position children
			if (children.length > 0) {
				// Calculate children block width
				let childrenBlockWidth = 0;
				children.forEach((childId) => {
					childrenBlockWidth += subtreeWidths.get(childId)!;
				});
				childrenBlockWidth += (children.length - 1) * MIN_HORIZONTAL_GAP;

				// Center children block relative to parent's allocated width
				let currentChildX = x + (width - childrenBlockWidth) / 2;

				children.forEach((childId) => {
					positionNode(childId, currentChildX);
					currentChildX +=
						subtreeWidths.get(childId)! + MIN_HORIZONTAL_GAP;
				});
			}
		};

		// Layout Roots
		let currentRootX = START_X;
		roots.forEach((root) => {
			const width =
				subtreeWidths.get(root.instanceId) || getItemDimensions(root).width;
			positionNode(root.instanceId, currentRootX);
			currentRootX += width + MIN_HORIZONTAL_GAP * 2;
		});

		// Batch update positions
		let finalPeople = placedPeople;
		let finalClients = placedClients;

		if (newPeoplePositions.size > 0) {
			finalPeople = placedPeople.map((p) => {
				const newPos = newPeoplePositions.get(p.instanceId);
				return newPos && !p.parentClientId ? { ...p, ...newPos } : p;
			});
			setPlacedPeople(finalPeople);
		}

		if (newClientPositions.size > 0) {
			finalClients = placedClients.map((c) => {
				const newPos = newClientPositions.get(c.instanceId);
				return newPos ? { ...c, ...newPos } : c;
			});
			setPlacedClients(finalClients);
		}

		if (isAutoPanEnabled) {
			// Small delay to ensure render cycle catches up if needed, though passing data directly works for calculation
			setTimeout(() => fitView(finalPeople, finalClients), 10);
		}
	};

	const handleDownloadPDF = async () => {
		const canvasRefCurrent = canvasRef.current;
		if (!canvasRefCurrent) return;

		try {
			// Calculate bounding box of all content
			const allItems = [
				...placedPeople
					.filter((p) => !p.parentClientId)
					.map((p) => ({
						x: p.x,
						y: p.y,
						width: 280,
						height: 100,
					})),
				...placedClients.map((c) => ({
					x: c.x,
					y: c.y,
					width: 320,
					height: 220, // Approximate max height for client sections
				})),
			];

			if (allItems.length === 0) {
				alert("No items on canvas to export!");
				return;
			}

			// Find bounds with padding
			const padding = 40;
			const minX = Math.min(...allItems.map((i) => i.x)) - padding;
			const minY = Math.min(...allItems.map((i) => i.y)) - padding;
			const maxX = Math.max(...allItems.map((i) => i.x + i.width)) + padding;
			const maxY =
				Math.max(...allItems.map((i) => i.y + i.height)) + padding;

			const contentWidth = maxX - minX;
			const contentHeight = maxY - minY;

			// Create a temporary container for export
			const exportContainer = document.createElement("div");
			exportContainer.style.position = "fixed";
			exportContainer.style.top = "0";
			exportContainer.style.left = "0";
			exportContainer.style.width = contentWidth + "px";
			exportContainer.style.height = contentHeight + "px";
			exportContainer.style.backgroundColor = "#ffffff";
			exportContainer.style.zIndex = "-9999";
			exportContainer.style.pointerEvents = "none";

			// Clone the content wrapper (the transformed div inside canvas)
			const contentDiv = canvasRefCurrent.querySelector(
				'[style*="transform"]'
			);
			if (contentDiv) {
				const clonedContent = contentDiv.cloneNode(true) as HTMLElement;
				// Reset transform and adjust for bounding box
				clonedContent.style.transform = `translate(${-minX}px, ${-minY}px)`;
				clonedContent.style.transformOrigin = "0 0";

				// Remove interactive elements from clone
				clonedContent
					.querySelectorAll(".attachment-point, button")
					.forEach((el) => el.remove());

				exportContainer.appendChild(clonedContent);
			}

			document.body.appendChild(exportContainer);

			// Wait for render
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Capture the export container
			const pngDataUrl = await toPng(exportContainer, {
				pixelRatio: 2,
				width: contentWidth,
				height: contentHeight,
				backgroundColor: "#ffffff",
				cacheBust: true,
			});

			// Remove temporary container
			document.body.removeChild(exportContainer);

			// Create PDF
			const isLandscape = contentWidth > contentHeight;
			const pdf = new jsPDF({
				orientation: isLandscape ? "landscape" : "portrait",
				unit: "mm",
				format: "a4",
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			// Calculate scaling to fit on page
			const ratio = Math.min(
				pdfWidth / contentWidth,
				pdfHeight / contentHeight
			);
			const scaledWidth = contentWidth * ratio;
			const scaledHeight = contentHeight * ratio;

			// Center on page
			const x = (pdfWidth - scaledWidth) / 2;
			const y = (pdfHeight - scaledHeight) / 2;

			pdf.addImage(pngDataUrl, "PNG", x, y, scaledWidth, scaledHeight);
			pdf.save("org-chart.pdf");
		} catch (error) {
			console.error("Error generating PDF:", error);
			alert("Failed to generate PDF. Please try again.");
		}
	};

	const handleSaveProject = () => {
		const projectData = {
			version: "1.0",
			timestamp: Date.now(),
			people,
			clients,
			placedPeople,
			placedClients,
			connections,
		};

		const blob = new Blob([JSON.stringify(projectData, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `org-chart-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const data = JSON.parse(content);

				// Basic validation
				if (
					!data.people ||
					!data.clients ||
					!data.placedPeople ||
					!data.placedClients ||
					!data.connections
				) {
					alert("Invalid project file format");
					return;
				}

				if (
					confirm(
						"This will overwrite your current project. Are you sure?"
					)
				) {
					setPeople(data.people);
					setClients(data.clients);
					setPlacedPeople(data.placedPeople);
					setPlacedClients(data.placedClients);
					setConnections(data.connections);
					alert("Project loaded successfully!");
				}
			} catch (error) {
				console.error("Error loading project:", error);
				alert("Failed to load project file");
			}
		};
		reader.readAsText(file);
		// Reset input
		e.target.value = "";
	};

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Calculate group bounds
	const groupBounds = groups
		.map((group) => {
			let minX = Infinity,
				minY = Infinity,
				maxX = -Infinity,
				maxY = -Infinity;
			let hasMembers = false;

			group.memberIds.forEach((id) => {
				const person = placedPeople.find((p) => p.instanceId === id);
				if (person) {
					const { width, height } = getItemDimensions(person);
					minX = Math.min(minX, person.x);
					minY = Math.min(minY, person.y);
					maxX = Math.max(maxX, person.x + width);
					maxY = Math.max(maxY, person.y + height);
					hasMembers = true;
				} else {
					const client = placedClients.find((c) => c.instanceId === id);
					if (client) {
						const { width, height } = getItemDimensions(client);
						minX = Math.min(minX, client.x);
						minY = Math.min(minY, client.y);
						maxX = Math.max(maxX, client.x + width);
						maxY = Math.max(maxY, client.y + height);
						hasMembers = true;
					}
				}
			});

			if (!hasMembers) return null;

			const padding = 20;
			const paddingTop = 80; // Extra space for title and delete button

			return {
				...group,
				x: minX - padding,
				y: minY - paddingTop,
				width: maxX - minX + padding * 2,
				height: maxY - minY + paddingTop + padding,
			};
		})
		.filter((g): g is NonNullable<typeof g> => g !== null);

	return (
		<div
			className={`relative w-full h-screen bg-slate-50 overflow-hidden ${
				connectingFrom ? "!cursor-pointer" : ""
			}`}>
			{/* Subtle Background Pattern */}
			<div
				className="absolute inset-0 opacity-5"
				style={{
					backgroundImage: `radial-gradient(circle at 1px 1px, rgb(51, 65, 85) 1px, transparent 0)`,
					backgroundSize: "40px 40px",
				}}></div>

			{/* Left Sidebar - People */}
			<PeopleSidebar
				people={people}
				placedPeople={placedPeople}
				onAddPerson={handleAddPerson}
				onDeletePerson={handleDeletePerson}
				onUpdateRank={handleUpdatePersonRankInSidebar}
				collapsed={leftSidebarCollapsed}
				onToggleCollapse={() =>
					setLeftSidebarCollapsed(!leftSidebarCollapsed)
				}
			/>

			{/* Left Sidebar Toggle Button */}
			<button
				onClick={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
				className="absolute top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white border border-slate-300 rounded-full shadow-md hover:bg-slate-100 transition-all duration-300"
				style={{
					left: leftSidebarCollapsed ? "1rem" : "calc(20rem - 0.75rem)",
				}}
				title={
					leftSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
				}>
				<ChevronLeft
					className={`w-4 h-4 text-slate-600 transition-transform ${
						leftSidebarCollapsed ? "rotate-180" : ""
					}`}
				/>
			</button>

			{/* Right Sidebar - Clients */}
			<ClientSidebar
				clients={clients}
				placedClients={placedClients}
				onAddClient={handleAddClient}
				onDeleteClient={handleDeleteClient}
				onUpdateRank={handleUpdateClientRankInSidebar}
				collapsed={rightSidebarCollapsed}
				onToggleCollapse={() =>
					setRightSidebarCollapsed(!rightSidebarCollapsed)
				}
			/>

			{/* Right Sidebar Toggle Button */}
			<button
				onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
				className="absolute top-1/2 -translate-y-1/2 z-30 p-1.5 bg-white border border-slate-300 rounded-full shadow-md hover:bg-slate-100 transition-all duration-300"
				style={{
					right: rightSidebarCollapsed ? "1rem" : "calc(20rem - 0.75rem)",
				}}
				title={
					rightSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
				}>
				<ChevronRight
					className={`w-4 h-4 text-slate-600 transition-transform ${
						rightSidebarCollapsed ? "rotate-180" : ""
					}`}
				/>
			</button>

			{/* Canvas */}
			<div
				ref={canvasRef}
				className="absolute top-0 bottom-0 overflow-hidden bg-white border-l border-r border-slate-200 transition-all duration-300"
				style={{
					left: leftSidebarCollapsed ? 0 : "20rem",
					right: rightSidebarCollapsed ? 0 : "20rem",
					cursor: connectingFrom
						? "pointer"
						: isPanning
						? "grabbing"
						: "grab",
				}}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onMouseDown={handleCanvasMouseDown}
				onMouseMove={handleCanvasMouseMove}
				onMouseUp={handleCanvasMouseUp}
				onMouseLeave={handleCanvasMouseUp}>
				{/* Grid */}
				<div
					className="canvas-background absolute inset-0"
					style={{
						backgroundImage: `
              linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
            `,
						backgroundSize: `${20 * scale}px ${20 * scale}px`,
						backgroundPosition: `${pan.x}px ${pan.y}px`,
					}}
				/>

				{/* Content */}
				<div
					style={{
						transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
						transformOrigin: "0 0",
						width: "100%",
						height: "100%",
						position: "relative",
						pointerEvents: connectingFrom ? "none" : "auto",
					}}>
					{/* Layer 1: Groups (Background) */}
					<div style={{ pointerEvents: "none" }}>
						{groupBounds.map((group) => (
							<GroupBackground
								key={group.id}
								id={group.id}
								x={group.x}
								y={group.y}
								width={group.width}
								height={group.height}
							/>
						))}
					</div>

					{/* Layer 2: Connection Lines */}
					<div style={{ pointerEvents: "none" }}>
						<ConnectionLines
							connections={connections}
							placedPeople={placedPeople}
							placedClients={placedClients}
							onRemove={handleRemoveConnection}
							onToggleStyle={handleToggleConnectionStyle}
							dragConnection={
								connectingFrom
									? {
											fromId: connectingFrom.id,
											fromType: connectingFrom.type,
											fromPoint: connectingFrom.point,
											toX: mousePos.x,
											toY: mousePos.y,
									  }
									: null
							}
						/>
					</div>

					{/* Layer 3: Cards (People) */}
					<div style={{ pointerEvents: "none" }}>
						{placedPeople
							.filter((person) => !person.parentClientId)
							.map((person) => (
								<PersonCard
									key={person.instanceId}
									person={person}
									onMove={handlePersonMove}
									onMoveEnd={handlePersonMoveEnd}
									onRemove={handleRemovePerson}
									onStartConnection={handleStartConnection}
									onEndConnection={handleEndConnection}
									isConnecting={
										connectingFrom?.id === person.instanceId &&
										connectingFrom?.type === "person"
									}
									connectingPoint={
										connectingFrom?.id === person.instanceId
											? connectingFrom.point
											: undefined
									}
									onToggleBillable={handleToggleBillable}
									isSelected={selectedItemIds.includes(
										person.instanceId
									)}
									onSelect={handleSelect}
								/>
							))}
					</div>

					{/* Layer 3: Cards (Clients) */}
					<div style={{ pointerEvents: "none" }}>
						{placedClients.map((client) => (
							<ClientSection
								key={client.instanceId}
								client={client}
								people={placedPeople.filter((p) =>
									client.peopleIds.includes(p.instanceId)
								)}
								onMove={handleClientMove}
								onMoveEnd={handleClientMoveEnd}
								onRemove={handleRemoveClient}
								onAddPerson={handleAddPersonToClient}
								onRemovePerson={handleRemovePersonFromClient}
								onStartConnection={handleStartConnection}
								onEndConnection={handleEndConnection}
								isConnecting={
									connectingFrom?.id === client.instanceId &&
									connectingFrom?.type === "client"
								}
								connectingPoint={
									connectingFrom?.id === client.instanceId
										? connectingFrom.point
										: undefined
								}
								isSelected={selectedItemIds.includes(client.instanceId)}
								onSelect={handleSelect}
							/>
						))}
					</div>
					{/* Group Controls (Title & Delete) - Rendered last to be on top */}
					<div
						style={{
							pointerEvents: "none",
							zIndex: 100,
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
						}}>
						{groupBounds.map((group) => (
							<GroupControls
								key={group.id}
								id={group.id}
								title={group.title}
								x={group.x}
								y={group.y}
								width={group.width}
								height={group.height}
								onDelete={handleDeleteGroup}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Zoom Controls */}
			<div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-1.5 flex gap-1">
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleLoadProject}
					accept=".json"
					className="hidden"
					style={{ display: "none" }}
				/>
				<button
					onClick={handleZoomOut}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Zoom Out">
					<ZoomOut className="w-4 h-4 text-slate-600" />
				</button>
				<button
					onClick={handleResetView}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Reset View">
					<RotateCcw className="w-4 h-4 text-slate-600" />
				</button>
				<button
					onClick={handleZoomIn}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Zoom In">
					<ZoomIn className="w-4 h-4 text-slate-600" />
				</button>
				<div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>
				<button
					onClick={handleAutoLayout}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Auto Layout">
					<Sparkles className="w-4 h-4 text-slate-600" />
				</button>
				<button
					onClick={handleCreateGroup}
					className={`p-2.5 hover:bg-slate-100 rounded-md transition-colors ${
						selectedItemIds.length === 0
							? "opacity-50 cursor-not-allowed"
							: ""
					}`}
					title="Group Selected"
					disabled={selectedItemIds.length === 0}>
					<Users className="w-4 h-4 text-slate-600" />
				</button>
				<div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>
				<button
					onClick={handleSaveProject}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Save Project">
					<Save className="w-4 h-4 text-slate-600" />
				</button>
				<button
					onClick={() => fileInputRef.current?.click()}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Load Project">
					<Upload className="w-4 h-4 text-slate-600" />
				</button>
				<button
					onClick={handleDownloadPDF}
					className="p-2.5 hover:bg-slate-100 rounded-md transition-colors"
					title="Download PDF">
					<Download className="w-4 h-4 text-slate-600" />
				</button>
				<div className="w-px h-8 bg-slate-200 mx-1 self-center"></div>
				<label
					className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors select-none ${
						isAutoPanEnabled ? "bg-blue-50" : "hover:bg-slate-100"
					}`}
					title="Auto Fit to Screen when items are added/removed">
					<input
						type="checkbox"
						checked={isAutoPanEnabled}
						onChange={(e) => setIsAutoPanEnabled(e.target.checked)}
						className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
					/>
					<span
						className={`text-xs font-medium ${
							isAutoPanEnabled ? "text-blue-700" : "text-slate-600"
						}`}>
						Auto Fit
					</span>
				</label>
			</div>

			{/* Billability Legend - Positioned inside canvas */}
			<div
				className="absolute bottom-6 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-2.5 transition-all duration-300"
				style={{
					right: rightSidebarCollapsed ? "1.5rem" : "calc(20rem + 1.5rem)",
				}}>
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center gap-2">
						<div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
						<span className="text-slate-700 text-xs">Non Billable</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
						<span className="text-slate-700 text-xs">Billable</span>
					</div>
				</div>
			</div>
		</div>
	);
}
