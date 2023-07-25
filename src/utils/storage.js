const fs = require("fs").promises;
const path = require("path");

class Storage {
    constructor() {
        this.dataDir = path.join(__dirname, "../..", "data");
        this.sensorsFile = path.join(this.dataDir, "sensors.json");
    }

    async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    async loadSensorData() {
        try {
            const data = await fs.readFile(this.sensorsFile, "utf8");
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    async saveSensorData(data) {
        await this.ensureDataDir();
        await fs.writeFile(this.sensorsFile, JSON.stringify(data, null, 2));
    }
}

module.exports = new Storage();
