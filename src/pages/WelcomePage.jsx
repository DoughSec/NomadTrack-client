import Footer from '../component/Footer.jsx';
import Header from '../component/Header.jsx';
import GetStarted from '../component/GetStarted.jsx';
import Hightlight from '../component/Highlight.jsx';

export default function WelcomePage({ isAuthenticated, setIsAuthenticated }) {
    return (
        <div className="welcome-page">
            <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
            <GetStarted />
            <Hightlight />
            <Footer />
        </div>
    );
}
