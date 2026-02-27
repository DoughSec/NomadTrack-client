import { Link } from "react-router-dom";

export default function Nav() {
    return (
        <nav className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/trips">Trips</Link>
            <Link to="/wishlists">Wishlists</Link>
            <Link to="/login">Login</Link>
        </nav>
    );
}
