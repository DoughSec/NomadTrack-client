import { useMemo, useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import API_BASE_URL from "../lib/apiBaseUrl";
import { normalizeToken } from "../lib/auth";

const BASE_URL = API_BASE_URL;
const RECOMMENDATIONS_URL = `${BASE_URL}/recommendations`;
const TOP_RECOMMENDATION_COUNT = 5;

const recommendationOptions = {
    budget: ["low", "medium", "high"],
    climate: ["cold", "moderate", "warm"],
    tripStyle: ["adventure", "culture", "nightlife", "relaxing"],
    activities: [
        "beaches",
        "food",
        "hiking",
        "history",
        "museums",
        "nature",
        "nightlife",
        "photography",
        "resorts",
        "shopping",
        "walking",
    ],
    region: [
        "Africa",
        "Asia",
        "Caribbean",
        "Central America",
        "Europe",
        "Middle East",
        "North America",
        "Oceania",
        "Other",
        "South America",
    ],
    tripType: ["solo", "couple", "family", "friends"],
    tripLength: [3, 4, 5, 6, 7, 8, 9],
};

const parseApiResponse = async (response) => {
    const rawText = await response.text();
    if (!rawText) return {};
    try {
        return JSON.parse(rawText);
    } catch {
        return { message: rawText };
    }
};

const toTitleCase = (value) =>
    String(value || "")
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");

const formatDelimitedValue = (value, delimiter) =>
    String(value || "")
        .split(delimiter)
        .map((part) => part.trim())
        .filter(Boolean)
        .map(toTitleCase)
        .join(" | ");

const normalizeRecommendation = (item, index) => ({
    id: `${item?.destination ?? "destination"}-${index}`,
    destination: item?.destination ?? "Unknown Destination",
    country: item?.country ?? "Unknown Country",
    region: item?.region ?? "Unknown Region",
    tripStyle: item?.tripStyle ?? item?.trip_style ?? "",
    tripType: item?.tripType ?? item?.trip_type ?? "",
    activities: item?.activities ?? "",
    score: typeof item?.score === "number" ? item.score : Number(item?.score ?? 0),
});

export default function Recommendations({ isAuthenticated, setIsAuthenticated }) {
    const [form, setForm] = useState({
        budget: "medium",
        climate: "moderate",
        tripStyle: "relaxing",
        activities: ["food", "nature"],
        region: "Europe",
        tripType: "couple",
        tripLength: 6,
    });
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const selectedActivitiesLabel = useMemo(() => {
        if (form.activities.length === 0) return "Pick at least one travel signal";
        if (form.activities.length <= 3) return form.activities.map(toTitleCase).join(" | ");
        return `${form.activities.length} activity signals selected`;
    }, [form.activities]);

    const requestSummary = useMemo(
        () =>
            `${toTitleCase(form.tripType)} trip, ${form.tripLength} days, ${toTitleCase(form.climate)} weather, ${toTitleCase(form.budget)} budget.`,
        [form]
    );

    const toggleActivity = (activity) => {
        setForm((prev) => {
            const exists = prev.activities.includes(activity);
            if (exists) {
                if (prev.activities.length === 1) return prev;
                return {
                    ...prev,
                    activities: prev.activities.filter((item) => item !== activity),
                };
            }

            return {
                ...prev,
                activities: [...prev.activities, activity],
            };
        });
    };

    const setField = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        setHasSubmitted(true);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(RECOMMENDATIONS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    budget: form.budget,
                    climate: form.climate,
                    tripStyle: form.tripStyle,
                    activities: form.activities,
                    region: form.region,
                    tripType: form.tripType,
                    tripLength: form.tripLength,
                    topN: TOP_RECOMMENDATION_COUNT,
                }),
            });

            const data = await parseApiResponse(response);
            if (!response.ok) {
                setRecommendations([]);
                setError(data.message || `Could not generate recommendations (${response.status}).`);
                return;
            }

            const nextRecommendations = Array.isArray(data?.recommendations)
                ? data.recommendations.map(normalizeRecommendation)
                : [];
            setRecommendations(nextRecommendations);

            if (nextRecommendations.length === 0) {
                setError("The AI planner came back empty for that mix. Try broadening the activity mix or changing the region.");
            }
        } catch {
            setRecommendations([]);
            setError("An error occurred while contacting the recommendation service.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main auth-main-top">
                <section className="recommendations-shell">
                    <article className="recommendations-hero">
                        <div className="recommendations-orbit recommendations-orbit-one" />
                        <div className="recommendations-orbit recommendations-orbit-two" />
                        <div className="recommendations-hero-copy">
                            <span className="recommendations-kicker">AI Itinerary Lab</span>
                            <h2 className="recommendations-title">
                                Find the trip of your dreams with our AI-powered recommendation engine
                            </h2>
                            <p className="recommendations-subtitle">
                                Every control here is grounded in the destination dataset, so the trip recipe stays aligned with what the backend model can actually score.
                            </p>
                        </div>

                        <div className="recommendations-pulse-board">
                            <div className="recommendations-pulse-card">
                                <span className="recommendations-pulse-label">Trip Pulse</span>
                                <strong>{requestSummary}</strong>
                            </div>
                            <div className="recommendations-pulse-card">
                                <span className="recommendations-pulse-label">Activity Signals</span>
                                <strong>{selectedActivitiesLabel}</strong>
                            </div>
                            <div className="recommendations-pulse-card">
                                <span className="recommendations-pulse-label">Output Mode</span>
                                <strong>Top {TOP_RECOMMENDATION_COUNT} destinations</strong>
                            </div>
                        </div>
                    </article>

                    <div className="recommendations-grid">
                        <form className="recommendations-panel recommendations-form-panel" onSubmit={handleSubmit}>
                            <div className="recommendations-panel-head">
                                <h3>Trip Recipe</h3>
                                <p>Choose the ingredients your recommender should optimize for.</p>
                            </div>

                            <div className="recommendations-field-group">
                                <span className="recommendations-field-label">Budget</span>
                                <div className="recommendations-chip-row">
                                    {recommendationOptions.budget.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={`recommendations-chip ${form.budget === option ? "recommendations-chip-active" : ""}`}
                                            onClick={() => setField("budget", option)}
                                        >
                                            {toTitleCase(option)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="recommendations-two-column">
                                <label className="recommendations-select-field">
                                    <span className="recommendations-field-label">Climate</span>
                                    <select value={form.climate} onChange={(e) => setField("climate", e.target.value)}>
                                        {recommendationOptions.climate.map((option) => (
                                            <option key={option} value={option}>
                                                {toTitleCase(option)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="recommendations-select-field">
                                    <span className="recommendations-field-label">Region</span>
                                    <select value={form.region} onChange={(e) => setField("region", e.target.value)}>
                                        {recommendationOptions.region.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="recommendations-two-column">
                                <label className="recommendations-select-field">
                                    <span className="recommendations-field-label">Trip Style</span>
                                    <select value={form.tripStyle} onChange={(e) => setField("tripStyle", e.target.value)}>
                                        {recommendationOptions.tripStyle.map((option) => (
                                            <option key={option} value={option}>
                                                {toTitleCase(option)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="recommendations-select-field">
                                    <span className="recommendations-field-label">Trip Type</span>
                                    <select value={form.tripType} onChange={(e) => setField("tripType", e.target.value)}>
                                        {recommendationOptions.tripType.map((option) => (
                                            <option key={option} value={option}>
                                                {toTitleCase(option)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="recommendations-field-group">
                                <span className="recommendations-field-label">Trip Length</span>
                                <div className="recommendations-chip-row">
                                    {recommendationOptions.tripLength.map((length) => (
                                        <button
                                            key={length}
                                            type="button"
                                            className={`recommendations-chip ${form.tripLength === length ? "recommendations-chip-active" : ""}`}
                                            onClick={() => setField("tripLength", length)}
                                        >
                                            {length} days
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="recommendations-field-group">
                                <div className="recommendations-activities-header">
                                    <span className="recommendations-field-label">Activities</span>
                                    <span className="recommendations-activity-count">{form.activities.length} selected</span>
                                </div>
                                <div className="recommendations-chip-row recommendations-chip-row-dense">
                                    {recommendationOptions.activities.map((activity) => (
                                        <button
                                            key={activity}
                                            type="button"
                                            className={`recommendations-chip recommendations-chip-small ${form.activities.includes(activity) ? "recommendations-chip-active" : ""}`}
                                            onClick={() => toggleActivity(activity)}
                                        >
                                            {toTitleCase(activity)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="recommendations-submit" type="submit" disabled={loading}>
                                {loading ? "Generating destination signal..." : "Launch AI Matchmaker"}
                            </button>

                            {error && <p className="error">{error}</p>}
                        </form>

                        <section className="recommendations-panel recommendations-results-panel">
                            <div className="recommendations-panel-head">
                                <h3>Recommended Destinations</h3>
                                <p>The response cards below map directly to the backend recommendation payload.</p>
                            </div>

                            {!hasSubmitted && (
                                <div className="recommendations-empty-state">
                                    <span className="recommendations-empty-badge">Awaiting Launch</span>
                                    <h4>Shape a trip profile to wake up the AI planner.</h4>
                                    <p>
                                        Pick your region, style, trip type, length, and activity mix, then generate a ranked list of five places to explore next.
                                    </p>
                                </div>
                            )}

                            {hasSubmitted && !loading && recommendations.length > 0 && (
                                <div className="recommendations-results-list">
                                    {recommendations.map((item, index) => (
                                        <article className="recommendation-card" key={item.id}>
                                            <div className="recommendation-card-rank">#{index + 1}</div>
                                            <div className="recommendation-card-main">
                                                <div className="recommendation-card-head">
                                                    <div>
                                                        <h4>{item.destination}</h4>
                                                        <p>{item.country} | {item.region}</p>
                                                    </div>
                                                    <div className="recommendation-score-pill">
                                                        {Number.isFinite(item.score) ? item.score.toFixed(2) : "N/A"}
                                                    </div>
                                                </div>

                                                <div className="recommendation-meta-grid">
                                                    <div className="recommendation-meta-box">
                                                        <span>Trip Style</span>
                                                        <strong>{formatDelimitedValue(item.tripStyle, "|") || "N/A"}</strong>
                                                    </div>
                                                    <div className="recommendation-meta-box">
                                                        <span>Trip Type</span>
                                                        <strong>{formatDelimitedValue(item.tripType, "|") || "N/A"}</strong>
                                                    </div>
                                                </div>

                                                <div className="recommendation-activity-block">
                                                    <span>Activity Match</span>
                                                    <p>{formatDelimitedValue(item.activities, ",") || "No activity detail returned."}</p>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}

                            {loading && (
                                <div className="recommendations-loading-state">
                                    <div className="recommendations-loading-ring" />
                                    <p>Scanning destination patterns and ranking the best-fit escape hatches...</p>
                                </div>
                            )}
                        </section>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
