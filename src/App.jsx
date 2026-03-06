import WelcomePage from './pages/WelcomePage';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import Login from './pages/Login';
import Register from './pages/Register';
import Wishlists from './pages/Wishlists';
import Users from './pages/Users';
import './App.css';
import Hyperspeed from './bits/HyperSpeed';
import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from 'react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("token"));

  return (
    <div className="App" >
      <Hyperspeed
        effectOptions={{ "distortion": "LongRaceDistortion", "length": 400, "roadWidth": 10, "islandWidth": 5, "lanesPerRoad": 2, "fov": 90, "fovSpeedUp": 125, "speedUp": 0.8, "carLightsFade": 0.4, "totalSideLightSticks": 50, "lightPairsPerRoadWay": 70, "shoulderLinesWidthPercentage": 0.05, "brokenLinesWidthPercentage": 0.1, "brokenLinesLengthPercentage": 0.5, "lightStickWidth": [0.12, 0.5], "lightStickHeight": [1.3, 1.7], "movingAwaySpeed": [25, 40], "movingCloserSpeed": [-45, -65], "carLightsLength": [20, 60], "carLightsRadius": [0.05, 0.14], "carWidthPercentage": [0.3, 0.5], "carShiftX": [-0.2, 0.2], "carFloorSeparation": [0.05, 1], "colors": { "roadColor": 526344, "islandColor": 657930, "background": 0, "shoulderLines": 1250072, "brokenLines": 1250072, "leftCars": [16736115, 15158624, 16715818], "rightCars": [10806246, 8442324, 5489350], "sticks": 10806246 } }}
      />

      <Routes>
        <Route
          path="/"
          element={<WelcomePage isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/Dashboard"
          element={isAuthenticated ? <Dashboard isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/trips"
          element={!isAuthenticated ? <Trips isAuthenticated={!isAuthenticated} setIsAuthenticated={!setIsAuthenticated} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/wishlists"
          element={isAuthenticated ? <Wishlists isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/users"
          element={isAuthenticated ? <Users isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/login"
          element={<Login setUser={() => setIsAuthenticated(true)} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/nomadTrack/auth/login"
          element={<Login setUser={() => setIsAuthenticated(true)} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/register"
          element={<Register setUser={() => setIsAuthenticated(true)} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}
        />
        <Route
          path="/nomadTrack/auth/register"
          element={<Register setUser={() => setIsAuthenticated(true)} isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />}
        />
      </Routes>

    </div >
  );
}

export default App;
