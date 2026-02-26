import Footer from '../component/Footer.jsx';
import Header from '../component/Header.jsx';
import GetStarted from '../component/GetStarted.jsx';
import Hightlight from '../component/Highlight.jsx';

export default function WelcomePage() {
    return (
        <div className="welcome-page">
            <Header />
            <GetStarted />
            <Hightlight />
            <Footer />
        </div>
    );
}