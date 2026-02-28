import { useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";

const BASE_URL = "http://localhost:8080";

export default function Dashboard({ isAuthenticated, setIsAuthenticated }) {
    const [firstName, setFirstName] = useState("");
    const [results, setResults] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        const searchValue = firstName.trim();
        if (!searchValue) {
            setError("Please enter a first name.");
            return;
        }

        setLoading(true);
        setError("");
        setResults(null);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${BASE_URL}/search/${encodeURIComponent(searchValue)}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
                    <h2 style={{ color: "white" }}>Nomad Search</h2>
                    <form onSubmit={handleSearch}>
                        <input
                            type="text"
                            placeholder="Search by first name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
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
