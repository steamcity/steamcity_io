const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Routes
app.use("/api/sensors", require("./routes/sensors"));
app.use("/api/experiments", require("./routes/experiments"));

// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", message: "SteamCity IoT Platform is running" });
});

app.listen(PORT, () => {
    console.log(`SteamCity Sensor Data API running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} for API information`);
});
