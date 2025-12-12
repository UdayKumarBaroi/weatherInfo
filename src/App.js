import React, { useEffect, useState } from "react";
import "./App.css";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Filler);

const API_KEY = "183070c62369905b9fdea86c04ae66c3";

export default function App() {
  const [city, setCity] = useState("Delhi");
  const [loading, setLoading] = useState(false);
  const [cur, setCur] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [aqi, setAqi] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeatherByCity(city);
  }, []);

  // Fetch weather by city name
  async function fetchWeatherByCity(name) {
    try {
      setLoading(true);
      setError(null);

      const curRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          name
        )}&appid=${API_KEY}&units=metric`
      );
      if (!curRes.ok) throw new Error("City not found");
      const curJson = await curRes.json();
      setCur(curJson);
      setCity(curJson.name);

      const fRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          name
        )}&appid=${API_KEY}&units=metric`
      );
      const fJson = await fRes.json();
      setForecast(fJson.list.slice(0, 12));

      await fetchAQI(curJson.coord.lat, curJson.coord.lon);
    } catch (e) {
      setError(e.message || "Failed to fetch");
      setCur(null);
      setForecast([]);
      setAqi(null);
    } finally {
      setLoading(false);
    }
  }

  // Fetch weather by user location
  async function fetchWeatherByLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Current Weather
          const curRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
          );
          if (!curRes.ok) throw new Error("Failed to fetch weather");
          const curJson = await curRes.json();
          setCur(curJson);
          setCity(curJson.name);

          // Forecast
          const fRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
          );
          const fJson = await fRes.json();
          setForecast(fJson.list.slice(0, 12));

          // AQI
          await fetchAQI(latitude, longitude);
        } catch (e) {
          setError(e.message || "Failed to fetch");
          setCur(null);
          setForecast([]);
          setAqi(null);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setError("Location access denied or unavailable");
      }
    );
  }

  // Fetch AQI
  async function fetchAQI(lat, lon) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      const json = await res.json();
      setAqi(json.list && json.list[0] ? json.list[0] : null);
    } catch {
      setAqi(null);
    }
  }

  // AQI Label
  function getAqiLabel(a) {
    if (!a) return "N/A";
    switch (a) {
      case 1:
        return "Good";
      case 2:
        return "Fair";
      case 3:
        return "Moderate";
      case 4:
        return "Poor";
      case 5:
      default:
        return "Very Poor";
    }
  }

  // AQI Color based on PM2.5
  function aqiColor(pm25) {
    if (pm25 === null || pm25 === undefined) return "#fff";
    if (pm25 <= 12) return "#2dd4bf";
    if (pm25 <= 35) return "#60a5fa";
    if (pm25 <= 55) return "#f59e0b";
    if (pm25 <= 150) return "#f97316";
    return "#ef4444";
  }

  // Chart Data
  const chartData = {
    labels: forecast.map((f) =>
      new Date(f.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    ),
    datasets: [
      {
        label: "Temperature (°C)",
        data: forecast.map((f) => f.main.temp),
        borderColor: "rgba(255,255,255,0.95)",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(124,92,255,0.28)");
          gradient.addColorStop(1, "rgba(124,92,255,0.02)");
          return gradient;
        },
        tension: 0.38,
        pointRadius: 4,
        pointBackgroundColor: "#fff",
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    scales: {
      x: { ticks: { color: "rgba(255,255,255,0.85)" }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: "rgba(255,255,255,0.85)" }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  return (
    <div className="app-root">
      {/* Top Controls */}
      <div className="top-controls">
        <input
          className="city-input"
          placeholder="Enter city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchWeatherByCity(city)}
        />
        <button className="btn" onClick={() => fetchWeatherByCity(city)}>
          Search
        </button>
        <button className="btn" onClick={fetchWeatherByLocation}>
          Use My Location
        </button>
      </div>

      {/* Main Cards */}
      <section className="card-row">
        {/* Left Card - Weather + Icon */}
        <div className="card left-card">
          <div className="location-row">
            <div>
              <h2 className="loc-name">{cur ? `${cur.name}, ${cur.sys.country}` : "—"}</h2>
              <div className="subtitle">{cur ? new Date().toLocaleString() : "—"}</div>
            </div>
            <div className="desc">{cur ? cur.weather[0].description : "—"}</div>
          </div>

          {cur && cur.weather[0] && (
            <img
              src={`http://openweathermap.org/img/wn/${cur.weather[0].icon}@4x.png`}
              alt="weather"
              style={{ width: "120px", height: "120px", margin: "10px auto", display: "block" }}
            />
          )}

          <div className="big-temp">{cur ? Math.round(cur.main.temp) : "--"}°C</div>
        </div>

        {/* Center Card - AQI + Secondary Data */}
        <div className="card center-card">
          <h3>Air Quality</h3>
          <div className="aqi-large">
            <div
              className="aqi-value"
              style={{
                color: aqi && aqi.components ? aqiColor(Math.round(aqi.components.pm2_5)) : "#fff",
              }}
            >
              {aqi && aqi.components ? Math.round(aqi.components.pm2_5) : "—"}
            </div>
            <div className="aqi-label">
              {aqi ? `AQI ${aqi.main.aqi} · ${getAqiLabel(aqi.main.aqi)}` : "N/A"}
            </div>
          </div>

          <h3 style={{ marginTop: 16 }}>Details</h3>
          <div className="data-grid">
            <div className="data-item">
              <b>Feels like</b>{" "}
              <span>{cur ? Math.round(cur.main.feels_like) + "°C" : "—"}</span>
            </div>
            <div className="data-item">
              <b>Humidity</b> <span>{cur ? cur.main.humidity + "%" : "—"}</span>
            </div>
            <div className="data-item">
              <b>Pressure</b> <span>{cur ? cur.main.pressure + " hPa" : "—"}</span>
            </div>
            <div className="data-item">
              <b>Visibility</b> <span>{cur ? cur.visibility + " m" : "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Forecast Row */}
      <section className="forecast-row">
        {forecast.slice(0, 8).map((it, idx) => (
          <div className="forecast-item" key={idx}>
            <div className="f-time">
              {new Date(it.dt * 1000).toLocaleTimeString([], { hour: "2-digit" })}
            </div>
            <div className="f-temp">{Math.round(it.main.temp)}°</div>
            <div className="f-desc">{it.weather[0].description}</div>
          </div>
        ))}
      </section>

      {/* Full-width Graph */}
      <div className="graph-container">
        <Line data={chartData} options={chartOptions} />
      </div>

      <footer className="footer">Made by Uday Kumar Baroi</footer>

      {loading && <div className="loading-glow">Loading…</div>}
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
}

/* Utilities */
function calcDewPoint(t, rh) {
  const a = 17.27,
    b = 237.7;
  const alpha = (a * t) / (b + t) + Math.log(rh / 100);
  return (b * alpha) / (a - alpha);
}
