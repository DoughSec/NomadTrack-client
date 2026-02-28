import { useEffect, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";

const BASE_URL = "http://localhost:8080";
const AUTH_ME_URL = `${BASE_URL}/nomadTrack/auth/me`;
const USERS_ME_URL = `${BASE_URL}/nomadTrack/users/me`;
const FOLLOWING_URL = `${BASE_URL}/nomadTrack/follows/following`;
const FOLLOWERS_URL = `${BASE_URL}/nomadTrack/follows/followers`;
const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};
const normalizeId = (value) => {
    if (value == null) return null;
    const id = Number(value);
    return Number.isFinite(id) ? id : null;
};

const editableFields = [
    { key: "email", label: "Email" },
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "bio", label: "Bio" },
    { key: "address", label: "Address" },
];

const PencilIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M3 17.25V21h3.75L17.8 9.95l-3.75-3.75L3 17.25zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0L14.83 5.25l3.75 3.75 2.13-1.79z" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
);

export default function Dashboard({ isAuthenticated, setIsAuthenticated }) {
    const [firstName, setFirstName] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchError, setSearchError] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [editingField, setEditingField] = useState("");
    const [fieldDrafts, setFieldDrafts] = useState({});
    const [savingField, setSavingField] = useState("");
    const [myFollowingCount, setMyFollowingCount] = useState(0);
    const [myFollowerCount, setMyFollowerCount] = useState(0);
    const [followedUserIds, setFollowedUserIds] = useState([]);
    const [selectedUserStatsLoading, setSelectedUserStatsLoading] = useState(false);
    const getUserId = (user) => normalizeId(user?.id);

    const loadProfile = async () => {
        setProfileLoading(true);
        setProfileError("");

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(AUTH_ME_URL, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const rawText = await response.text();
            let data = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = { message: rawText };
            }

            if (!response.ok) {
                setProfileError(data.message || "Could not load profile.");
                return;
            }

            setProfile(data.user ? data.user : data);
        } catch (err) {
            setProfileError("An error occurred while loading profile.");
        } finally {
            setProfileLoading(false);
        }
    };

    const parseApiResponse = async (response) => {
        const rawText = await response.text();
        let data = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }
        return data;
    };

    const getCollectionCount = (data) => {
        if (Array.isArray(data)) return data.length;
        if (Array.isArray(data.data)) return data.data.length;
        if (Array.isArray(data.results)) return data.results.length;
        if (Array.isArray(data.content)) return data.content.length;
        if (Array.isArray(data.followers)) return data.followers.length;
        if (Array.isArray(data.following)) return data.following.length;
        if (typeof data.count === "number") return data.count;
        if (typeof data.total === "number") return data.total;
        if (typeof data.totalElements === "number") return data.totalElements;
        return 0;
    };

    const getCollectionItems = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.results)) return data.results;
        if (Array.isArray(data.content)) return data.content;
        if (Array.isArray(data.followers)) return data.followers;
        if (Array.isArray(data.following)) return data.following;
        return [];
    };

    const getFollowedUserIdFromFollowingItem = (item) => {
        // Support multiple backend DTO shapes for "who I follow" endpoints.
        if (typeof item === "number") return normalizeId(item);
        if (typeof item === "string" && item.trim() !== "" && !Number.isNaN(Number(item))) {
            return normalizeId(item);
        }
        return (
            normalizeId(item?.followeeId) ??
            normalizeId(item?.followee?.id) ??
            normalizeId(item?.targetUserId) ??
            normalizeId(item?.followedUserId) ??
            normalizeId(item?.followedUser?.id) ??
            normalizeId(item?.followedId) ??
            normalizeId(item?.followingUserId) ??
            normalizeId(item?.userId) ??
            normalizeId(item?.user?.id) ??
            normalizeId(item?.targetUser?.id) ??
            null
        );
    };

    const extractFolloweeId = (item) => {
        const direct = getFollowedUserIdFromFollowingItem(item);
        if (direct != null) return direct;

        const followerId = normalizeId(item?.followerId ?? item?.follower?.id);
        const candidates = [
            normalizeId(item?.userId),
            normalizeId(item?.user?.id),
            normalizeId(item?.id),
        ].filter((id) => id != null);

        if (followerId == null) return candidates[0] ?? null;
        return candidates.find((id) => id !== followerId) ?? null;
    };

    const loadSelectedUserStats = async (userId) => {
        if (!userId) return;
        setSelectedUserStatsLoading(true);
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const headers = {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            };

            const [followersRes, followingRes] = await Promise.all([
                fetch(`${FOLLOWERS_URL}/${userId}`, { headers }),
                fetch(`${FOLLOWING_URL}/${userId}`, { headers }),
            ]);

            const [followersData, followingData] = await Promise.all([
                parseApiResponse(followersRes),
                parseApiResponse(followingRes),
            ]);

            setSelectedUser((prev) => {
                if (!prev || getUserId(prev) !== userId) return prev;
                const nextUser = { ...prev };
                if (followersRes.ok) {
                    nextUser.followerCount = getCollectionCount(followersData);
                }
                if (followingRes.ok) {
                    nextUser.followingCount = getCollectionCount(followingData);
                }
                return nextUser;
            });
            setSearchResults((prev) =>
                prev.map((user) => {
                    if (getUserId(user) !== userId) return user;
                    const nextUser = { ...user };
                    if (followersRes.ok) {
                        nextUser.followerCount = getCollectionCount(followersData);
                    }
                    if (followingRes.ok) {
                        nextUser.followingCount = getCollectionCount(followingData);
                    }
                    return nextUser;
                })
            );
        } catch {
            // Keep existing counts if request fails.
        } finally {
            setSelectedUserStatsLoading(false);
        }
    };

    const loadMyFollowStats = async () => {
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const headers = {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            };

            const [followingRes, followersRes] = await Promise.all([
                fetch(FOLLOWING_URL, { headers }),
                fetch(FOLLOWERS_URL, { headers }),
            ]);

            const [followingData, followersData] = await Promise.all([
                parseApiResponse(followingRes),
                parseApiResponse(followersRes),
            ]);

            if (followingRes.ok) {
                setMyFollowingCount(getCollectionCount(followingData));
                const followingIds = getCollectionItems(followingData)
                    .map((item) => extractFolloweeId(item))
                    .filter((id) => id != null);
                setFollowedUserIds(Array.from(new Set(followingIds)));
            }
            if (followersRes.ok) {
                setMyFollowerCount(getCollectionCount(followersData));
            }
        } catch {
            // Keep existing values if stats request fails.
        }
    };

    useEffect(() => {
        loadProfile();
        loadMyFollowStats();
    }, []);

    useEffect(() => {
        setSearchResults((prev) =>
            prev.map((user) => ({
                ...user,
                isFollowing: followedUserIds.includes(getUserId(user)),
            }))
        );
        setSelectedUser((prev) =>
            prev
                ? {
                    ...prev,
                    isFollowing: followedUserIds.includes(getUserId(prev)),
                }
                : prev
        );
    }, [followedUserIds]);

    const handleSearch = async (e) => {
        e.preventDefault();
        const searchValue = firstName.trim();
        if (!searchValue) {
            setSearchError("Please enter a first name.");
            return;
        }

        setSearchLoading(true);
        setSearchError("");
        setSearchResults([]);
        setSelectedUser(null);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/nomadTrack/users/search/${encodeURIComponent(searchValue)}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const rawText = await response.text();
            let data = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = { message: rawText };
            }

            if (!response.ok) {
                setSearchError(data.message || `Search failed (${response.status}).`);
            } else {
                const users = Array.isArray(data)
                    ? data
                    : Array.isArray(data.users)
                        ? data.users
                        : Array.isArray(data.data)
                            ? data.data
                            : Array.isArray(data.results)
                                ? data.results
                                : Array.isArray(data.content)
                                    ? data.content
                                    : (data && typeof data === "object" && (data.id || data.email || data.firstName))
                                        ? [data]
                                        : [];
                const usersWithFollowState = users.map((user) => ({
                    ...user,
                    followerCount: resolveFollowerCount(user),
                    followingCount: resolveFollowingCount(user),
                    isFollowing: followedUserIds.includes(getUserId(user)),
                }));
                setSearchResults(usersWithFollowState);
                if (users.length === 0) {
                    setSearchError("No users returned from search.");
                }
            }
        } catch (err) {
            setSearchError("An error occurred. Please try again.");
        } finally {
            setSearchLoading(false);
        }
    };

    const getCount = (user, arrayKey, countKey) => {
        if (typeof user?.[countKey] === "number") return user[countKey];
        if (Array.isArray(user?.[arrayKey])) return user[arrayKey].length;
        return 0;
    };

    const resolveFollowerCount = (user) => {
        if (typeof user?.followerCount === "number") return user.followerCount;
        if (typeof user?.followersCount === "number") return user.followersCount;
        if (typeof user?.totalFollowers === "number") return user.totalFollowers;
        if (Array.isArray(user?.followers)) return user.followers.length;
        return 0;
    };

    const resolveFollowingCount = (user) => {
        if (typeof user?.followingCount === "number") return user.followingCount;
        if (typeof user?.followingsCount === "number") return user.followingsCount;
        if (typeof user?.totalFollowing === "number") return user.totalFollowing;
        if (Array.isArray(user?.following)) return user.following.length;
        return 0;
    };

    const getIsFollowing = (user) => {
        const userId = getUserId(user);
        return (
            user?.isFollowing === true ||
            user?.following === true ||
            user?.followedByCurrentUser === true ||
            (userId != null && followedUserIds.includes(userId))
        );
    };

    const beginEdit = (field) => {
        setEditingField(field);
        setFieldDrafts((prev) => ({
            ...prev,
            [field]: profile?.[field] ?? "",
        }));
    };

    const cancelEdit = () => {
        setEditingField("");
    };

    const saveField = async (field) => {
        const nextValue = fieldDrafts[field] ?? "";
        setSavingField(field);
        setProfileError("");

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const payload = {
                id: profile?.id ?? null,
                email: profile?.email ?? "",
                firstName: profile?.firstName ?? "",
                lastName: profile?.lastName ?? "",
                bio: profile?.bio ?? "",
                address: profile?.address ?? "",
                avatarUrl: profile?.avatarUrl ?? "",
                [field]: nextValue,
            };

            const methodsToTry = ["PUT", "PATCH", "POST"];
            let response = null;
            let data = {};

            for (const method of methodsToTry) {
                response = await fetch(USERS_ME_URL, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify(payload),
                });

                const rawText = await response.text();
                try {
                    data = rawText ? JSON.parse(rawText) : {};
                } catch {
                    data = { message: rawText };
                }

                if (response.ok) {
                    break;
                }
                if (response.status !== 405) {
                    break;
                }
            }

            if (!response || !response.ok) {
                setProfileError(data.message || "Could not update profile.");
                return;
            }

            const updatedProfile = data.user ? data.user : data;
            if (updatedProfile && typeof updatedProfile === "object") {
                setProfile((prev) => {
                    const nextProfile = { ...prev, ...updatedProfile };

                    // Keep stable identity fields unless backend returns real values.
                    if (updatedProfile.id == null) {
                        nextProfile.id = prev?.id;
                    }
                    if (updatedProfile.email == null || updatedProfile.email === "") {
                        nextProfile.email = prev?.email;
                    }

                    return nextProfile;
                });
            } else {
                setProfile((prev) => ({ ...prev, [field]: nextValue }));
            }
            setEditingField("");
        } catch (err) {
            setProfileError("An error occurred while updating profile.");
        } finally {
            setSavingField("");
        }
    };

    const toggleFollowUser = async () => {
        if (followLoading) return;
        const targetUserId = getUserId(selectedUser);
        if (!targetUserId) {
            setSearchError("Cannot follow this user: missing user id.");
            return;
        }

        const authToken = normalizeToken(localStorage.getItem("token"));
        const isCurrentlyFollowing = getIsFollowing(selectedUser);

        setFollowLoading(true);
        setSearchError("");

        try {
            const response = await fetch(`${BASE_URL}/nomadTrack/follows/${targetUserId}`, {
                method: isCurrentlyFollowing ? "DELETE" : "POST",
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const rawText = await response.text();
            let data = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = { message: rawText };
            }

            if (!response.ok) {
                setSearchError(data.message || "Could not update follow state.");
                return;
            }

            const nextFollowing = !isCurrentlyFollowing;
            setSelectedUser((prev) =>
                prev
                    ? {
                        ...prev,
                        isFollowing: nextFollowing,
                        following: nextFollowing,
                        followedByCurrentUser: nextFollowing,
                        followerCount: Math.max(0, resolveFollowerCount(prev) + (nextFollowing ? 1 : -1)),
                    }
                    : prev
            );
            setSearchResults((prev) =>
                prev.map((user) =>
                    getUserId(user) === targetUserId
                        ? {
                            ...user,
                            isFollowing: nextFollowing,
                            following: nextFollowing,
                            followedByCurrentUser: nextFollowing,
                            followerCount: Math.max(0, resolveFollowerCount(user) + (nextFollowing ? 1 : -1)),
                        }
                        : user
                )
            );
            setFollowedUserIds((prev) =>
                nextFollowing
                    ? (prev.includes(targetUserId) ? prev : [...prev, targetUserId])
                    : prev.filter((id) => id !== targetUserId)
            );
            loadMyFollowStats();
        } catch (err) {
            setSearchError("An error occurred while updating follow state.");
        } finally {
            setFollowLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main">
                <div className="dashboard-layout">
                    <div className="login-container dashboard-card">
                        <h2 className="search-panel-title"><span className="nomad-blue">Nomad </span> Search</h2>
                        <form onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search by first name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                            />
                            <button type="submit">{searchLoading ? "Searching..." : "Search"}</button>
                        </form>
                        {searchError && <p className="error">{searchError}</p>}
                        <div className="search-results-list">
                            {!searchLoading && searchResults.length === 0 && <p>No matching users yet.</p>}
                            {searchResults.map((user) => (
                                <div
                                    className={`search-result-item ${getUserId(selectedUser) === getUserId(user) ? "search-result-item-active" : ""}`}
                                    key={getUserId(user) ?? `${user.email}-${user.firstName}`}
                                    onClick={() => {
                                        setSelectedUser(user);
                                        loadSelectedUserStats(getUserId(user));
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") setSelectedUser(user);
                                    }}
                                >
                                    <p className="search-result-name">
                                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                                    </p>
                                    {user.email && <p className="search-result-meta">{user.email}</p>}
                                </div>
                            ))}
                        </div>
                        {selectedUser && (
                            <div className="searched-user-profile">
                                <div className="searched-user-header">
                                    {selectedUser.avatarUrl ? (
                                        <img
                                            src={selectedUser.avatarUrl}
                                            alt={`${selectedUser.firstName || "User"} avatar`}
                                            className="profile-avatar"
                                        />
                                    ) : (
                                        <div className="profile-avatar profile-avatar-placeholder">No Avatar</div>
                                    )}
                                    <div className="follow-stats">
                                        <div className="follow-stat">
                                            <span className="follow-stat-count">{resolveFollowerCount(selectedUser)}</span>
                                            <span className="follow-stat-label">Followers</span>
                                        </div>
                                        <div className="follow-stat">
                                            <span className="follow-stat-count">{resolveFollowingCount(selectedUser)}</span>
                                            <span className="follow-stat-label">Following</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="searched-user-name">
                                    {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                                </p>
                                <p className="searched-user-meta">ID: {getUserId(selectedUser) ?? "N/A"}</p>
                                <p className="searched-user-bio">{selectedUser.bio || "No bio provided yet."}</p>
                                <button
                                    type="button"
                                    className="follow-button"
                                    onClick={toggleFollowUser}
                                    disabled={followLoading}
                                >
                                    {followLoading
                                        ? "Updating..."
                                        : getIsFollowing(selectedUser)
                                            ? "Unfollow"
                                            : "Follow"}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="login-container dashboard-card profile-card">
                        <h2 className="profile-title" style={{ color: "white" }}>Profile</h2>
                        {profileLoading && <p>Loading profile...</p>}
                        {profileError && <p className="error">{profileError}</p>}
                        {!profileLoading && profile && (
                            <div className="profile-section">
                                <div className="profile-avatar-wrap">
                                    {profile.avatarUrl ? (
                                        <img src={profile.avatarUrl} alt="Profile avatar" className="profile-avatar" />
                                    ) : (
                                        <div className="profile-avatar profile-avatar-placeholder">No Avatar</div>
                                    )}
                                    <button
                                        type="button"
                                        className="icon-action-button avatar-edit-button"
                                        onClick={() => beginEdit("avatarUrl")}
                                        title="Edit Avatar"
                                    >
                                        <PencilIcon />
                                    </button>
                                </div>
                                <div className="follow-stats profile-follow-stats">
                                    <div className="follow-stat">
                                        <span className="follow-stat-count">{myFollowerCount}</span>
                                        <span className="follow-stat-label">Followers</span>
                                    </div>
                                    <div className="follow-stat">
                                        <span className="follow-stat-count">{myFollowingCount}</span>
                                        <span className="follow-stat-label">Following</span>
                                    </div>
                                </div>
                                {editingField === "avatarUrl" && (
                                    <div className="profile-row">
                                        <span className="profile-label">Image URL</span>
                                        <input
                                            type="text"
                                            value={fieldDrafts.avatarUrl ?? ""}
                                            onChange={(e) =>
                                                setFieldDrafts((prev) => ({
                                                    ...prev,
                                                    avatarUrl: e.target.value,
                                                }))
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="icon-action-button"
                                            onClick={() => saveField("avatarUrl")}
                                            title="Save Avatar"
                                            disabled={savingField === "avatarUrl"}
                                        >
                                            <CheckIcon />
                                        </button>
                                        <button
                                            type="button"
                                            className="text-action-button"
                                            onClick={cancelEdit}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                <div className="profile-row">
                                    <span className="profile-label">ID</span>
                                    <span className="profile-value">{profile.id ?? "N/A"}</span>
                                </div>

                                {editableFields.map((field) => {
                                    const isEditing = editingField === field.key;
                                    const isSaving = savingField === field.key;
                                    const value = profile[field.key] ?? "";

                                    return (
                                        <div className="profile-row" key={field.key}>
                                            <span className="profile-label">{field.label}</span>
                                            {!isEditing && <span className="profile-value">{value || "N/A"}</span>}
                                            {isEditing && (
                                                <input
                                                    type="text"
                                                    value={fieldDrafts[field.key] ?? ""}
                                                    onChange={(e) =>
                                                        setFieldDrafts((prev) => ({
                                                            ...prev,
                                                            [field.key]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            )}

                                            {!isEditing && (
                                                <button
                                                    type="button"
                                                    className="icon-action-button"
                                                    onClick={() => beginEdit(field.key)}
                                                    title={`Edit ${field.label}`}
                                                >
                                                    <PencilIcon />
                                                </button>
                                            )}

                                            {isEditing && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="icon-action-button"
                                                        onClick={() => saveField(field.key)}
                                                        title={`Save ${field.label}`}
                                                        disabled={isSaving}
                                                    >
                                                        <CheckIcon />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-action-button"
                                                        onClick={cancelEdit}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
