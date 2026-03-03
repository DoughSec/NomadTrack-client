import { useEffect, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";

const BASE_URL = "http://localhost:8080";
const AUTH_ME_URL = `${BASE_URL}/nomadTrack/auth/me`;
const USERS_ME_URL = `${BASE_URL}/nomadTrack/users/me`;
const FOLLOWING_URL = `${BASE_URL}/nomadTrack/follows/following`;
const FOLLOWERS_URL = `${BASE_URL}/nomadTrack/follows/followers`;
const USER_FOLLOWING_URL = `${BASE_URL}/nomadTrack/follow`;
const USER_FOLLOWERS_URL = `${BASE_URL}/nomadTrack/follows`;
const USER_TRIPS_URL = `${BASE_URL}/nomadTrack/trips/user`;
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
    const [selectedUserTrips, setSelectedUserTrips] = useState([]);
    const [selectedUserTripsLoading, setSelectedUserTripsLoading] = useState(false);
    const [selectedUserTripsError, setSelectedUserTripsError] = useState("");
    const [selectedTrip, setSelectedTrip] = useState(null);
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
    const getUserId = (user) => normalizeId(user?.id);

    const formatDate = (value) => {
        if (!value) return "N/A";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleDateString();
    };

    const normalizeTripId = (trip) => {
        if (!trip || typeof trip !== "object") return null;
        const candidates = [trip.id, trip.tripId, trip.trip_id];
        const found = candidates.find((value) => value != null && value !== "");
        return normalizeId(found);
    };

    const resolveTripDto = (trip) => {
        if (!trip || typeof trip !== "object") return {};
        return trip.trip ?? trip.tripDto ?? trip.dto ?? trip.data ?? trip.result ?? trip;
    };

    const getTripLikeId = (like) =>
        normalizeId(like?.id ?? like?.likeId ?? like?.tripLikeId ?? like?.trip_like_id);

    const getTripLikeUserId = (like) =>
        normalizeId(
            like?.userId ??
            like?.user?.id ??
            like?.likerId ??
            like?.likedByUserId ??
            like?.ownerId
        );

    const getTripLikesArray = (dto) => {
        if (Array.isArray(dto?.likes)) return dto.likes;
        if (Array.isArray(dto?.tripLikes)) return dto.tripLikes;
        if (Array.isArray(dto?.likeDtos)) return dto.likeDtos;
        return [];
    };

    const getTripLikesFromResponse = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.likes)) return data.likes;
        if (Array.isArray(data?.tripLikes)) return data.tripLikes;
        if (Array.isArray(data?.likeDtos)) return data.likeDtos;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        return [];
    };

    const resolveTripLikeCountFromResponse = (data) => {
        if (typeof data?.likeCount === "number") return data.likeCount;
        if (typeof data?.likesCount === "number") return data.likesCount;
        if (typeof data?.totalLikes === "number") return data.totalLikes;
        return getTripLikesFromResponse(data).length;
    };

    const resolveTripLikeCount = (dto) => {
        if (typeof dto?.likeCount === "number") return dto.likeCount;
        if (typeof dto?.likesCount === "number") return dto.likesCount;
        if (typeof dto?.totalLikes === "number") return dto.totalLikes;
        return getTripLikesArray(dto).length;
    };

    const resolveTripLikeState = (dto, currentUserId) => {
        const explicitLiked = dto?.isLiked ?? dto?.likedByCurrentUser ?? dto?.liked;
        const explicitLikeId = normalizeId(dto?.likeId ?? dto?.myLikeId ?? dto?.currentUserLikeId);
        if (typeof explicitLiked === "boolean") {
            return {
                isLiked: explicitLiked,
                likeId: explicitLikeId,
            };
        }

        const likes = getTripLikesArray(dto);
        if (likes.length > 0 && currentUserId != null) {
            const matchedLike = likes.find((like) => getTripLikeUserId(like) === currentUserId);
            if (matchedLike) {
                return {
                    isLiked: true,
                    likeId: getTripLikeId(matchedLike),
                };
            }
        }

        return {
            isLiked: false,
            likeId: explicitLikeId,
        };
    };

    const getTripOwnerId = (dto) =>
        normalizeId(
            dto?.userId ??
            dto?.user?.id ??
            dto?.ownerId ??
            dto?.owner?.id ??
            dto?.tripUserId ??
            dto?.createdByUserId ??
            dto?.authorId
        );

    const extractTrips = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.trips)) return data.trips;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.results)) return data.results;
        if (Array.isArray(data?.content)) return data.content;
        if (data?.trip && typeof data.trip === "object") return [data.trip];
        if (data?.tripDto && typeof data.tripDto === "object") return [data.tripDto];
        if (data?.result?.trip && typeof data.result.trip === "object") return [data.result.trip];
        return [];
    };

    const mapTrip = (trip) => {
        const currentUserId = getUserId(profile);
        const dto = resolveTripDto(trip);
        const likeState = resolveTripLikeState(dto, currentUserId);
        return {
            id: normalizeTripId(dto) ?? normalizeTripId(trip),
            title: dto?.title ?? dto?.tripTitle ?? dto?.name ?? "Untitled Trip",
            city: dto?.city ?? dto?.tripCity ?? "Unknown City",
            country: dto?.country ?? dto?.tripCountry ?? "Unknown Country",
            startDate: dto?.startDate ?? dto?.start_date ?? dto?.tripStartDate ?? "",
            endDate: dto?.endDate ?? dto?.end_date ?? dto?.tripEndDate ?? "",
            description: dto?.description ?? dto?.notes ?? dto?.tripDescription ?? "",
            tripPhotos: Array.isArray(dto?.tripPhotos) ? dto.tripPhotos : Array.isArray(dto?.photos) ? dto.photos : [],
            isLiked: likeState.isLiked,
            likeId: likeState.likeId,
            likeCount: resolveTripLikeCount(dto),
            ownerUserId: getTripOwnerId(dto),
        };
    };

    const extractPhotoUrl = (photo) => {
        if (!photo) return null;
        if (typeof photo === "string") return photo;
        return photo.url ?? photo.photoUrl ?? photo.imageUrl ?? photo.src ?? null;
    };

    const normalizeCommentId = (comment) =>
        normalizeId(comment?.id ?? comment?.commentId ?? comment?.tripCommentId ?? comment?.trip_comment_id);

    const getCommentText = (comment) =>
        comment?.comment ?? comment?.content ?? comment?.text ?? comment?.message ?? comment?.body ?? comment?.description ?? "";

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
        const userId = normalizeId(comment?.userId ?? comment?.user?.id ?? comment?.authorId ?? comment?.ownerId);
        const explicitName =
            [comment?.firstName, comment?.lastName].filter(Boolean).join(" ") ||
            [comment?.userFirstName, comment?.userLastName].filter(Boolean).join(" ") ||
            [comment?.authorFirstName, comment?.authorLastName].filter(Boolean).join(" ") ||
            [comment?.user?.firstName, comment?.user?.lastName].filter(Boolean).join(" ");
        const profileName = userId != null && userId === getUserId(profile)
            ? [profile?.firstName, profile?.lastName].filter(Boolean).join(" ")
            : "";

        return {
            id: normalizeCommentId(comment),
            text: getCommentText(comment),
            userId,
            authorName:
                explicitName ||
                comment?.authorName ||
                comment?.userName ||
                comment?.username ||
                profileName ||
                "Unknown User",
            createdAt: comment?.createdAt ?? comment?.created_at ?? comment?.timestamp ?? "",
        };
    };

    const loadSelectedUserTrips = async (userId) => {
        if (!userId) return;
        setSelectedUserTripsLoading(true);
        setSelectedUserTripsError("");
        setSelectedUserTrips([]);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${USER_TRIPS_URL}/${encodeURIComponent(userId)}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });
            const data = await parseApiResponse(response);

            if (!response.ok) {
                setSelectedUserTripsError(data.message || `Could not load trips (${response.status}).`);
                return;
            }

            setSelectedUserTrips(extractTrips(data).map(mapTrip));
        } catch {
            setSelectedUserTripsError("An error occurred while loading this user's trips.");
        } finally {
            setSelectedUserTripsLoading(false);
        }
    };

    const handleViewProfile = (user) => {
        setSelectedTrip(null);
        setTripLikeError("");
        setTripComments([]);
        setTripCommentsError("");
        setNewCommentText("");
        cancelEditComment();
        setSelectedUser(user);
        const userId = getUserId(user);
        loadSelectedUserStats(userId);
        loadSelectedUserTrips(userId);
    };

    const handleViewTrip = (trip) => {
        setTripLikeError("");
        setTripCommentsError("");
        setEditingCommentId(null);
        setEditingCommentText("");
        setNewCommentText("");
        setSelectedTrip(trip);
        const tripId = normalizeId(trip?.id);
        if (tripId) {
            loadTripLikes(tripId);
            loadTripComments(tripId);
        }
    };

    const extractLikeIdFromResponse = (data) => {
        return (
            normalizeId(data?.likeId) ??
            normalizeId(data?.id) ??
            normalizeId(data?.like?.id) ??
            normalizeId(data?.data?.id) ??
            normalizeId(data?.result?.id) ??
            null
        );
    };

    const loadTripLikes = async (tripId) => {
        const normalizedTripId = normalizeId(tripId);
        if (!normalizedTripId) return;
        const authToken = normalizeToken(localStorage.getItem("token"));
        const currentUserId = getUserId(profile);

        try {
            const response = await fetch(
                `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(normalizedTripId)}/likes`,
                {
                    headers: {
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                }
            );
            const data = await parseApiResponse(response);
            if (!response.ok) return;

            const likes = getTripLikesFromResponse(data);
            const matchedLike = likes.find((like) => getTripLikeUserId(like) === currentUserId);
            const isLiked = Boolean(matchedLike);
            const likeId = getTripLikeId(matchedLike);
            const likeCount = resolveTripLikeCountFromResponse(data);
            const knownOwnerId = normalizeId(selectedTrip?.ownerUserId);

            setSelectedTrip((prev) => {
                if (!prev || normalizeId(prev.id) !== normalizedTripId) return prev;
                return {
                    ...prev,
                    isLiked,
                    likeId: likeId ?? null,
                    likeCount,
                    ownerUserId: knownOwnerId ?? normalizeId(prev.ownerUserId),
                };
            });

            setSelectedUserTrips((prev) =>
                prev.map((trip) =>
                    normalizeId(trip.id) === normalizedTripId
                        ? {
                            ...trip,
                            isLiked,
                            likeId: likeId ?? null,
                            likeCount,
                        }
                        : trip
                )
            );
        } catch {
            // Keep existing local like data on fetch failure.
        }
    };

    const loadTripComments = async (tripId) => {
        const normalizedTripId = normalizeId(tripId);
        if (!normalizedTripId) return;
        const authToken = normalizeToken(localStorage.getItem("token"));
        setTripCommentsLoading(true);
        setTripCommentsError("");

        try {
            const response = await fetch(
                `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(normalizedTripId)}/comments`,
                {
                    headers: {
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                }
            );
            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripCommentsError(data.message || "Could not load comments for this trip.");
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

    const createTripComment = async () => {
        if (commentSubmitting || !selectedTrip) return;
        const tripId = normalizeId(selectedTrip.id);
        const commentText = newCommentText.trim();
        if (!tripId || !commentText) return;
        const authToken = normalizeToken(localStorage.getItem("token"));
        setCommentSubmitting(true);
        setTripCommentsError("");

        try {
            const response = await fetch(
                `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(tripId)}/comments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                    body: JSON.stringify({ comment: commentText }),
                }
            );
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
        setEditingCommentId(comment.id ?? null);
        setEditingCommentText(comment.text ?? "");
        setTripCommentsError("");
    };

    const cancelEditComment = () => {
        setEditingCommentId(null);
        setEditingCommentText("");
    };

    const isOwnComment = (comment) => {
        const currentUserId = getUserId(profile);
        return currentUserId != null && normalizeId(comment?.userId) === currentUserId;
    };

    const canLikeSelectedTrip = () => {
        if (!selectedTrip) return false;
        const currentUserId = getUserId(profile);
        const tripOwnerId = normalizeId(selectedTrip.ownerUserId);
        if (currentUserId == null || tripOwnerId == null) return true;
        return currentUserId !== tripOwnerId;
    };

    const saveEditedComment = async (commentId) => {
        if (!selectedTrip || !commentId) return;
        const tripId = normalizeId(selectedTrip.id);
        const nextText = editingCommentText.trim();
        if (!tripId || !nextText) return;
        const authToken = normalizeToken(localStorage.getItem("token"));
        setCommentActionLoadingId(commentId);
        setTripCommentsError("");

        try {
            const payload = JSON.stringify({ comment: nextText });
            const methodsToTry = ["PUT", "PATCH"];
            let response = null;
            let data = {};

            for (const method of methodsToTry) {
                response = await fetch(
                    `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`,
                    {
                        method,
                        headers: {
                            "Content-Type": "application/json",
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                        },
                        body: payload,
                    }
                );
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
        if (!selectedTrip || !commentId) return;
        const tripId = normalizeId(selectedTrip.id);
        if (!tripId) return;
        const authToken = normalizeToken(localStorage.getItem("token"));
        setCommentActionLoadingId(commentId);
        setTripCommentsError("");

        try {
            const response = await fetch(
                `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`,
                {
                    method: "DELETE",
                    headers: {
                        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                    },
                }
            );
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

    const toggleTripLike = async () => {
        if (tripLikeLoading || !selectedTrip) return;
        const tripId = normalizeId(selectedTrip.id);
        if (!tripId) {
            setTripLikeError("Cannot update like for this trip: missing trip id.");
            return;
        }

        const currentlyLiked = selectedTrip.isLiked === true;
        const authToken = normalizeToken(localStorage.getItem("token"));
        setTripLikeLoading(true);
        setTripLikeError("");

        try {
            let response;
            if (currentlyLiked) {
                if (!selectedTrip.likeId) {
                    setTripLikeError("Cannot dislike this trip: missing like id.");
                    return;
                }
                response = await fetch(
                    `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(tripId)}/likes/${encodeURIComponent(selectedTrip.likeId)}`,
                    {
                        method: "DELETE",
                        headers: {
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                        },
                    }
                );
            } else {
                response = await fetch(
                    `${BASE_URL}/nomadTrack/trips/${encodeURIComponent(tripId)}/likes`,
                    {
                        method: "POST",
                        headers: {
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                        },
                    }
                );
            }

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setTripLikeError(data.message || "Could not update trip like state.");
                return;
            }

            const responseLikeId = extractLikeIdFromResponse(data);
            const nextIsLiked = !currentlyLiked;

            setSelectedTrip((prev) => {
                if (!prev || normalizeId(prev.id) !== tripId) return prev;
                return {
                    ...prev,
                    isLiked: nextIsLiked,
                    likeId: nextIsLiked ? (responseLikeId ?? prev.likeId ?? null) : null,
                    likeCount: Math.max(0, (prev.likeCount ?? 0) + (nextIsLiked ? 1 : -1)),
                };
            });

            setSelectedUserTrips((prev) =>
                prev.map((trip) => {
                    if (normalizeId(trip.id) !== tripId) return trip;
                    return {
                        ...trip,
                        isLiked: nextIsLiked,
                        likeId: nextIsLiked ? (responseLikeId ?? trip.likeId ?? null) : null,
                        likeCount: Math.max(0, (trip.likeCount ?? 0) + (nextIsLiked ? 1 : -1)),
                    };
                })
            );
            loadTripLikes(tripId);
        } catch {
            setTripLikeError("An error occurred while updating trip like state.");
        } finally {
            setTripLikeLoading(false);
        }
    };

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
        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const headers = {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            };

            const [followersRes, followingRes] = await Promise.all([
                fetch(`${USER_FOLLOWERS_URL}/${userId}/followers`, { headers }),
                fetch(`${USER_FOLLOWING_URL}/${userId}/following`, { headers }),
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
        setSelectedUserTrips([]);
        setSelectedUserTripsError("");
        setSelectedTrip(null);
        setTripLikeError("");
        setTripComments([]);
        setTripCommentsError("");
        setNewCommentText("");
        cancelEditComment();

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

    const toggleFollowUser = async () => {
        if (followLoading || !selectedUser) return;
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
            const data = await parseApiResponse(response);

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
        } catch {
            setSearchError("An error occurred while updating follow state.");
        } finally {
            setFollowLoading(false);
        }
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

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className={`auth-main ${selectedTrip ? "auth-main-top dashboard-trip-mode" : ""}`}>
                <div className={`dashboard-layout ${selectedTrip ? "dashboard-layout-trip-mode" : ""}`}>
                    {selectedTrip ? (
                        <>
                            <div className="login-container dashboard-card trip-details-pane">
                                <h2 className="profile-title section-split-heading">
                                    <span className="heading-blue">Trip</span><span className="heading-white">Details</span>
                                </h2>
                                <div className="profile-section searched-user-profile-section trip-details-main-panel">
                                    <div className="profile-row">
                                        <span className="profile-label">Title</span>
                                        <span className="profile-value">{selectedTrip.title || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Country</span>
                                        <span className="profile-value">{selectedTrip.country || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">City</span>
                                        <span className="profile-value">{selectedTrip.city || "N/A"}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">Start Date</span>
                                        <span className="profile-value">{formatDate(selectedTrip.startDate)}</span>
                                    </div>
                                    <div className="profile-row">
                                        <span className="profile-label">End Date</span>
                                        <span className="profile-value">{formatDate(selectedTrip.endDate)}</span>
                                    </div>
                                    <div className="profile-row profile-row-notes">
                                        <span className="profile-label">Notes</span>
                                        <span className="profile-value">{selectedTrip.description || "N/A"}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="text-action-button"
                                        onClick={() => {
                                            setTripLikeError("");
                                            setTripComments([]);
                                            setTripCommentsError("");
                                            setNewCommentText("");
                                            cancelEditComment();
                                            setSelectedTrip(null);
                                        }}
                                    >
                                        Back To User Profile
                                    </button>
                                </div>
                            </div>
                            <div className="login-container dashboard-card trip-extras-pane">
                                <h2 className="profile-title section-split-heading">
                                    <span className="heading-blue">Trip</span><span className="heading-white">Activity</span>
                                </h2>
                                <div className="profile-section searched-user-profile-section trip-details-extras trip-details-extras-panel">
                                    <h3 className="searched-user-trips-title">Trip Photos</h3>
                                    <div className="trip-photos-grid">
                                        {(selectedTrip.tripPhotos || [])
                                            .map((photo) => extractPhotoUrl(photo))
                                            .filter(Boolean)
                                            .slice(0, 6)
                                            .map((photoUrl) => (
                                                <img key={photoUrl} src={photoUrl} alt="Trip" className="trip-photo-item" />
                                            ))}
                                        {(!Array.isArray(selectedTrip.tripPhotos) || selectedTrip.tripPhotos.length === 0) && (
                                            <p className="trip-placeholder-text">No trip photos available yet.</p>
                                        )}
                                    </div>
                                    <div className="trip-comments-header">
                                        <h3 className="searched-user-trips-title">Comments</h3>
                                    </div>
                                    <p className="trip-like-summary">
                                        Likes: {selectedTrip.likeCount ?? 0}
                                    </p>
                                    <div className="trip-comments-list">
                                        {tripCommentsLoading && <p className="trip-placeholder-text">Loading comments...</p>}
                                        {!tripCommentsLoading && tripComments.length === 0 && (
                                            <p className="trip-placeholder-text">No comments yet.</p>
                                        )}
                                        {!tripCommentsLoading && tripComments.length > 0 && (
                                            <div className="trip-comment-items">
                                                {tripComments.map((comment) => (
                                                    <div className="trip-comment-item" key={comment.id ?? `${comment.userId}-${comment.createdAt}`}>
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
                                                                            className="text-action-button"
                                                                            onClick={() => beginEditComment(comment)}
                                                                            disabled={commentActionLoadingId === comment.id}
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="text-action-button"
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
                                        {canLikeSelectedTrip() && (
                                            <button type="button" onClick={toggleTripLike} disabled={tripLikeLoading}>
                                                {tripLikeLoading
                                                    ? "Updating..."
                                                    : selectedTrip.isLiked
                                                        ? "Dislike"
                                                        : "Like"}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="text-action-button"
                                            onClick={createTripComment}
                                            disabled={commentSubmitting || newCommentText.trim() === ""}
                                        >
                                            {commentSubmitting ? "Posting..." : "Comment"}
                                        </button>
                                    </div>
                                    {tripLikeError && <p className="error">{tripLikeError}</p>}
                                    {tripCommentsError && <p className="error">{tripCommentsError}</p>}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
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
                                            className={`search-result-item search-result-row ${getUserId(selectedUser) === getUserId(user) ? "search-result-item-active" : ""}`}
                                            key={getUserId(user) ?? `${user.email}-${user.firstName}`}
                                        >
                                            <div>
                                                <p className="search-result-name">
                                                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed User"}
                                                </p>
                                                {user.email && <p className="search-result-meta">{user.email}</p>}
                                            </div>
                                            <button type="button" className="view-profile-button" onClick={() => handleViewProfile(user)}>
                                                View Profile
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className={`login-container dashboard-card profile-card ${selectedUser ? "profile-card-viewing-user" : ""}`}>
                                <h2 className="profile-title section-split-heading">
                                    {selectedUser ? (
                                        <>
                                            <span className="heading-blue">User</span><span className="heading-white">Profile</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="heading-blue">My</span><span className="heading-white">Profile</span>
                                        </>
                                    )}
                                </h2>
                                {!selectedUser && profileLoading && <p>Loading profile...</p>}
                                {!selectedUser && profileError && <p className="error">{profileError}</p>}
                                {selectedUser && (
                                    <div className="profile-section searched-user-profile-section">
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
                                        <div className="profile-row">
                                            <span className="profile-label">ID</span>
                                            <span className="profile-value">{getUserId(selectedUser) ?? "N/A"}</span>
                                        </div>
                                        <div className="profile-row">
                                            <span className="profile-label">First Name</span>
                                            <span className="profile-value">{selectedUser.firstName || "N/A"}</span>
                                        </div>
                                        <div className="profile-row">
                                            <span className="profile-label">Last Name</span>
                                            <span className="profile-value">{selectedUser.lastName || "N/A"}</span>
                                        </div>
                                        <div className="profile-row">
                                            <span className="profile-label">Bio</span>
                                            <span className="profile-value">{selectedUser.bio || "No bio provided yet."}</span>
                                        </div>
                                        <div className="searched-user-actions">
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
                                            <button
                                                type="button"
                                                className="text-action-button"
                                                onClick={() => {
                                                    setSelectedTrip(null);
                                                    setTripLikeError("");
                                                    setTripComments([]);
                                                    setTripCommentsError("");
                                                    setNewCommentText("");
                                                    cancelEditComment();
                                                    setSelectedUser(null);
                                                    setSelectedUserTrips([]);
                                                    setSelectedUserTripsError("");
                                                }}
                                            >
                                                Back To My Profile
                                            </button>
                                        </div>
                                        <div className="searched-user-trips searched-user-trips-large">
                                            <h3 className="searched-user-trips-title">Trips</h3>
                                            {selectedUserTripsLoading && <p>Loading trips...</p>}
                                            {selectedUserTripsError && <p className="error">{selectedUserTripsError}</p>}
                                            {!selectedUserTripsLoading && selectedUserTrips.length === 0 && !selectedUserTripsError && (
                                                <p>No trips found for this user.</p>
                                            )}
                                            {!selectedUserTripsLoading && selectedUserTrips.length > 0 && (
                                                <div className="searched-user-trip-list">
                                                    {selectedUserTrips.map((trip) => (
                                                        <div className="searched-user-trip-item" key={trip.id ?? `${trip.title}-${trip.city}-${trip.country}`}>
                                                            <div>
                                                                <p className="trip-list-title">{trip.title}</p>
                                                                <p className="trip-list-meta">{trip.city}, {trip.country}</p>
                                                            </div>
                                                            <button type="button" className="view-profile-button" onClick={() => handleViewTrip(trip)}>
                                                                View
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {!selectedUser && !profileLoading && profile && (
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
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
