import { useEffect, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import BounceCards from "../bits/BounceCards";
import { useImageUpload } from "../services/useImageUploads";

const BASE_URL = "http://localhost:8080";
const TRIPS_BASE_URL = `${BASE_URL}/nomadTrack/trips`;
const AUTH_ME_URL = `${BASE_URL}/nomadTrack/auth/me`;
const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

export default function Trips({ isAuthenticated, setIsAuthenticated }) {
    const { uploadAndPersistTripPhotos, deletePersistedTripPhoto } = useImageUpload();
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
    const [tripLikeCount, setTripLikeCount] = useState(0);
    const [tripLikeLoading, setTripLikeLoading] = useState(false);
    const [tripLikeError, setTripLikeError] = useState("");
    const [tripComments, setTripComments] = useState([]);
    const [tripCommentsLoading, setTripCommentsLoading] = useState(false);
    const [tripCommentsError, setTripCommentsError] = useState("");
    const [newCommentText, setNewCommentText] = useState("");
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");
    const [commentActionLoadingId, setCommentActionLoadingId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [selectedPhotoFiles, setSelectedPhotoFiles] = useState([]);
    const [photoUploadLoading, setPhotoUploadLoading] = useState(false);
    const [photoUploadError, setPhotoUploadError] = useState("");
    const [photoUploadSuccess, setPhotoUploadSuccess] = useState("");
    const [photoDeleteLoadingId, setPhotoDeleteLoadingId] = useState(null);
    const [photoInputResetKey, setPhotoInputResetKey] = useState(0);

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

    const resolvePhotoUrl = (photo) => {
        if (typeof photo === "string") return photo;
        if (!photo || typeof photo !== "object") return "";
        return (
            photo.url ??
            photo.photoUrl ??
            photo.imageUrl ??
            photo.src ??
            photo.fileUrl ??
            photo.tripPhotoUrl ??
            photo.photoURL ??
            photo.path ??
            photo.image ??
            photo.location ??
            ""
        );
    };

    const resolvePhotoId = (photo) => {
        if (!photo || typeof photo !== "object") return null;
        const candidate = photo.photoId ?? photo.id ?? photo.tripPhotoId ?? photo.trip_photo_id ?? null;
        if (candidate == null) return null;
        const normalized = String(candidate).trim();
        return normalized || null;
    };

    const extractPhotosFromResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.photos)) return data.photos;
        if (Array.isArray(data?.tripPhotos)) return data.tripPhotos;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        if (data?.photo && typeof data.photo === "object") return [data.photo];
        return [];
    };

    const extractPhotoUrls = (trip) => {
        const photos = Array.isArray(trip?.tripPhotos) ? trip.tripPhotos : [];
        const urls = photos
            .map((photo) => resolvePhotoUrl(photo))
            .filter((url) => typeof url === "string" && url.trim() !== "");
        return urls;
    };

    const extractPhotoItems = (trip) => {
        const photos = Array.isArray(trip?.tripPhotos) ? trip.tripPhotos : [];
        return photos
            .map((photo, index) => {
                if (typeof photo === "string") {
                    return {
                        photoId: null,
                        url: photo,
                        key: `url-${index}-${photo}`,
                    };
                }
                if (!photo || typeof photo !== "object") return null;
                const url = resolvePhotoUrl(photo);
                if (!url) return null;
                const photoId = resolvePhotoId(photo);
                return {
                    photoId,
                    url,
                    key: photoId ? `photo-${photoId}` : `url-${index}-${url}`,
                };
            })
            .filter(Boolean);
    };

    const getTripLikesFromResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.likes)) return data.likes;
        if (Array.isArray(data?.tripLikes)) return data.tripLikes;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        return [];
    };

    const getTripLikeCountFromResponse = (data) => {
        if (typeof data?.likeCount === "number") return data.likeCount;
        if (typeof data?.likesCount === "number") return data.likesCount;
        if (typeof data?.totalLikes === "number") return data.totalLikes;
        return getTripLikesFromResponse(data).length;
    };

    const extractCommentsFromResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.comments)) return data.comments;
        if (Array.isArray(data?.tripComments)) return data.tripComments;
        if (Array.isArray(data?.commentDtos)) return data.commentDtos;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        return [];
    };

    const mapComment = (comment) => {
        const fullName =
            [comment?.firstName, comment?.lastName].filter(Boolean).join(" ") ||
            [comment?.userFirstName, comment?.userLastName].filter(Boolean).join(" ") ||
            [comment?.authorFirstName, comment?.authorLastName].filter(Boolean).join(" ") ||
            [comment?.user?.firstName, comment?.user?.lastName].filter(Boolean).join(" ");

        return {
            id: comment?.id ?? comment?.commentId ?? comment?.tripCommentId ?? null,
            userId: comment?.userId ?? comment?.user?.id ?? comment?.authorId ?? comment?.ownerId ?? null,
            text: comment?.comment ?? comment?.content ?? comment?.text ?? comment?.message ?? "",
            authorName: fullName || comment?.authorName || comment?.userName || comment?.username || "Unknown User",
            createdAt: comment?.createdAt ?? comment?.created_at ?? comment?.timestamp ?? "",
        };
    };

    const formatDate = (value) => {
        if (!value || typeof value !== "string") return "N/A";
        const isoDate = value.includes("T") ? value.split("T")[0] : value;
        return isoDate || "N/A";
    };

    const normalizeId = (value) => {
        if (value == null) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const loadCurrentUser = async () => {
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(AUTH_ME_URL, {
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) return;
            setCurrentUserId(normalizeId(data?.id ?? data?.user?.id));
        } catch {
            // Keep null user id if request fails.
        }
    };

    const loadTripLikesCount = async (tripId) => {
        if (!tripId) return;
        setTripLikeLoading(true);
        setTripLikeError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/likes`, {
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripLikeError(data.message || "Could not load likes.");
                setTripLikeCount(0);
                return;
            }
            setTripLikeCount(getTripLikeCountFromResponse(data));
        } catch {
            setTripLikeError("An error occurred while loading likes.");
            setTripLikeCount(0);
        } finally {
            setTripLikeLoading(false);
        }
    };

    const loadTripComments = async (tripId) => {
        if (!tripId) return;
        setTripCommentsLoading(true);
        setTripCommentsError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/comments`, {
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripCommentsError(data.message || "Could not load comments.");
                setTripComments([]);
                return;
            }
            setTripComments(extractCommentsFromResponse(data).map(mapComment));
        } catch {
            setTripCommentsError("An error occurred while loading comments.");
            setTripComments([]);
        } finally {
            setTripCommentsLoading(false);
        }
    };

    const loadTripEngagement = async (tripId) => {
        if (!tripId) return;
        await Promise.all([
            loadTripLikesCount(tripId),
            loadTripComments(tripId),
        ]);
    };

    const loadTripPhotos = async (tripId) => {
        if (!tripId) return;
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/photos`, {
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) return;

            const photos = extractPhotosFromResponse(data);
            const normalizedPhotos = photos
                .map((photo) => {
                    if (typeof photo === "string") return photo;
                    if (!photo || typeof photo !== "object") return null;
                    const url = resolvePhotoUrl(photo);
                    return url ? { ...photo, url } : null;
                })
                .filter(Boolean);

            setSelectedTrip((prev) => {
                if (!prev || String(prev.id) !== String(tripId)) return prev;
                return { ...prev, tripPhotos: normalizedPhotos };
            });

            setTripList((prev) =>
                prev.map((trip) =>
                    String(trip.id) === String(tripId)
                        ? { ...trip, tripPhotos: normalizedPhotos }
                        : trip
                )
            );
        } catch {
            // Keep existing trip photos when request fails.
        }
    };

    const createTripComment = async () => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        const commentText = newCommentText.trim();
        if (!tripId || !commentText || commentSubmitting) return;

        setCommentSubmitting(true);
        setTripCommentsError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/comments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({ comment: commentText }),
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripCommentsError(data.message || "Could not create comment.");
                return;
            }
            setNewCommentText("");
            await loadTripComments(tripId);
        } catch {
            setTripCommentsError("An error occurred while creating comment.");
        } finally {
            setCommentSubmitting(false);
        }
    };

    const beginEditComment = (comment) => {
        setEditingCommentId(comment?.id ?? null);
        setEditingCommentText(comment?.text ?? "");
        setTripCommentsError("");
    };

    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    const saveEditedComment = async (commentId) => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        const nextText = editingCommentText.trim();
        if (!tripId || !commentId || !nextText) return;

        setCommentActionLoadingId(commentId);
        setTripCommentsError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const payload = JSON.stringify({ comment: nextText });
            const methodsToTry = ["PUT", "PATCH"];
            let response = null;
            let data = {};

            for (const method of methodsToTry) {
                response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    body: payload,
                });
                data = await parseApiResponse(response);
                if (response.ok) break;
                if (response.status !== 405) break;
            }

            if (!response || !response.ok) {
                setTripCommentsError(data.message || "Could not update comment.");
                return;
            }

            cancelEditComment();
            await loadTripComments(tripId);
        } catch {
            setTripCommentsError("An error occurred while updating comment.");
        } finally {
            setCommentActionLoadingId(null);
        }
    };

    const deleteComment = async (commentId) => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        if (!tripId || !commentId) return;
        setCommentActionLoadingId(commentId);
        setTripCommentsError("");
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${TRIPS_BASE_URL}/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`, {
                method: "DELETE",
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripCommentsError(data.message || "Could not delete comment.");
                return;
            }
            if (editingCommentId === commentId) {
                cancelEditComment();
            }
            await loadTripComments(tripId);
        } catch {
            setTripCommentsError("An error occurred while deleting comment.");
        } finally {
            setCommentActionLoadingId(null);
        }
    };

    const isOwnComment = (comment) => {
        return normalizeId(comment?.userId) != null && normalizeId(comment?.userId) === currentUserId;
    };

    const loadAllTrips = async () => {
        setLoading(true);
        setError("");
        setSelectedTrip(null);
        setIsEditing(false);
        setTripLikeCount(0);
        setTripLikeError("");
        setTripComments([]);
        setTripCommentsError("");
        setNewCommentText("");
        cancelEditComment();

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
        loadCurrentUser();
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
        setTripLikeCount(0);
        setTripLikeError("");
        setTripComments([]);
        setTripCommentsError("");
        setNewCommentText("");
        cancelEditComment();

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
        cancelEditComment();
        setNewCommentText("");
        setSelectedPhotoFiles([]);
        setPhotoUploadError("");
        setPhotoUploadSuccess("");
        setPhotoDeleteLoadingId(null);
        setPhotoInputResetKey((prev) => prev + 1);
        loadTripPhotos(normalizedTrip.id);
        loadTripEngagement(normalizedTrip.id);
    };

    const handlePhotoFileChange = (event) => {
        const nextFiles = Array.from(event?.target?.files ?? []);
        setSelectedPhotoFiles(nextFiles);
        setPhotoUploadError("");
        setPhotoUploadSuccess("");
    };

    const handleUploadTripPhotos = async () => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        if (!tripId) {
            setPhotoUploadError("Select a valid trip before uploading photos.");
            return;
        }
        if (selectedPhotoFiles.length === 0) {
            setPhotoUploadError("Choose at least one image to upload.");
            return;
        }

        setPhotoUploadLoading(true);
        setPhotoUploadError("");
        setPhotoUploadSuccess("");
        setPhotoDeleteLoadingId(null);
        try {
            const currentPhotoCount = extractPhotoUrls(selectedTrip).length;
            const { uploadedUrls, savedPhotos } = await uploadAndPersistTripPhotos(tripId, selectedPhotoFiles, {
                startSortOrder: currentPhotoCount,
            });
            if (!Array.isArray(uploadedUrls) || uploadedUrls.length === 0) {
                setPhotoUploadError("Upload succeeded but no image URLs were returned.");
                return;
            }

            const persistedPhotoEntries =
                Array.isArray(savedPhotos) && savedPhotos.length > 0
                    ? savedPhotos
                        .map((photo, index) => {
                            if (!photo || typeof photo !== "object") {
                                return { url: uploadedUrls[index] };
                            }
                            const resolvedUrl = resolvePhotoUrl(photo) || uploadedUrls[index] || "";
                            return { ...photo, url: resolvedUrl };
                        })
                    : uploadedUrls.map((url) => ({ url }));

            setSelectedTrip((prev) => {
                if (!prev) return prev;
                const nextTripPhotos = [
                    ...(Array.isArray(prev.tripPhotos) ? prev.tripPhotos : []),
                    ...persistedPhotoEntries,
                ];
                return { ...prev, tripPhotos: nextTripPhotos };
            });

            setTripList((prev) =>
                prev.map((trip) => {
                    if (String(trip.id) !== String(tripId)) return trip;
                    return {
                        ...trip,
                        tripPhotos: [
                            ...(Array.isArray(trip.tripPhotos) ? trip.tripPhotos : []),
                            ...persistedPhotoEntries,
                        ],
                    };
                })
            );

            setSelectedPhotoFiles([]);
            setPhotoInputResetKey((prev) => prev + 1);
            await loadTripPhotos(tripId);
            setPhotoUploadSuccess(
                `Uploaded ${uploadedUrls.length} image${uploadedUrls.length === 1 ? "" : "s"} to S3.`
            );
        } catch (uploadError) {
            const message =
                uploadError instanceof Error
                    ? uploadError.message
                    : "An error occurred while uploading images.";
            setPhotoUploadError(message);
        } finally {
            setPhotoUploadLoading(false);
        }
    };

    const handleDeleteTripPhoto = async (photoItem) => {
        const tripId = normalizeTripId(selectedTrip) ?? normalizeTripId(resolveTripDto(selectedTrip));
        if (!tripId) {
            setPhotoUploadError("Select a valid trip before deleting photos.");
            return;
        }
        if (!photoItem?.photoId) {
            setPhotoUploadError("This photo cannot be deleted because it has no photo id.");
            return;
        }

        setPhotoDeleteLoadingId(String(photoItem.photoId));
        setPhotoUploadError("");
        setPhotoUploadSuccess("");
        try {
            await deletePersistedTripPhoto(photoItem.photoId);
            setSelectedTrip((prev) => {
                if (!prev) return prev;
                const currentPhotos = Array.isArray(prev.tripPhotos) ? prev.tripPhotos : [];
                const nextTripPhotos = currentPhotos.filter(
                    (photo) => String(resolvePhotoId(photo)) !== String(photoItem.photoId)
                );
                return { ...prev, tripPhotos: nextTripPhotos };
            });

            setTripList((prev) =>
                prev.map((trip) => {
                    if (String(trip.id) !== String(tripId)) return trip;
                    const currentPhotos = Array.isArray(trip.tripPhotos) ? trip.tripPhotos : [];
                    return {
                        ...trip,
                        tripPhotos: currentPhotos.filter(
                            (photo) => String(resolvePhotoId(photo)) !== String(photoItem.photoId)
                        ),
                    };
                })
            );
            await loadTripPhotos(tripId);
            setPhotoUploadSuccess("Photo deleted.");
        } catch (deleteError) {
            const message =
                deleteError instanceof Error
                    ? deleteError.message
                    : "An error occurred while deleting the photo.";
            setPhotoUploadError(message);
        } finally {
            setPhotoDeleteLoadingId(null);
        }
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
            setTripLikeCount(0);
            setTripLikeError("");
            setTripComments([]);
            setTripCommentsError("");
            setNewCommentText("");
            cancelEditComment();
            setSelectedPhotoFiles([]);
            setPhotoUploadError("");
            setPhotoUploadSuccess("");
            setPhotoDeleteLoadingId(null);
            setPhotoInputResetKey((prev) => prev + 1);
        } catch {
            setProfileError("An error occurred while deleting this trip.");
        } finally {
            setDeleting(false);
        }
    };

    const selectedPhotoItems = extractPhotoItems(selectedTrip);

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main auth-main-top trips-main-left">
                {!selectedTrip && (
                    <div className="trips-list-layout">
                        <div className="login-container trips-search-container trips-search-container-wide">
                            <h2 className="trips-search-title section-split-heading">
                                <span className="heading-blue">My</span><span className="heading-white">Trips</span>
                            </h2>
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
                            <h2 className="trips-search-title section-split-heading">
                                <span className="heading-blue">Trip</span><span className="heading-white">Profile</span>
                            </h2>
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

                        <div className="trips-photos-panel trips-photos-panel-compact">
                            <h3 className="trips-photos-title">Trip Photos</h3>
                            <div className="trip-photo-upload-controls">
                                <input
                                    key={photoInputResetKey}
                                    id={`trip-photo-upload-${photoInputResetKey}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoFileChange}
                                    className="trip-photo-upload-input-hidden"
                                    disabled={photoUploadLoading}
                                />
                                <label
                                    htmlFor={`trip-photo-upload-${photoInputResetKey}`}
                                    className={`trip-photo-upload-button ${photoUploadLoading ? "trip-photo-upload-button-disabled" : ""}`}
                                >
                                    Choose File
                                </label>
                                <input
                                    className="trip-photo-upload-input"
                                    value={
                                        selectedPhotoFiles.length > 0
                                            ? `${selectedPhotoFiles.length} file${selectedPhotoFiles.length === 1 ? "" : "s"} selected`
                                            : "No file selected"
                                    }
                                    readOnly
                                />
                                <button
                                    type="button"
                                    className="trip-photo-upload-button"
                                    onClick={handleUploadTripPhotos}
                                    disabled={photoUploadLoading || selectedPhotoFiles.length === 0}
                                >
                                    {photoUploadLoading ? "Uploading..." : "Upload Image"}
                                </button>
                            </div>
                            {selectedPhotoFiles.length > 0 && (
                                <p className="trip-photo-upload-meta">
                                    Selected: {selectedPhotoFiles[0]?.name}
                                </p>
                            )}
                            {photoUploadError && <p className="error">{photoUploadError}</p>}
                            {photoUploadSuccess && <p className="trip-photo-upload-success">{photoUploadSuccess}</p>}
                            {selectedPhotoItems.length > 0 ? (
                                <BounceCards
                                    className="trips-bounce-cards"
                                    images={selectedPhotoItems.map((photo) => photo.url)}
                                    onRemoveImage={(index) => {
                                        const targetPhoto = selectedPhotoItems[index];
                                        if (!targetPhoto) return;
                                        handleDeleteTripPhoto(targetPhoto);
                                    }}
                                    removingImageIndex={selectedPhotoItems.findIndex(
                                        (photo) => photo.photoId != null && String(photo.photoId) === String(photoDeleteLoadingId)
                                    )}
                                    containerWidth={420}
                                    containerHeight={300}
                                    animationDelay={0.8}
                                    animationStagger={0.08}
                                    easeType="elastic.out(1, 0.5)"
                                    transformStyles={[
                                        "rotate(6deg) translate(-190px)",
                                        "rotate(2deg) translate(-95px)",
                                        "rotate(-3deg)",
                                        "rotate(3deg) translate(95px)",
                                        "rotate(-6deg) translate(190px)",
                                    ]}
                                    enableHover={false}
                                />
                            ) : (
                                <p className="trips-no-photos">No trip photos available.</p>
                            )}
                        </div>

                        <div className="login-container trips-activity-panel">
                            <h3 className="trips-photos-title section-split-heading section-split-heading-small">
                                <span className="heading-blue">Trip</span><span className="heading-white">Activity</span>
                            </h3>
                            {tripLikeError && <p className="error">{tripLikeError}</p>}
                            <p className="trip-like-summary">
                                Likes: {tripLikeLoading ? "Loading..." : tripLikeCount}
                            </p>
                            <h4 className="trips-photos-title">Comments</h4>
                            {tripCommentsError && <p className="error">{tripCommentsError}</p>}
                            <div className="trip-comments-list">
                                {tripCommentsLoading && <p className="trip-placeholder-text">Loading comments...</p>}
                                {!tripCommentsLoading && tripComments.length === 0 && (
                                    <p className="trip-placeholder-text">No comments yet.</p>
                                )}
                                {!tripCommentsLoading && tripComments.length > 0 && (
                                    <div className="trip-comment-items">
                                        {tripComments.map((comment) => (
                                            <div className="trip-comment-item" key={comment.id ?? `${comment.authorName}-${comment.createdAt}`}>
                                                <div className="trip-comment-meta">
                                                    <span>{comment.authorName || "Unknown User"}</span>
                                                    <span>{formatDate(comment.createdAt)}</span>
                                                </div>
                                                {editingCommentId === comment.id ? (
                                                    <input
                                                        type="text"
                                                        value={editingCommentText}
                                                        onChange={(e) => setEditingCommentText(e.target.value)}
                                                    />
                                                ) : (
                                                    <p className="trip-comment-text">{comment.text || "N/A"}</p>
                                                )}
                                                {isOwnComment(comment) && (
                                                    <div className="trip-comment-actions">
                                                        {editingCommentId === comment.id ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => saveEditedComment(comment.id)}
                                                                    disabled={commentActionLoadingId === comment.id}
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="text-action-button"
                                                                    onClick={cancelEditComment}
                                                                    disabled={commentActionLoadingId === comment.id}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => beginEditComment(comment)}
                                                                    disabled={commentActionLoadingId === comment.id}
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteComment(comment.id)}
                                                                    disabled={commentActionLoadingId === comment.id}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="trip-comment-composer">
                                <input
                                    type="text"
                                    placeholder="Write a comment"
                                    value={newCommentText}
                                    onChange={(e) => setNewCommentText(e.target.value)}
                                />
                            </div>
                            <div className="trip-feedback-actions">
                                <button
                                    type="button"
                                    onClick={createTripComment}
                                    disabled={commentSubmitting || newCommentText.trim() === ""}
                                >
                                    {commentSubmitting ? "Posting..." : "Comment"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
