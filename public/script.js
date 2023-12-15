class SteamCityPlatform {
    constructor() {
        this.currentView = "sensors";
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        document.getElementById("sensors-tab").addEventListener("click", () => this.switchView("sensors"));
        document.getElementById("experiments-tab").addEventListener("click", () => this.switchView("experiments"));
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
        document.querySelectorAll(".tab-button").forEach(button => button.classList.remove("active"));

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add("active");
        document.getElementById(`${viewName}-tab`).classList.add("active");

        this.currentView = viewName;

        if (viewName === "sensors") {
            this.loadSensors();
        } else if (viewName === "experiments") {
            this.loadExperiments();
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
                <h3>Expérience #${exp.id}</h3>
                <p>${JSON.stringify(exp, null, 2)}</p>
            </div>
        `).join("");

        container.innerHTML = html;
    }
}

// Initialize platform when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new SteamCityPlatform();
});
