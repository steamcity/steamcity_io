class SteamCityPlatform {
    constructor() {
        this.currentView = "sensors";
        this.map = null;
        this.markers = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        document.getElementById("sensors-tab").addEventListener("click", () => this.switchView("sensors"));
        document.getElementById("experiments-tab").addEventListener("click", () => this.switchView("experiments"));
        document.getElementById("map-tab").addEventListener("click", () => this.switchView("map"));
    }

    switchView(viewName) {
        document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
        document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));

        document.getElementById(`${viewName}-view`).classList.add("active");
        document.getElementById(`${viewName}-tab`).classList.add("active");

        this.currentView = viewName;

        if (viewName === "sensors") {
            this.loadSensors();
        } else if (viewName === "experiments") {
            this.loadExperiments();
        } else if (viewName === "map") {
            this.initializeMap();
        }
    }

    async loadInitialData() {
        await this.loadSensors();
    }

    async loadSensors() {
        try {
            const response = await fetch("/api/sensors");
            const result = await response.json();
            this.displaySensors(result.data);
        } catch (error) {
            console.error("Erreur lors du chargement des capteurs:", error);
        }
    }

    async loadExperiments() {
        try {
            const response = await fetch("/api/experiments");
            const result = await response.json();
            this.displayExperiments(result.data);
        } catch (error) {
            console.error("Erreur lors du chargement des expériences:", error);
        }
    }

    initializeMap() {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }

        this.map = L.map("map").setView([48.8566, 2.3522], 6);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        this.loadSensorLocations();
    }

    async loadSensorLocations() {
        try {
            const response = await fetch("/api/sensors");
            const result = await response.json();

            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers = [];

            result.data.forEach(sensor => {
                if (sensor.location && sensor.location.latitude && sensor.location.longitude) {
                    const marker = L.marker([sensor.location.latitude, sensor.location.longitude])
                        .addTo(this.map)
                        .bindPopup(`
                            <strong>${sensor.sensorType}</strong><br>
                            Expérience: ${sensor.experimentId}<br>
                            Valeur: ${sensor.value} ${sensor.unit || ""}<br>
                            Étudiant: ${sensor.studentName}
                        `);
                    this.markers.push(marker);
                }
            });
        } catch (error) {
            console.error("Erreur lors du chargement des locations:", error);
        }
    }

    displaySensors(sensors) {
        const container = document.getElementById("sensors-list");
        if (sensors.length === 0) {
            container.innerHTML = "<p>Aucune donnée de capteur disponible.</p>";
            return;
        }

        const html = sensors.map(sensor => `
            <div class="sensor-card">
                <h3>${sensor.sensorType}</h3>
                <p><strong>Expérience:</strong> ${sensor.experimentId}</p>
                <p><strong>Étudiant:</strong> ${sensor.studentName}</p>
                <p><strong>Valeur:</strong> ${sensor.value} ${sensor.unit || ""}</p>
                <p><strong>Date:</strong> ${new Date(sensor.timestamp).toLocaleString("fr-FR")}</p>
            </div>
        `).join("");

        container.innerHTML = html;
    }

    displayExperiments(experiments) {
        const container = document.getElementById("experiments-list");
        if (experiments.length === 0) {
            container.innerHTML = "<p>Aucune expérience disponible.</p>";
            return;
        }

        const html = experiments.map(exp => `
            <div class="experiment-card">
                <h3>${exp.title}</h3>
                <p><strong>Description:</strong> ${exp.description}</p>
                <p><strong>Ville:</strong> ${exp.city}</p>
                <p><strong>Participants:</strong> ${exp.participants}</p>
                <p><strong>Période:</strong> ${exp.startDate} - ${exp.endDate}</p>
            </div>
        `).join("");

        container.innerHTML = html;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new SteamCityPlatform();
});
