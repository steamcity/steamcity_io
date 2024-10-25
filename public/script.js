class SteamCityPlatform {
    constructor() {
        this.currentView = "experiments";
        this.currentRoute = {};
        this.map = null;
        this.chart = null;
        this.markers = [];
        this.isAuthenticated = false;
        this.protocolColors = {
            governance: "#e74c3c",
            environmental: "#27ae60",
            mobility: "#3498db",
            energy: "#f39c12",
            technology: "#9b59b6",
            other: "#95a5a6"
        };
        this.experiments = [];
        this.sensors = [];
        this.sensorOffset = 0;
        this.sensorLimit = 20;

        this.init();
    }

    init() {
        this.checkAuthenticationState();
        this.bindEvents();
        this.initializeRouting();
        if (this.isAuthenticated) {
            this.loadInitialData();
        }
    }

    initializeRouting() {
        window.addEventListener("hashchange", () => this.handleRouteChange());
        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash.slice(1);
        const parts = hash.split("/");

        this.currentRoute = {
            view: parts[0] || "experiments",
            id: parts[1],
            action: parts[2],
            param: parts[3]
        };

        if (this.isAuthenticated) {
            this.navigateToRoute();
        }
    }

    navigateToRoute() {
        const { view, id, action, param } = this.currentRoute;

        if (view === "experiments" && id) {
            this.showExperimentDetails(id);
        } else if (view === "sensors" && action === "experiment" && param) {
            this.showSensorsForExperiment(param);
        } else if (view === "charts" && action === "experiment" && param) {
            this.showChartsForExperiment(param);
        } else if (view === "map" && action === "cluster" && param) {
            this.filterMapByCluster(param);
        } else {
            this.switchView(view);
        }
    }

    checkAuthenticationState() {
        const isLoggedIn = localStorage.getItem("steamcity_authenticated") === "true";
        this.isAuthenticated = isLoggedIn;

        if (this.isAuthenticated) {
            this.showMainPlatform();
        } else {
            this.showLoginPage();
        }
    }

    showLoginPage() {
        document.getElementById("login-page").classList.remove("hidden");
        document.getElementById("main-app").classList.add("hidden");
    }

    showMainPlatform() {
        document.getElementById("login-page").classList.add("hidden");
        document.getElementById("main-app").classList.remove("hidden");
    }

    bindEvents() {
        // Login form
        document.getElementById("login-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById("logout-btn").addEventListener("click", () => {
            this.handleLogout();
        });

        // Navigation tabs
        document.getElementById("experiments-tab").addEventListener("click", () => this.switchView("experiments"));
        document.getElementById("sensors-tab").addEventListener("click", () => this.switchView("sensors"));
        document.getElementById("map-tab").addEventListener("click", () => this.switchView("map"));
        document.getElementById("charts-tab").addEventListener("click", () => this.switchView("charts"));

        // Load more sensors
        document.getElementById("load-more-sensors").addEventListener("click", () => {
            this.loadMoreSensors();
        });
    }

    handleLogin() {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (username === "iot" && password === "steamcity") {
            localStorage.setItem("steamcity_authenticated", "true");
            this.isAuthenticated = true;
            this.showMainPlatform();
            this.loadInitialData();
        } else {
            alert("Nom d'utilisateur ou mot de passe incorrect");
        }
    }

    handleLogout() {
        localStorage.removeItem("steamcity_authenticated");
        this.isAuthenticated = false;
        this.showLoginPage();
        window.location.hash = "";
    }

    async loadInitialData() {
        await Promise.all([
            this.loadExperiments(),
            this.loadSensors(true)
        ]);
        this.navigateToRoute();
    }

    async loadExperiments() {
        try {
            const response = await fetch("/api/experiments");
            const result = await response.json();
            this.experiments = result.data || [];
            this.displayExperiments(this.experiments);
        } catch (error) {
            console.error("Erreur lors du chargement des expériences:", error);
        }
    }

    displayExperiments(experiments) {
        const container = document.getElementById("experiments-list");
        const html = experiments.map(exp => `
            <div class="experiment-card" onclick="steamcity.navigateToExperiment('${exp.id}')">
                <div class="protocol-indicator" style="background-color: ${this.protocolColors[exp.protocol_category] || this.protocolColors.other}"></div>
                <h3>${exp.title}</h3>
                <p class="protocol-name">${exp.protocol_name}</p>
                <p>${exp.description}</p>
                <div class="experiment-meta">
                    <span class="city">${exp.city}</span>
                    <span class="participants">${exp.participants} participants</span>
                </div>
            </div>
        `).join("");
        container.innerHTML = html;
    }

    navigateToExperiment(experimentId) {
        window.location.hash = `experiments/${experimentId}`;
    }
}

// Global instance for onclick handlers
let steamcity;

document.addEventListener("DOMContentLoaded", () => {
    steamcity = new SteamCityPlatform();
});
