import { Briefcase, Plus, ChevronRight } from "lucide-react";
import { Client, PlacedClient } from "./OrgChartCanvas";
import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";

interface ClientSidebarProps {
	clients: Client[];
	placedClients: PlacedClient[];
	onAddClient: (client: Omit<Client, "id">) => void;
	onDeleteClient: (clientId: string) => void;
	onUpdateRank: (clientId: string, rank: number) => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
}

export function ClientSidebar({
	clients,
	placedClients,
	onAddClient,
	onDeleteClient,
	onUpdateRank,
	collapsed,
	onToggleCollapse,
}: ClientSidebarProps) {
	const [showForm, setShowForm] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		domain: "",
		logoUrl: "",
		country: "UKI",
	});

	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (showForm && nameInputRef.current) {
			nameInputRef.current.focus();
		}
	}, [showForm]);

	const handleDragStart = (e: React.DragEvent, client: Client) => {
		e.dataTransfer.setData("type", "client");
		e.dataTransfer.setData("client", JSON.stringify(client));
		e.dataTransfer.effectAllowed = "copy";
	};

	const handleAddClient = () => {
		if (formData.name.trim()) {
			const clientData: any = {
				name: formData.name,
				logoUrl: formData.logoUrl
					? formData.logoUrl
					: formData.domain
					? `https://img.logo.dev/${formData.domain}?token=pk_RL23mewLR36Ib2FUEGd3lw`
					: undefined,
				country: formData.country || undefined,
			};

			onAddClient(clientData);
			setFormData({
				name: "",
				domain: "",
				logoUrl: "",
				country: "UKI",
			});
			setShowForm(false);
		}
	};

	return (
		<div
			className="absolute right-0 top-0 bottom-0 w-80 bg-slate-50 border-l border-slate-200 z-10 overflow-y-auto transition-transform duration-300"
			style={{
				transform: collapsed ? "translateX(100%)" : "translateX(0)",
			}}>
			<div className="min-h-full flex flex-col p-6">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
							<Briefcase className="w-4 h-4 text-slate-600" />
						</div>
						<div>
							<h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
								Clients
							</h2>
							<p className="text-xs text-slate-500 font-medium">
								{clients.length} Available
							</p>
						</div>
					</div>
					{!showForm && (
						<button
							onClick={() => setShowForm(true)}
							className="p-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
							title="Add Client">
							<Plus className="w-4 h-4" />
						</button>
					)}
				</div>

				<div className="h-px bg-slate-100 mb-6" />

				{showForm ? (
					<div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
						<h3 className="text-slate-900 mb-3">Add New Client</h3>
						<div className="space-y-2">
							<input
								ref={nameInputRef}
								type="text"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="Client Name"
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
							/>
							<input
								type="text"
								value={formData.domain}
								onChange={(e) =>
									setFormData({ ...formData, domain: e.target.value })
								}
								placeholder="Domain (e.g. google.com)"
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
							/>
							<input
								type="text"
								value={formData.logoUrl}
								onChange={(e) =>
									setFormData({ ...formData, logoUrl: e.target.value })
								}
								placeholder="Logo URL (optional)"
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
							/>
							<input
								type="text"
								value={formData.country}
								onChange={(e) =>
									setFormData({ ...formData, country: e.target.value })
								}
								placeholder="Country (optional)"
								className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
							/>
						</div>
						<div className="flex gap-2 mt-3">
							<button
								onClick={handleAddClient}
								disabled={!formData.name}
								className="flex-1 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-sm">
								Add
							</button>
							<button
								onClick={() => setShowForm(false)}
								className="flex-1 p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm">
								Cancel
							</button>
						</div>
					</div>
				) : (
					<div className="flex-1 flex flex-col space-y-3">
						{clients.length === 0 ? (
							<div className="flex-1 flex flex-col items-center justify-center text-center">
								<div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
									<Briefcase className="w-6 h-6 text-slate-400" />
								</div>
								<h3 className="text-sm font-medium text-slate-900">
									No Clients
								</h3>
								<p className="text-xs text-slate-500 mt-1 max-w-[200px]">
									Add your first client by clicking the plus button
									above.
								</p>
							</div>
						) : (
							clients.map((client) => {
								const timesPlaced = placedClients.filter(
									(c) => c.id === client.id
								).length;

								return (
									<div
										key={client.id}
										draggable
										onDragStart={(e) => handleDragStart(e, client)}
										className="group relative p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-md cursor-grab active:cursor-grabbing transition-all">
										{/* Delete Button */}
										<button
											onClick={(e) => {
												e.stopPropagation();
												onDeleteClient(client.id);
											}}
											className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 rounded text-red-600 transition-all z-10"
											title="Delete client"
											draggable={false}>
											<Trash2 className="w-3.5 h-3.5" />
										</button>

										<div className="flex items-center gap-3">
											{client.logoUrl ? (
												<img
													src={client.logoUrl}
													alt={client.name}
													className="w-10 h-10 rounded-lg object-cover border border-slate-200"
													draggable={false}
												/>
											) : (
												<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
													{client.name.charAt(0)}
												</div>
											)}

											<div className="flex-1 min-w-0">
												<div className="text-slate-900 truncate">
													{client.name}
												</div>
												<div className="text-xs text-slate-500">
													{client.country
														? client.country
														: "Client Group"}
												</div>
											</div>
										</div>

										{timesPlaced > 0 && (
											<div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-100 rounded text-xs text-emerald-700">
												{timesPlaced}x
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				)}
			</div>
		</div>
	);
}
