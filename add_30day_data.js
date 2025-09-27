const fs = require('fs').promises;
const path = require('path');

async function add30DayData() {
    try {
        // Load existing history data
        const historyPath = path.join(__dirname, 'data/sensor-measurements-history.json');
        const history = JSON.parse(await fs.readFile(historyPath, 'utf8'));

        const now = new Date();

        // Find the Bruxelles CO2 sensors
        const bruxellesCO2Sensor = history.find(s => s.sensor_id === 'sens-003-co2-bruxelles-creuz');
        const bruxellesTempSensor = history.find(s => s.sensor_id === 'sens-001-temp-bruxelles-creuz');

        if (bruxellesCO2Sensor && bruxellesTempSensor) {
            console.log(`🔍 Found existing data: CO2 has ${bruxellesCO2Sensor.data.length} points, Temp has ${bruxellesTempSensor.data.length} points`);

            // Generate data for the last 30 days, every 2 hours
            const pointsToAdd = 30 * 12; // 30 days * 12 points per day (every 2 hours)

            // CO2 data generation (realistic values with daily patterns)
            for (let i = 0; i < pointsToAdd; i++) {
                const hoursAgo = 24 + (i * 2); // Start from 24 hours ago, every 2 hours
                const timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));

                // Simulate daily CO2 patterns (higher during day, lower at night)
                const hour = timestamp.getHours();
                const baseCO2 = 400;
                const dailyVariation = hour >= 6 && hour <= 20 ? 200 + Math.random() * 400 : 50 + Math.random() * 100;
                const noise = (Math.random() - 0.5) * 100;
                const co2Value = Math.round(baseCO2 + dailyVariation + noise);

                // Quality decreases slightly with age
                const quality = Math.max(0.85, 0.98 - (i * 0.0001));

                bruxellesCO2Sensor.data.push({
                    timestamp: timestamp.toISOString(),
                    value: co2Value,
                    quality: Math.round(quality * 100) / 100
                });
            }

            // Temperature data generation (realistic values with daily patterns)
            for (let i = 0; i < pointsToAdd; i++) {
                const hoursAgo = 24 + (i * 2); // Start from 24 hours ago, every 2 hours
                const timestamp = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));

                // Simulate daily temperature patterns
                const hour = timestamp.getHours();
                const dayOfYear = Math.floor((timestamp.getTime() - new Date(timestamp.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

                // Seasonal variation (warmer in summer)
                const seasonalTemp = 15 + 10 * Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);

                // Daily variation (warmer during day)
                const dailyVariation = 3 * Math.sin((hour - 6) * Math.PI / 12);

                // Random noise
                const noise = (Math.random() - 0.5) * 2;

                const tempValue = Math.round((seasonalTemp + dailyVariation + noise) * 10) / 10;

                // Quality decreases slightly with age
                const quality = Math.max(0.85, 0.98 - (i * 0.0001));

                bruxellesTempSensor.data.push({
                    timestamp: timestamp.toISOString(),
                    value: tempValue,
                    quality: Math.round(quality * 100) / 100
                });
            }

            // Sort data by timestamp (most recent first)
            bruxellesCO2Sensor.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            bruxellesTempSensor.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log(`✅ Added ${pointsToAdd} points to each sensor`);
            console.log(`📊 New totals: CO2 has ${bruxellesCO2Sensor.data.length} points, Temp has ${bruxellesTempSensor.data.length} points`);

            // Save updated data
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));

            const oldestCO2 = bruxellesCO2Sensor.data[bruxellesCO2Sensor.data.length - 1];
            const newestCO2 = bruxellesCO2Sensor.data[0];

            console.log(`🎉 Successfully extended data range!`);
            console.log(`📅 Data now spans from ${oldestCO2.timestamp} to ${newestCO2.timestamp}`);
            console.log(`⏱️  That's approximately ${Math.round((new Date(newestCO2.timestamp) - new Date(oldestCO2.timestamp)) / (1000 * 60 * 60 * 24))} days of data`);
        } else {
            console.log('❌ Could not find Bruxelles sensors in history data');
        }

    } catch (error) {
        console.error('❌ Error adding 30-day data:', error);
    }
}

add30DayData();