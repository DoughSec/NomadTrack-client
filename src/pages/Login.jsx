import { useState } from "react";
import Header from "../component/Header";
import Footer from "../component/Footer";
import { Link, useNavigate } from "react-router-dom";
import { getRoleFromToken, normalizeToken } from "../lib/auth";
import API_BASE_URL from "../lib/apiBaseUrl";

export default function Login(props) {
    const url = `${API_BASE_URL}/nomadTrack/auth/login`;
    const navigate = useNavigate();
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
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                const token = normalizeToken(data.token || data.accessToken || data.jwt || data.jwtToken);
                if (!token) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("role");
                    setError("Login succeeded but no token was returned.");
                    return;
                }
                localStorage.setItem("token", token);
                localStorage.setItem("role", getRoleFromToken(token));
                props.setUser?.(data.user);
                navigate("/");
            } else {
                setError(data.message || "Login failed");
            }
        } catch {
            setError("An error occurred. Please try again.");
        }
    };

    return (
        <div className="auth-page">
            <Header isAuthenticated={props.isAuthenticated} setIsAuthenticated={props.setIsAuthenticated} />
            <main className="auth-main">
                <div className="login-container">
                    <h2>Login</h2>
                    {error && <p className="error">{error}</p>}
                    <form onSubmit={handleSubmit}>
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
                        <button type="submit">Login</button>
                        <p>
                            Don't have an account? <Link to="/nomadTrack/auth/register"> Register</Link> here
                        </p>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );

}
