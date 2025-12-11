import { Users, Plus, ChevronLeft } from "lucide-react";
import { Person, PlacedPerson } from "./OrgChartCanvas";
import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface PeopleSidebarProps {
	people: Person[];
	placedPeople: PlacedPerson[];
	onAddPerson: (person: Omit<Person, "id">) => void;
	onDeletePerson: (personId: string) => void;
	onUpdateRank: (personId: string, rank: number) => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
}

export function PeopleSidebar({
	people,
	placedPeople,
	onAddPerson,
	onDeletePerson,
	onUpdateRank,
	collapsed,
	onToggleCollapse,
}: PeopleSidebarProps) {
	const generateDefaultAvatar = () => {
		return `https://i.pravatar.cc/128?u=${crypto.randomUUID()}`;
	};

	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		title: "",
		department: "Technology",
		country: "",
		imageUrl: generateDefaultAvatar(),
		rank: "",
	});

	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (showForm) {
			if (nameInputRef.current) {
				nameInputRef.current.focus();
			}
			// Regenerate UUID when opening form to ensure uniqueness for next person
			setFormData((prev) => ({
				...prev,
				imageUrl: generateDefaultAvatar(),
			}));
		}
	}, [showForm]);

	const handleDragStart = (e: React.DragEvent, person: Person) => {
		e.dataTransfer.setData("type", "person");
		e.dataTransfer.setData("person", JSON.stringify(person));
		e.dataTransfer.effectAllowed = "copy";
	};

	const getDepartmentColor = (department: string) => {
		const colors: Record<string, string> = {
			Technology: "from-blue-500 to-blue-600",
			Delivery: "from-emerald-500 to-emerald-600",
			TDC: "from-violet-500 to-violet-600",
			Sales: "from-indigo-500 to-indigo-600",
			Operations: "from-amber-500 to-amber-600",
		};
		return colors[department] || "from-slate-500 to-slate-600";
	};

	const handleAddPerson = () => {
		const personData: any = {
			name: formData.name,
			title: formData.title,
			department: formData.department,
			country: formData.country,
			imageUrl: formData.imageUrl,
		};

		if (formData.rank) {
			personData.rank = parseInt(formData.rank);
		}

		onAddPerson(personData);
		setShowForm(false);
		setFormData({
			name: "",
			title: "",
			department: "Technology",
			country: "",
			imageUrl: generateDefaultAvatar(),
			rank: "",
		});
	};

	return (
		<div
			className="absolute left-0 top-0 bottom-0 w-80 bg-slate-50 border-r border-slate-200 z-10 overflow-y-auto transition-transform duration-300"
			style={{
				transform: collapsed ? "translateX(-100%)" : "translateX(0)",
			}}>
			<div className="min-h-full flex flex-col p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
							<Users className="w-4 h-4 text-slate-600" />
						</div>
						<div>
							<h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
								Team Members
							</h2>
							<p className="text-xs text-slate-500 font-medium">
								{people.length} Available
							</p>
						</div>
					</div>
					{!showForm && (
						<button
							onClick={() => setShowForm(true)}
							className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
							title="Add Team Member">
							<Plus className="w-4 h-4" />
						</button>
					)}
				</div>

				<div className="h-px bg-slate-100 mb-6" />

				{showForm ? (
					<div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
						<h3 className="text-slate-900 mb-3">Add New Person</h3>
						<div className="space-y-2">
							<input
								ref={nameInputRef}
								type="text"
								placeholder="Name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
							/>
							<input
								type="text"
								placeholder="Title"
								value={formData.title}
								onChange={(e) =>
									setFormData({ ...formData, title: e.target.value })
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
							/>
							<select
								value={formData.department}
								onChange={(e) =>
									setFormData({
										...formData,
										department: e.target.value,
									})
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
								<option value="Technology">Technology</option>
								<option value="Delivery">Delivery</option>
								<option value="TDC">TDC</option>
								<option value="Sales">Sales</option>
								<option value="Operations">Operations</option>
							</select>
							<input
								type="text"
								placeholder="Country"
								value={formData.country}
								onChange={(e) =>
									setFormData({ ...formData, country: e.target.value })
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
							/>
							<input
								type="text"
								placeholder="Image URL (optional)"
								value={formData.imageUrl}
								onChange={(e) =>
									setFormData({
										...formData,
										imageUrl: e.target.value,
									})
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
							/>
							<select
								value={formData.rank}
								onChange={(e) =>
									setFormData({ ...formData, rank: e.target.value })
								}
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm">
								<option value="">Rank (optional)</option>
								{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
									<option key={rank} value={rank}>
										{rank} -{" "}
										{rank === 1
											? "Highest"
											: rank === 10
											? "Lowest"
											: "Medium"}
									</option>
								))}
							</select>
						</div>
						<div className="flex gap-2 mt-3">
							<button
								onClick={handleAddPerson}
								disabled={
									!formData.name ||
									!formData.title ||
									!formData.country
								}
								className="flex-1 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm">
								Add
							</button>
							<button
								onClick={() => setShowForm(false)}
								className="flex-1 p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">
								Cancel
							</button>
						</div>
					</div>
				) : null}

				<div className="flex-1 flex flex-col space-y-3">
					{people.length === 0 ? (
						<div className="flex-1 flex flex-col items-center justify-center text-center">
							<div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
								<Users className="w-6 h-6 text-slate-400" />
							</div>
							<h3 className="text-sm font-medium text-slate-900">
								No Team Members
							</h3>
							<p className="text-xs text-slate-500 mt-1 max-w-[200px]">
								Add your first team member by clicking the plus button
								above.
							</p>
						</div>
					) : (
						people.map((person) => {
							const timesPlaced = placedPeople.filter(
								(p) => p.id === person.id
							).length;

							return (
								<div
									key={person.id}
									draggable
									onDragStart={(e) => handleDragStart(e, person)}
									className="group relative p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all">
									{/* Delete Button */}
									<button
										onClick={(e) => {
											e.stopPropagation();
											onDeletePerson(person.id);
										}}
										className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 rounded text-red-600 transition-all z-10"
										title="Delete person"
										draggable={false}>
										<Trash2 className="w-3.5 h-3.5" />
									</button>

									<div className="flex items-center gap-3">
										{person.imageUrl ? (
											<img
												src={person.imageUrl}
												alt={person.name}
												className="w-10 h-10 rounded-lg object-cover border border-slate-200"
												draggable={false}
											/>
										) : (
											<div
												className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getDepartmentColor(
													person.department
												)} flex items-center justify-center text-white`}>
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
											<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
												<div className="flex items-center gap-1">
													<div
														className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${getDepartmentColor(
															person.department
														)}`}></div>
													<span className="text-xs text-slate-600">
														{person.department}
													</span>
												</div>
												<span className="text-xs text-slate-400">
													•
												</span>
												<span className="text-xs text-slate-600">
													{person.country}
												</span>
											</div>
										</div>
									</div>

									{/* Rank Selector - Bottom Right */}
									<div className="mt-2 flex justify-end">
										<select
											value={person.rank || ""}
											onChange={(e) => {
												const rank = e.target.value
													? parseInt(e.target.value)
													: undefined;
												if (rank) onUpdateRank(person.id, rank);
											}}
											onClick={(e) => e.stopPropagation()}
											onMouseDown={(e) => e.stopPropagation()}
											className="text-xs px-2 py-1 border border-slate-300 rounded bg-white hover:border-blue-400 focus:outline-none focus:border-blue-500 cursor-pointer"
											draggable={false}>
											<option value="">No rank</option>
											{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
												(rank) => (
													<option key={rank} value={rank}>
														Rank {rank}
													</option>
												)
											)}
										</select>
									</div>

									{timesPlaced > 0 && (
										<div className="absolute top-2 right-2 px-1.5 py-0.5 bg-blue-100 rounded text-xs text-blue-700">
											{timesPlaced}x
										</div>
									)}
								</div>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
