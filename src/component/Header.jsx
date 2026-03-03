import Nav from '../component/Nav.jsx';
import favicon from '../public/favicon.png';

export default function Header({ isAuthenticated, setIsAuthenticated }) {
    return (
        <div className="header">
            <div className="brand">
                <img src={favicon} alt="NomadTrack logo" className="brand-logo" />
                <h1 className="title">NomadTrack</h1>
            </div>
            <Nav isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        </div>
    );
}
