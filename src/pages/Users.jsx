import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import { getRoleFromToken, isAdminRole, normalizeToken } from "../lib/auth";

const BASE_URL = "http://localhost:8080";
const USERS_URL = `${BASE_URL}/nomadTrack/users`;

const parseApiResponse = async (response) => {
    const rawText = await response.text();
    if (!rawText) return {};
    try {
        return JSON.parse(rawText);
    } catch {
        return { message: rawText };
    }
};

const extractUsers = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.content)) return data.content;
    if (data && typeof data === "object" && (data.id || data.email)) return [data];
    return [];
};

const formatDateTime = (value) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
};

const mapUser = (user) => ({
    id: user?.id ?? null,
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    avatarUrl: user?.avatarURL ?? user?.avatarUrl ?? "",
    email: user?.email ?? "",
    bio: user?.bio ?? "",
    address: user?.address ?? "",
    role: user?.role ?? "",
    createdAt: user?.createdAt ?? "",
    updatedAt: user?.updatedAt ?? "",
});

export default function Users({ isAuthenticated, setIsAuthenticated }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [accessLoading, setAccessLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    const loadUsers = useCallback(async () => {
        const authToken = normalizeToken(localStorage.getItem("token"));
        if (!authToken) {
            setError("Missing authentication token.");
            setUsers([]);
            return;
        }

        setLoading(true);
        setError("");
        try {
            const response = await fetch(USERS_URL, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`,
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setError(data.message || `Could not load users (${response.status}).`);
                setUsers([]);
                return;
            }

            setUsers(extractUsers(data).map(mapUser));
        } catch {
            setError("An error occurred while loading users.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const authToken = normalizeToken(token);
        if (!authToken) {
            setIsAdmin(false);
            setAccessLoading(false);
            return;
        }

        const role = localStorage.getItem("role") || getRoleFromToken(token);
        const admin = isAdminRole(role);
        setIsAdmin(admin);
        setAccessLoading(false);
        if (admin) {
            loadUsers();
        }
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const searchValue = search.trim().toLowerCase();
        if (!searchValue) return users;
        return users.filter((user) => {
            const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
            return (
                fullName.includes(searchValue) ||
                user.email.toLowerCase().includes(searchValue) ||
                String(user.role || "").toLowerCase().includes(searchValue)
            );
        });
    }, [search, users]);

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main auth-main-top">
                <section className="users-page">
                    <div className="users-page-header">
                        <h2 className="section-split-heading">
                            <span className="heading-blue">Application</span><span className="heading-white">Users</span>
                        </h2>
                        <p className="users-page-subtitle">Admin view of all registered accounts.</p>
                    </div>

                    {accessLoading && <p>Checking admin access...</p>}

                    {!accessLoading && !isAdmin && (
                        <div className="users-empty-state">
                            <h3>Access denied</h3>
                            <p>You must have the admin role to view this page.</p>
                        </div>
                    )}

                    {!accessLoading && isAdmin && (
                        <>
                            <div className="users-toolbar">
                                <input
                                    type="text"
                                    placeholder="Search by name, email, or role"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <button type="button" onClick={loadUsers} disabled={loading}>
                                    {loading ? "Refreshing..." : "Refresh"}
                                </button>
                            </div>

                            {error && <p className="error">{error}</p>}
                            <p className="users-count">
                                Showing {filteredUsers.length} of {users.length} users
                            </p>

                            {!loading && filteredUsers.length === 0 && !error && (
                                <div className="users-empty-state">
                                    <h3>No users found</h3>
                                    <p>Try a different search or refresh the list.</p>
                                </div>
                            )}

                            <div className="users-grid">
                                {filteredUsers.map((user) => (
                                    <article key={user.id ?? user.email} className="user-card">
                                        <div className="user-card-header">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={`${user.firstName || "User"} avatar`} className="user-avatar" />
                                            ) : (
                                                <div className="user-avatar user-avatar-placeholder">No Avatar</div>
                                            )}
                                            <div className="user-name-wrap">
                                                <h3>{`${user.firstName} ${user.lastName}`.trim() || "Unnamed User"}</h3>
                                                <p>{user.email || "No email"}</p>
                                            </div>
                                            <span className={`user-role-badge ${isAdminRole(user.role) ? "user-role-admin" : ""}`}>
                                                {user.role || "N/A"}
                                            </span>
                                        </div>
                                        <div className="user-card-body">
                                            <div className="user-meta-row">
                                                <span>ID</span>
                                                <span>{user.id ?? "N/A"}</span>
                                            </div>
                                            <div className="user-meta-row">
                                                <span>Address</span>
                                                <span>{user.address || "N/A"}</span>
                                            </div>
                                            <div className="user-meta-row">
                                                <span>Bio</span>
                                                <span>{user.bio || "No bio provided."}</span>
                                            </div>
                                            <div className="user-meta-row">
                                                <span>Created</span>
                                                <span>{formatDateTime(user.createdAt)}</span>
                                            </div>
                                            <div className="user-meta-row">
                                                <span>Updated</span>
                                                <span>{formatDateTime(user.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>
            <Footer />
        </div>
    );
}
