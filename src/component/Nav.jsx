import { Link } from "react-router-dom";

export default function Nav({ isAuthenticated, setIsAuthenticated }) {
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated?.(false);
    };

    return (
        <nav className="nav-links">
            <Link to="/">Home</Link>
            {isAuthenticated && <Link to="/Dashboard">Dashboard</Link>}
            {isAuthenticated && <Link to="/trips">Trips</Link>}
            {isAuthenticated && <Link to="/wishlists">Wishlists</Link>}
            {!isAuthenticated && <Link to="/login">Login</Link>}
            {!isAuthenticated && <Link to="/nomadTrack/auth/register">Register</Link>}
            {isAuthenticated && <Link to="/login" onClick={handleLogout}>Logout</Link>}
        </nav>
    );
}
