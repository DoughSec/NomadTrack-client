import Globe from '../bits/Globe';

export default function GetStarted() {
    return (
        <section className="get-started">
            <div className="get-started-copy">
                <h1 className="start-header">
                    Track Your Remote Journey Across the <span className="hero-accent">World</span>
                </h1>
                <p className="get-started-description">
                    Log your travels, visualize your journey, and connect with
                    other digital nomads in real time.
                </p>

                <div className="get-started-buttons">
                    <button className="button">Get Started</button>
                    <button className="button">View Demo</button>
                </div>
            </div>

            <div className="get-started-visual">
                <Globe
                    width={420}
                    height={420}
                    primaryColor="#50b9ff"
                    neutralColor="#9cd9ff"
                    atmosphereColor="rgba(80, 185, 255, 0.42)"
                    globeColor="#0f2740"
                    globeOpacity={0.85}
                    autoRotateSpeed={1.0}
                    enableZoom={false}
                    interactive={true}
                    arcCount={10}
                    arcInterval={5000}
                    arcAnimationDuration={2000}
                    cameraAltitude={2.2}
                    landDotRows={250}
                    pointSize={0.35}
                    atmosphereAltitude={0.25}
                    className="hero-globe"
                />
            </div>
        </section>
    );
}

