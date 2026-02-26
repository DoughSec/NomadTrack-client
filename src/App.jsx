import WelcomePage from './pages/WelcomePage';
import './App.css';
import Hyperspeed from './bits/HyperSpeed';

function App() {

  return (
    <div className="App" >
      <Hyperspeed
        effectOptions={{ "distortion": "LongRaceDistortion", "length": 400, "roadWidth": 10, "islandWidth": 5, "lanesPerRoad": 2, "fov": 90, "fovSpeedUp": 150, "speedUp": 2, "carLightsFade": 0.4, "totalSideLightSticks": 50, "lightPairsPerRoadWay": 70, "shoulderLinesWidthPercentage": 0.05, "brokenLinesWidthPercentage": 0.1, "brokenLinesLengthPercentage": 0.5, "lightStickWidth": [0.12, 0.5], "lightStickHeight": [1.3, 1.7], "movingAwaySpeed": [60, 80], "movingCloserSpeed": [-120, -160], "carLightsLength": [20, 60], "carLightsRadius": [0.05, 0.14], "carWidthPercentage": [0.3, 0.5], "carShiftX": [-0.2, 0.2], "carFloorSeparation": [0.05, 1], "colors": { "roadColor": 526344, "islandColor": 657930, "background": 0, "shoulderLines": 1250072, "brokenLines": 1250072, "leftCars": [16736115, 15158624, 16715818], "rightCars": [10806246, 8442324, 5489350], "sticks": 10806246 } }}
      />
      <WelcomePage />
    </div >
  );
}

export default App;
