import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../component/Header";
import Footer from "../component/Footer";

const normalizeToken = (tokenValue) => {
    if (!tokenValue || typeof tokenValue !== "string") return "";
    return tokenValue.replace(/^Bearer\s+/i, "").trim();
};

export default function Register(props) {
    const url = "http://localhost:8080/nomadTrack/auth/register";
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });
            const data = await response.json();

            if (response.ok) {
                const token = normalizeToken(data.token || data.accessToken || data.jwt || data.jwtToken);
                if (!token) {
                    localStorage.removeItem("token");
                    setError("Registration succeeded but no token was returned.");
                    return;
                }
                localStorage.setItem("token", token);
                props.setUser?.(data.user);
                navigate("/");
            } else {
                setError(data.message || "Registration failed");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={props.isAuthenticated} setIsAuthenticated={props.setIsAuthenticated} />
            <main className="auth-main">
                <div className="login-container">
                    <h2>Register</h2>
                    {error && <p className="error">{error}</p>}
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="First Name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Last Name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit">Register</button>
                        <p>
                            Already have an account? <Link to="/login">Login</Link> here
                        </p>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
