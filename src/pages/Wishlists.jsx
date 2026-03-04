import { useEffect, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";

const BASE_URL = process.env.REACT_APP_API_URL;
const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

export default function Wishlists({ isAuthenticated, setIsAuthenticated }) {
    const [targetCountry, setTargetCountry] = useState("");
    const [wishlistItems, setWishlistItems] = useState([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isFiltered, setIsFiltered] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");
    const [completingWishlistId, setCompletingWishlistId] = useState(null);
    const [completeError, setCompleteError] = useState("");
    const [editingWishlistId, setEditingWishlistId] = useState(null);
    const [editingWishlistDraft, setEditingWishlistDraft] = useState(null);
    const [wishlistActionLoadingId, setWishlistActionLoadingId] = useState(null);
    const [wishlistActionError, setWishlistActionError] = useState("");
    const [newDream, setNewDream] = useState({
        title: "",
        description: "",
        targetCountry: "",
        targetCity: "",
        deadline: "",
    });

    const parseApiResponse = async (response) => {
        const rawText = await response.text();
        if (!rawText) return {};
        try {
            return JSON.parse(rawText);
        } catch {
            return { message: rawText };
        }
    };

    const extractWishlists = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.wishlists)) return data.wishlists;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        if (data?.wishlist && typeof data.wishlist === "object") return [data.wishlist];
        if (data && typeof data === "object" && (data.wishlistId || data.title || data.targetCountry)) return [data];
        return [];
    };

    const formatDate = (value) => {
        if (!value) return "N/A";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return String(value);
        return parsed.toLocaleDateString();
    };

    const resolveCompletedDate = (item) =>
        item?.completedDate ??
        item?.completed_date ??
        item?.completionDate ??
        item?.completedOn ??
        item?.completedAt ??
        "";

    const mapWishlist = (item) => ({
        wishlistId: item?.wishlistId ?? item?.id ?? null,
        title: item?.title ?? "Untitled Dream",
        description: item?.description ?? "No description yet.",
        targetCountry: item?.targetCountry ?? item?.country ?? "Unknown Country",
        targetCity: item?.targetCity ?? item?.city ?? "Unknown City",
        deadline: item?.deadline ?? item?.targetDate ?? "",
        completed: item?.completed === true,
        completedDate: resolveCompletedDate(item),
    });

    const sortWishlists = (items) =>
        [...items].sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
        });

    const fetchWishlists = async (endpoint) => {
        const authToken = normalizeToken(localStorage.getItem("token"));
        try {
            const response = await fetch(endpoint, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                return { data: null, message: data.message || `Request failed (${response.status}).` };
            }
            return { data: extractWishlists(data).map(mapWishlist), message: "" };
        } catch {
            return { data: null, message: "Network error while loading wishlist dreams." };
        }
    };

    const loadAllWishlists = async () => {
        setLoading(true);
        setError("");
        setIsFiltered(false);

        const { data, message } = await fetchWishlists(`${BASE_URL}/nomadTrack/wishlists`);
        if (data == null) {
            setError(message || "Could not load wishlist dreams right now.");
            setWishlistItems([]);
        } else {
            setWishlistItems(sortWishlists(data));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadAllWishlists();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        const searchValue = targetCountry.trim();
        if (!searchValue) {
            setError("Please enter a target country.");
            return;
        }

        setLoading(true);
        setError("");
        setIsFiltered(true);

        const { data, message } = await fetchWishlists(`${BASE_URL}/nomadTrack/wishlists/${encodeURIComponent(searchValue)}`);
        if (data == null) {
            setError(message || "Search failed for that country.");
            setWishlistItems([]);
        } else {
            setWishlistItems(sortWishlists(data));
            if (data.length === 0) {
                setError("No wishlist dreams found for that country.");
            }
        }
        setLoading(false);
    };

    const handleCreateWishlist = async (e) => {
        e.preventDefault();
        const payload = {
            title: newDream.title.trim(),
            description: newDream.description.trim(),
            targetCountry: newDream.targetCountry.trim(),
            targetCity: newDream.targetCity.trim(),
            deadline: newDream.deadline,
        };

        if (!payload.title || !payload.description || !payload.targetCountry || !payload.targetCity || !payload.deadline) {
            setCreateError("Please fill in title, description, target country, target city, and deadline.");
            return;
        }

        setCreateLoading(true);
        setCreateError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/nomadTrack/wishlists`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setCreateError(data.message || "Could not add this dream right now.");
                return;
            }

            const createdItem = mapWishlist({
                ...payload,
                ...(data?.wishlist ?? data),
                deadline: (data?.wishlist ?? data)?.deadline ?? payload.deadline,
                targetCountry: (data?.wishlist ?? data)?.targetCountry ?? payload.targetCountry,
                targetCity: (data?.wishlist ?? data)?.targetCity ?? payload.targetCity,
            });
            setWishlistItems((prev) => sortWishlists([createdItem, ...prev]));
            setNewDream({
                title: "",
                description: "",
                targetCountry: "",
                targetCity: "",
                deadline: "",
            });
            setIsFiltered(false);
            setTargetCountry("");
        } catch {
            setCreateError("An error occurred while creating your dream.");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleMarkComplete = async (wishlistId) => {
        if (!wishlistId || completingWishlistId === wishlistId) return;
        setCompletingWishlistId(wishlistId);
        setCompleteError("");

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/nomadTrack/wishlists/${encodeURIComponent(wishlistId)}/complete`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({ completed: true }),
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setCompleteError(data.message || "Could not mark wishlist item as complete.");
                return;
            }

            const completedDate =
                resolveCompletedDate(data?.wishlist ?? data) ||
                new Date().toISOString().split("T")[0];
            setWishlistItems((prev) =>
                sortWishlists(prev.map((item) =>
                    String(item.wishlistId) === String(wishlistId)
                        ? {
                            ...item,
                            completed: true,
                            completedDate,
                        }
                        : item
                ))
            );

            if (isFiltered && targetCountry.trim()) {
                const { data: refreshed } = await fetchWishlists(
                    `${BASE_URL}/nomadTrack/wishlists/${encodeURIComponent(targetCountry.trim())}`
                );
                if (refreshed) setWishlistItems(sortWishlists(refreshed));
            } else {
                const { data: refreshed } = await fetchWishlists(`${BASE_URL}/nomadTrack/wishlists`);
                if (refreshed) setWishlistItems(sortWishlists(refreshed));
            }
        } catch {
            setCompleteError("An error occurred while marking this item complete.");
        } finally {
            setCompletingWishlistId(null);
        }
    };

    const beginEditWishlist = (item) => {
        setEditingWishlistId(item.wishlistId);
        setEditingWishlistDraft({
            title: item.title ?? "",
            description: item.description ?? "",
            targetCountry: item.targetCountry ?? "",
            targetCity: item.targetCity ?? "",
            deadline: item.deadline ?? "",
        });
        setWishlistActionError("");
    };

    const cancelEditWishlist = () => {
        setEditingWishlistId(null);
        setEditingWishlistDraft(null);
    };

    const saveWishlist = async (wishlistId) => {
        if (!editingWishlistDraft || !wishlistId) return;
        const payload = {
            title: editingWishlistDraft.title.trim(),
            description: editingWishlistDraft.description.trim(),
            targetCountry: editingWishlistDraft.targetCountry.trim(),
            targetCity: editingWishlistDraft.targetCity.trim(),
            deadline: editingWishlistDraft.deadline,
        };
        if (!payload.title || !payload.description || !payload.targetCountry || !payload.targetCity || !payload.deadline) {
            setWishlistActionError("Please fill in title, description, target country, target city, and deadline.");
            return;
        }

        setWishlistActionLoadingId(wishlistId);
        setWishlistActionError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/nomadTrack/wishlists/${encodeURIComponent(wishlistId)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setWishlistActionError(data.message || "Could not update wishlist item.");
                return;
            }

            const updated = mapWishlist({
                ...payload,
                ...(data?.wishlist ?? data),
                wishlistId,
                completed: (data?.wishlist ?? data)?.completed,
                completedDate: resolveCompletedDate(data?.wishlist ?? data),
            });
            setWishlistItems((prev) =>
                sortWishlists(prev.map((item) =>
                    String(item.wishlistId) === String(wishlistId) ? { ...item, ...updated } : item
                ))
            );
            cancelEditWishlist();
        } catch {
            setWishlistActionError("An error occurred while updating wishlist item.");
        } finally {
            setWishlistActionLoadingId(null);
        }
    };

    const deleteWishlist = async (wishlistId) => {
        if (!wishlistId) return;
        setWishlistActionLoadingId(wishlistId);
        setWishlistActionError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/nomadTrack/wishlists/${encodeURIComponent(wishlistId)}`, {
                method: "DELETE",
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setWishlistActionError(data.message || "Could not delete wishlist item.");
                return;
            }
            setWishlistItems((prev) => prev.filter((item) => String(item.wishlistId) !== String(wishlistId)));
            if (editingWishlistId === wishlistId) {
                cancelEditWishlist();
            }
        } catch {
            setWishlistActionError("An error occurred while deleting wishlist item.");
        } finally {
            setWishlistActionLoadingId(null);
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main auth-main-top">
                <section className="wishlist-shell">
                    <aside className="wishlist-intro">
                        <h2 className="wishlist-title">
                            <span className="heading-blue">Dream</span><span className="heading-white">Board</span>
                        </h2>
                        <p className="wishlist-subtitle">
                            Future destinations, deadlines, and milestones for your bucket list.
                        </p>
                        <form className="wishlist-search-form" onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Filter by target country"
                                value={targetCountry}
                                onChange={(e) => setTargetCountry(e.target.value)}
                            />
                            <button type="submit" disabled={loading}>
                                {loading ? "Searching..." : "Search"}
                            </button>
                            <button type="button" className="text-action-button" onClick={loadAllWishlists} disabled={loading}>
                                Show All
                            </button>
                        </form>
                        {isFiltered && !loading && (
                            <p className="wishlist-filter-note">Showing dreams for: {targetCountry || "All"}</p>
                        )}
                        {error && <p className="error">{error}</p>}
                        {completeError && <p className="error">{completeError}</p>}
                        {wishlistActionError && <p className="error">{wishlistActionError}</p>}

                        <div className="wishlist-create-section">
                            <h3 className="wishlist-create-title">
                                <span className="heading-blue">Add</span><span className="heading-white">Dream</span>
                            </h3>
                            <form className="wishlist-create-form" onSubmit={handleCreateWishlist}>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={newDream.title}
                                    onChange={(e) => setNewDream((prev) => ({ ...prev, title: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={newDream.description}
                                    onChange={(e) => setNewDream((prev) => ({ ...prev, description: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Target Country"
                                    value={newDream.targetCountry}
                                    onChange={(e) => setNewDream((prev) => ({ ...prev, targetCountry: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Target City"
                                    value={newDream.targetCity}
                                    onChange={(e) => setNewDream((prev) => ({ ...prev, targetCity: e.target.value }))}
                                />
                                <input
                                    type="date"
                                    value={newDream.deadline}
                                    onChange={(e) => setNewDream((prev) => ({ ...prev, deadline: e.target.value }))}
                                />
                                <button type="submit" disabled={createLoading}>
                                    {createLoading ? "Adding..." : "Add To Board"}
                                </button>
                            </form>
                            {createError && <p className="error">{createError}</p>}
                        </div>
                    </aside>

                    <section className="wishlist-board">
                        {loading && <p>Loading dreams...</p>}
                        {!loading && wishlistItems.length === 0 && !error && (
                            <p>No dreams added yet.</p>
                        )}
                        {!loading && wishlistItems.length > 0 && (
                            <div className="wishlist-grid">
                                {wishlistItems.map((item) => (
                                    <article className="wishlist-card" key={item.wishlistId ?? `${item.title}-${item.targetCity}`}>
                                        {editingWishlistId === item.wishlistId && editingWishlistDraft ? (
                                            <div className="wishlist-edit-form">
                                                <input
                                                    type="text"
                                                    value={editingWishlistDraft.title}
                                                    onChange={(e) => setEditingWishlistDraft((prev) => ({ ...prev, title: e.target.value }))}
                                                    placeholder="Title"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingWishlistDraft.description}
                                                    onChange={(e) => setEditingWishlistDraft((prev) => ({ ...prev, description: e.target.value }))}
                                                    placeholder="Description"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingWishlistDraft.targetCountry}
                                                    onChange={(e) => setEditingWishlistDraft((prev) => ({ ...prev, targetCountry: e.target.value }))}
                                                    placeholder="Target Country"
                                                />
                                                <input
                                                    type="text"
                                                    value={editingWishlistDraft.targetCity}
                                                    onChange={(e) => setEditingWishlistDraft((prev) => ({ ...prev, targetCity: e.target.value }))}
                                                    placeholder="Target City"
                                                />
                                                <input
                                                    type="date"
                                                    value={editingWishlistDraft.deadline}
                                                    onChange={(e) => setEditingWishlistDraft((prev) => ({ ...prev, deadline: e.target.value }))}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="wishlist-card-head">
                                                    <h3 className="wishlist-card-title">{item.title}</h3>
                                                    <span className={`wishlist-status ${item.completed ? "wishlist-status-done" : "wishlist-status-pending"}`}>
                                                        {item.completed ? "Completed" : "In Progress"}
                                                    </span>
                                                </div>
                                                <p className="wishlist-card-desc">{item.description}</p>
                                                <div className="wishlist-meta-row">
                                                    <span className="wishlist-meta-label">Wishlist ID</span>
                                                    <span className="wishlist-meta-value">{item.wishlistId ?? "N/A"}</span>
                                                </div>
                                                <div className="wishlist-meta-row">
                                                    <span className="wishlist-meta-label">Destination</span>
                                                    <span className="wishlist-meta-value">{item.targetCity}, {item.targetCountry}</span>
                                                </div>
                                                <div className="wishlist-meta-row">
                                                    <span className="wishlist-meta-label">Deadline</span>
                                                    <span className="wishlist-meta-value">{formatDate(item.deadline)}</span>
                                                </div>
                                                <div className="wishlist-meta-row">
                                                    <span className="wishlist-meta-label">Completed Date</span>
                                                    <span className="wishlist-meta-value">{formatDate(item.completedDate)}</span>
                                                </div>
                                            </>
                                        )}
                                        <div className="wishlist-action-row">
                                            {editingWishlistId === item.wishlistId ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveWishlist(item.wishlistId)}
                                                        disabled={wishlistActionLoadingId === item.wishlistId}
                                                    >
                                                        {wishlistActionLoadingId === item.wishlistId ? "Saving..." : "Save"}
                                                    </button>
                                                    <button type="button" className="text-action-button" onClick={cancelEditWishlist}>
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => beginEditWishlist(item)}>
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteWishlist(item.wishlistId)}
                                                        disabled={wishlistActionLoadingId === item.wishlistId}
                                                    >
                                                        {wishlistActionLoadingId === item.wishlistId ? "Deleting..." : "Delete"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="wishlist-complete-button"
                                            onClick={() => handleMarkComplete(item.wishlistId)}
                                            disabled={item.completed || completingWishlistId === item.wishlistId}
                                        >
                                            {item.completed
                                                ? "Completed"
                                                : completingWishlistId === item.wishlistId
                                                    ? "Completing..."
                                                    : "Mark Complete"}
                                        </button>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </section>
            </main>
            <Footer />
        </div>
    );
}
