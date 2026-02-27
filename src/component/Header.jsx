import Nav from '../component/Nav.jsx';

export default function Header({ isAuthenticated, setIsAuthenticated }) {
    return (
        <div className="header">
            <h1 className="title">NomadTrack</h1>
            <Nav isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
        </div>
    );
}
