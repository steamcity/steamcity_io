/**
 * Validation script for AuthManager integration
 * Tests the key integration points to ensure isofunction​ality
 */

import { execSync } from 'child_process';
import fs from 'fs';

const SERVER_URL = 'http://localhost:8080';

// Colors for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function log(level, message) {
    const timestamp = new Date().toISOString().slice(11, 19);
    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

// Test 1: Server is running
function testServerRunning() {
    try {
        const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${SERVER_URL}`);
        const statusCode = result.toString().trim();
        if (statusCode === '200') {
            log('green', '✅ Server is running and responding');
            return true;
        } else {
            log('red', `❌ Server returned status code: ${statusCode}`);
            return false;
        }
    } catch (error) {
        log('red', `❌ Server is not accessible: ${error.message}`);
        return false;
    }
}

// Test 2: API endpoints are working
function testApiEndpoints() {
    try {
        // Test health endpoint
        const healthResult = execSync(`curl -s ${SERVER_URL}/api/health`);
        const healthData = JSON.parse(healthResult.toString());

        if (healthData.status === 'OK') {
            log('green', '✅ Health API endpoint working');
        } else {
            log('red', '❌ Health API endpoint failed');
            return false;
        }

        // Test sensors endpoint
        const sensorsResult = execSync(`curl -s ${SERVER_URL}/api/sensors | head -c 100`);
        const sensorsData = sensorsResult.toString();

        if (sensorsData.includes('"success":true')) {
            log('green', '✅ Sensors API endpoint working');
            return true;
        } else {
            log('red', '❌ Sensors API endpoint failed');
            return false;
        }
    } catch (error) {
        log('red', `❌ API endpoints test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Frontend modules are accessible
function testFrontendModules() {
    const modules = [
        { path: '/js/main.js', name: 'Main module' },
        { path: '/js/auth-manager.js', name: 'AuthManager module' },
        { path: '/script.js', name: 'Original script' },
        { path: '/style.css', name: 'Stylesheet' }
    ];

    let allPassed = true;

    for (const module of modules) {
        try {
            const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${SERVER_URL}${module.path}`);
            const statusCode = result.toString().trim();

            if (statusCode === '200') {
                log('green', `✅ ${module.name} accessible`);
            } else {
                log('red', `❌ ${module.name} returned status ${statusCode}`);
                allPassed = false;
            }
        } catch (error) {
            log('red', `❌ ${module.name} test failed: ${error.message}`);
            allPassed = false;
        }
    }

    return allPassed;
}

// Test 4: HTML page loads with correct module references
function testHtmlModuleReferences() {
    try {
        const result = execSync(`curl -s ${SERVER_URL}`);
        const html = result.toString();

        const hasMainJs = html.includes('js/main.js');
        const hasModuleType = html.includes('type="module"');
        const hasCorrectScript = html.includes('<script type="module" src="js/main.js">');

        if (hasMainJs && hasModuleType && hasCorrectScript) {
            log('green', '✅ HTML correctly references ES6 modules');
            return true;
        } else {
            log('red', '❌ HTML module references incorrect');
            log('blue', `  Main.js reference: ${hasMainJs ? '✅' : '❌'}`);
            log('blue', `  Module type: ${hasModuleType ? '✅' : '❌'}`);
            log('blue', `  Correct script tag: ${hasCorrectScript ? '✅' : '❌'}`);
            return false;
        }
    } catch (error) {
        log('red', `❌ HTML test failed: ${error.message}`);
        return false;
    }
}

// Test 5: AuthManager unit tests pass
function testAuthManagerTests() {
    try {
        const result = execSync('npm run test:run -- test/auth-manager.test.js', {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        if (result.includes('17 passed')) {
            log('green', '✅ All AuthManager unit tests passing');
            return true;
        } else {
            log('red', '❌ AuthManager tests failed');
            return false;
        }
    } catch (error) {
        log('red', `❌ AuthManager tests execution failed: ${error.message}`);
        return false;
    }
}

// Test 6: Integration files exist and are correctly structured
function testIntegrationFiles() {
    const files = [
        { path: 'public/js/main.js', name: 'Main integration file' },
        { path: 'public/js/auth-manager.js', name: 'AuthManager module' },
        { path: 'test/auth-manager.test.js', name: 'AuthManager tests' },
        { path: 'vitest.config.js', name: 'Vitest configuration' }
    ];

    let allExist = true;

    for (const file of files) {
        if (fs.existsSync(file.path)) {
            log('green', `✅ ${file.name} exists`);

            // Check content for main.js
            if (file.path === 'public/js/main.js') {
                const content = fs.readFileSync(file.path, 'utf8');
                const hasAuthManagerImport = content.includes("import { AuthManager } from './auth-manager.js'");
                const hasPatchFunction = content.includes('patchSteamCityWithAuthManager');

                if (hasAuthManagerImport && hasPatchFunction) {
                    log('green', '✅ Main.js has correct integration structure');
                } else {
                    log('red', '❌ Main.js missing critical integration code');
                    allExist = false;
                }
            }
        } else {
            log('red', `❌ ${file.name} missing`);
            allExist = false;
        }
    }

    return allExist;
}

// Run all tests
async function runValidation() {
    log('blue', '🧪 Starting AuthManager Integration Validation...\n');

    const tests = [
        { name: 'Server Running', fn: testServerRunning },
        { name: 'API Endpoints', fn: testApiEndpoints },
        { name: 'Frontend Modules', fn: testFrontendModules },
        { name: 'HTML Module References', fn: testHtmlModuleReferences },
        { name: 'AuthManager Tests', fn: testAuthManagerTests },
        { name: 'Integration Files', fn: testIntegrationFiles }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        log('blue', `\n🔍 Running test: ${test.name}`);
        const result = test.fn();

        if (result) {
            passed++;
            log('green', `✅ ${test.name} PASSED`);
        } else {
            failed++;
            log('red', `❌ ${test.name} FAILED`);
        }
    }

    // Summary
    log('blue', '\n📊 VALIDATION SUMMARY');
    log('blue', '='.repeat(50));
    log('green', `✅ Tests Passed: ${passed}`);
    log('red', `❌ Tests Failed: ${failed}`);
    log('blue', `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
        log('green', '\n🎉 ALL TESTS PASSED - AuthManager integration is successful!');
        log('green', '🚀 Application is ready with modular authentication system');
    } else {
        log('red', `\n⚠️  ${failed} test(s) failed - check issues above`);
    }

    return failed === 0;
}

// Run the validation
runValidation().catch(console.error);