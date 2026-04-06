import { Link } from "react-router-dom";
import { getRoleFromToken, isAdminRole } from "../lib/auth";

export default function Nav({ isAuthenticated, setIsAuthenticated }) {
    const userRole = isAuthenticated
        ? (localStorage.getItem("role") || getRoleFromToken(localStorage.getItem("token")))
        : "";

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setIsAuthenticated?.(false);
    };

    return (
        <nav className="nav-links">
            <Link to="/">Home</Link>
            {isAuthenticated && <Link to="/Dashboard">Dashboard</Link>}
            {isAuthenticated && <Link to="/trips">Trips</Link>}
            {isAuthenticated && <Link to="/wishlists">Wishlists</Link>}
            {isAuthenticated && <Link to="/recommendations">Get Recommendations</Link>}
            {isAuthenticated && isAdminRole(userRole) && <Link to="/users">Users</Link>}
            {!isAuthenticated && <Link to="/login">Login</Link>}
            {!isAuthenticated && <Link to="/nomadTrack/auth/register">Register</Link>}
            {isAuthenticated && <Link to="/login" onClick={handleLogout}>Logout</Link>}
        </nav>
    );
}
