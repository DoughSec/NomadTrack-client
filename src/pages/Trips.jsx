import { useEffect, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import BounceCards from "../bits/BounceCards";

const BASE_URL = "http://localhost:8080";
const TRIPS_BASE_URL = `${BASE_URL}/nomadTrack/trips`;
const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

export default function Trips({ isAuthenticated, setIsAuthenticated }) {
    const [countryName, setCountryName] = useState("");
    const [newTripDraft, setNewTripDraft] = useState({
        title: "",
        city: "",
        country: "",
        startDate: "",
        endDate: "",
        notes: "",
    });
    const [tripList, setTripList] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [tripDraft, setTripDraft] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");
    const [profileError, setProfileError] = useState("");
    const [createError, setCreateError] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const parseApiResponse = async (response) => {
        const rawText = await response.text();
        if (!rawText) return {};
        try {
            return JSON.parse(rawText);
        } catch {
            return { message: rawText };
        }
    };

    const normalizeTripId = (trip) => {
        if (!trip || typeof trip !== "object") return null;
        const candidates = [trip.id, trip.tripId, trip.trip_id];
        for (const value of candidates) {
            if (value == null) continue;
            const idValue = String(value).trim();
            if (idValue !== "") return idValue;
        }
        return null;
    };

    const resolveTripDto = (trip) => {
        if (!trip || typeof trip !== "object") return {};
        return trip.trip ?? trip.tripDto ?? trip.dto ?? trip.data ?? trip.result ?? trip;
    };

    const extractTrips = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.trips)) return data.trips;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        if (data?.trip && typeof data.trip === "object") return [data.trip];
        if (data?.tripDto && typeof data.tripDto === "object") return [data.tripDto];
        if (data?.result?.trip && typeof data.result.trip === "object") return [data.result.trip];
        if (data && typeof data === "object" && (data.title || data.city || data.country)) return [data];
        return [];
    };

    const mapTrip = (trip) => {
        const dto = resolveTripDto(trip);
        return {
            ...dto,
            id: normalizeTripId(dto) ?? normalizeTripId(trip),
            title: dto?.title ?? dto?.tripTitle ?? dto?.name ?? "Untitled Trip",
            city: dto?.city ?? dto?.tripCity ?? "Unknown City",
            country: dto?.country ?? dto?.countryName ?? dto?.targetCountry ?? "Unknown Country",
            description: dto?.description ?? dto?.notes ?? "",
            startDate: dto?.startDate ?? dto?.start_date ?? dto?.tripStartDate ?? "",
            endDate: dto?.endDate ?? dto?.end_date ?? dto?.tripEndDate ?? "",
            tripPhotos: Array.isArray(dto?.tripPhotos)
                ? dto.tripPhotos
                : Array.isArray(dto?.photos)
                    ? dto.photos
                    : [],
        };
    };

    const extractPhotoUrls = (trip) => {
        const photos = Array.isArray(trip?.tripPhotos) ? trip.tripPhotos : [];
        const urls = photos
            .map((photo) => {
                if (typeof photo === "string") return photo;
                if (photo && typeof photo === "object") {
                    return photo.url ?? photo.photoUrl ?? photo.imageUrl ?? photo.src ?? "";
                }
                return "";
            })
            .filter((url) => typeof url === "string" && url.trim() !== "");
        return urls;
    };

    const formatDate = (value) => {
        if (!value || typeof value !== "string") return "N/A";
        const isoDate = value.includes("T") ? value.split("T")[0] : value;
        return isoDate || "N/A";
    };

    const loadAllTrips = async () => {
        setLoading(true);
        setError("");
        setSelectedTrip(null);
        setIsEditing(false);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(TRIPS_BASE_URL, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setError(data.message || `Could not load trips (${response.status}).`);
                setTripList([]);
                return;
            }

            const normalizedTrips = extractTrips(data).map(mapTrip);
            setTripList(normalizedTrips);
        } catch {
            setError("An error occurred while loading trips.");
            setTripList([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTrip = async (e) => {
        e.preventDefault();
        setCreateError("");

        const payload = {
            title: newTripDraft.title.trim(),
            city: newTripDraft.city.trim(),
            country: newTripDraft.country.trim(),
            startDate: newTripDraft.startDate,
            endDate: newTripDraft.endDate,
            notes: newTripDraft.notes.trim(),
            latitude: null,
            longitude: null,
        };

        if (!payload.title || !payload.city || !payload.country || !payload.startDate || !payload.endDate) {
            setCreateError("Please fill in title, city, country, start date, and end date.");
            return;
        }
        setCreateLoading(true);
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(TRIPS_BASE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(payload),
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setCreateError(data.message || "Could not create trip.");
                return;
            }

            const createdTripSource = data?.trip ?? data?.tripDto ?? data?.data ?? data;
            const createdTrip = mapTrip(createdTripSource);

            setTripList((prev) => [createdTrip, ...prev]);
            setNewTripDraft({
                title: "",
                city: "",
                country: "",
                startDate: "",
                endDate: "",
                notes: "",
            });
        } catch {
            setCreateError("An error occurred while creating trip.");
        } finally {
            setCreateLoading(false);
        }
    };

    useEffect(() => {
        loadAllTrips();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        const searchValue = countryName.trim();
        if (!searchValue) {
            setError("Please enter a country name.");
            return;
        }

        setLoading(true);
        setError("");
        setSelectedTrip(null);
        setIsEditing(false);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(searchValue)}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setError(data.message || "Search failed.");
                setTripList([]);
            } else {
                const normalizedTrips = extractTrips(data).map(mapTrip);
                setTripList(normalizedTrips);
                if (normalizedTrips.length === 0) {
                    setError("No trips found for that country.");
                }
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const openTripProfile = (trip) => {
        const normalizedTrip = mapTrip(trip);
        setSelectedTrip(normalizedTrip);
        setTripDraft({
            title: normalizedTrip.title ?? "",
            city: normalizedTrip.city ?? "",
            country: normalizedTrip.country ?? "",
            description: normalizedTrip.description ?? "",
            startDate: normalizedTrip.startDate ?? "",
            endDate: normalizedTrip.endDate ?? "",
        });
        setProfileError("");
        setIsEditing(false);
    };

    const handleSaveTrip = async () => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        if (tripId == null || !tripDraft) {
            setProfileError("Cannot edit this trip because it has no id.");
            return;
        }

        setSaving(true);
        setProfileError("");

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const updatePayload = {
                ...tripDraft,
                notes: tripDraft.description ?? "",
                description: tripDraft.description ?? "",
            };
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify(updatePayload),
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setProfileError(data.message || "Could not update trip.");
                return;
            }

            const updatedTrip = mapTrip({ ...selectedTrip, ...tripDraft, ...(data.trip ?? data) });
            setSelectedTrip(updatedTrip);
            setTripList((prev) =>
                prev.map((trip) => (String(trip.id) === String(updatedTrip.id) ? updatedTrip : trip))
            );
            setIsEditing(false);
        } catch {
            setProfileError("An error occurred while updating this trip.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTrip = async () => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        if (tripId == null) {
            setProfileError("Cannot delete this trip because it has no id.");
            return;
        }

        setDeleting(true);
        setProfileError("");

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}`, {
                method: "DELETE",
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setProfileError(data.message || "Could not delete trip.");
                return;
            }

            setTripList((prev) => prev.filter((trip) => String(trip.id) !== String(tripId)));
            setSelectedTrip(null);
            setTripDraft(null);
            setIsEditing(false);
        } catch {
            setProfileError("An error occurred while deleting this trip.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main auth-main-top trips-main-left">
                {!selectedTrip && (
                    <div className="trips-list-layout">
                        <div className="login-container trips-search-container trips-search-container-wide">
                            <h2 className="trips-search-title">Trips</h2>
                            <form className="trips-search-form" onSubmit={handleSearch}>
                                <input
                                    type="text"
                                    placeholder="Search trips by country"
                                    value={countryName}
                                    onChange={(e) => setCountryName(e.target.value)}
                                />
                                <button type="submit">{loading ? "Searching..." : "Search"}</button>
                            </form>
                            <button type="button" className="trips-refresh-button" onClick={loadAllTrips} disabled={loading}>
                                {loading ? "Loading..." : "Show All Trips"}
                            </button>
                            {error && <p className="error">{error}</p>}
                            <div className="trips-list trips-list-tall">
                                {!loading && tripList.length === 0 && <p>No trips available.</p>}
                                {tripList.map((trip) => (
                                    <button
                                        key={trip.id ?? `${trip.title}-${trip.city}-${trip.country}`}
                                        type="button"
                                        className="trip-list-item"
                                        onClick={() => openTripProfile(trip)}
                                    >
                                        <p className="trip-list-title">{trip.title}</p>
                                        <p className="trip-list-meta">{trip.city}, {trip.country}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="login-container trips-add-section">
                            <h3 className="trips-add-title">Add A Trip</h3>
                            <form className="trips-add-form" onSubmit={handleAddTrip}>
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={newTripDraft.title}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={newTripDraft.city}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, city: e.target.value }))}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Country"
                                    value={newTripDraft.country}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, country: e.target.value }))}
                                    required
                                />
                                <input
                                    type="date"
                                    value={newTripDraft.startDate}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                                    required
                                />
                                <input
                                    type="date"
                                    value={newTripDraft.endDate}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Notes"
                                    value={newTripDraft.notes}
                                    onChange={(e) => setNewTripDraft((prev) => ({ ...prev, notes: e.target.value }))}
                                />
                                <button type="submit" disabled={createLoading}>
                                    {createLoading ? "Adding..." : "Add Trip"}
                                </button>
                            </form>
                            {createError && <p className="error">{createError}</p>}
                        </div>
                    </div>
                )}

                {selectedTrip && (
                    <div className="trips-profile-layout">
                        <div className="login-container trips-profile-container">
                            <h2 className="trips-search-title">Trip Profile</h2>
                            {profileError && <p className="error">{profileError}</p>}

                            {!isEditing && (
                                <div className="trips-profile-card">
                                    <div className="profile-row">
                                        <span className="profile-label">Title</span>
                                        <span className="profile-value">{selectedTrip.title || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">City</span>
                                        <span className="profile-value">{selectedTrip.city || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Country</span>
                                        <span className="profile-value">{selectedTrip.country || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Start Date</span>
                                        <span className="profile-value">{formatDate(selectedTrip.startDate)}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">End Date</span>
                                        <span className="profile-value">{formatDate(selectedTrip.endDate)}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Description</span>
                                        <span className="profile-value">{selectedTrip.description || "N/A"}</span>
                                    </div>
                                </div>
                            )}

                            {isEditing && tripDraft && (
                                <div className="trips-profile-card trips-edit-card">
                                    <label className="trips-edit-field">
                                        <span className="profile-label">Title</span>
                                        <input
                                            type="text"
                                            value={tripDraft.title}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, title: e.target.value }))}
                                        />
                                    </label>
                                    <label className="trips-edit-field">
                                        <span className="profile-label">City</span>
                                        <input
                                            type="text"
                                            value={tripDraft.city}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, city: e.target.value }))}
                                        />
                                    </label>
                                    <label className="trips-edit-field">
                                        <span className="profile-label">Country</span>
                                        <input
                                            type="text"
                                            value={tripDraft.country}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, country: e.target.value }))}
                                        />
                                    </label>
                                    <label className="trips-edit-field">
                                        <span className="profile-label">Start Date</span>
                                        <input
                                            type="date"
                                            value={formatDate(tripDraft.startDate) === "N/A" ? "" : formatDate(tripDraft.startDate)}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                                        />
                                    </label>
                                    <label className="trips-edit-field">
                                        <span className="profile-label">End Date</span>
                                        <input
                                            type="date"
                                            value={formatDate(tripDraft.endDate) === "N/A" ? "" : formatDate(tripDraft.endDate)}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                                        />
                                    </label>
                                    <label className="trips-edit-field">
                                        <span className="profile-label">Description</span>
                                        <input
                                            type="text"
                                            value={tripDraft.description}
                                            onChange={(e) => setTripDraft((prev) => ({ ...prev, description: e.target.value }))}
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="trips-profile-actions">
                                {!isEditing && (
                                    <button type="button" onClick={() => setIsEditing(true)}>
                                        Edit Trip
                                    </button>
                                )}
                                {isEditing && (
                                    <>
                                        <button type="button" onClick={handleSaveTrip} disabled={saving}>
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button type="button" className="text-action-button" onClick={() => setIsEditing(false)}>
                                            Cancel
                                        </button>
                                    </>
                                )}
                                <button type="button" onClick={handleDeleteTrip} disabled={deleting}>
                                    {deleting ? "Deleting..." : "Delete Trip"}
                                </button>
                                <button
                                    type="button"
                                    className="text-action-button"
                                    onClick={() => {
                                        setSelectedTrip(null);
                                        setIsEditing(false);
                                        setProfileError("");
                                    }}
                                >
                                    Back To Trips
                                </button>
                            </div>
                        </div>

                        <div className="trips-photos-panel">
                            <h3 className="trips-photos-title">Trip Photos</h3>
                            {extractPhotoUrls(selectedTrip).length > 0 ? (
                                <BounceCards
                                    className="trips-bounce-cards"
                                    images={extractPhotoUrls(selectedTrip)}
                                    containerWidth={340}
                                    containerHeight={260}
                                    animationDelay={0.8}
                                    animationStagger={0.08}
                                    easeType="elastic.out(1, 0.5)"
                                    transformStyles={[
                                        "rotate(5deg) translate(-110px)",
                                        "rotate(0deg) translate(-55px)",
                                        "rotate(-5deg)",
                                        "rotate(5deg) translate(55px)",
                                        "rotate(-5deg) translate(110px)",
                                    ]}
                                    enableHover={false}
                                />
                            ) : (
                                <p className="trips-no-photos">No trip photos available.</p>
                            )}
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
