import { useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";

const BASE_URL = "http://localhost:8080";
const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

export default function Trips({ isAuthenticated, setIsAuthenticated }) {
    const [countryName, setCountryName] = useState("");
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        const searchValue = countryName.trim();
        if (!searchValue) {
            setError("Please enter a country name.");
            return;
        }

        setLoading(true);
        setError("");
        setResults(null);

        try {
            const authToken = normalizeToken(localStorage.getItem("token"));
            const response = await fetch(`${BASE_URL}/trips/${encodeURIComponent(searchValue)}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || "Search failed.");
            } else {
                setResults(data);
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <main className="auth-main">
                <div className="login-container">
                    <h2 style={{ color: "white" }}>Search Trips</h2>
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Search trips by country"
                            value={countryName}
                            onChange={(e) => setCountryName(e.target.value)}
                            required
                        />
                        <button type="submit">{loading ? "Searching..." : "Search"}</button>
                    </form>
                    {error && <p className="error">{error}</p>}
                    {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
                </div>
            </main>
            <Footer />
        </div>
    );
}
