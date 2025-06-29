#!/usr/bin/env node

const axios = require('axios');

// Test configuration
const services = {
  userService: 'http://localhost:3010',
  gameEngine: 'http://localhost:3011', 
  rewardsService: 'http://localhost:3012',
  paymentService: 'http://localhost:3013',
  analyticsService: 'http://localhost:3014',
  apiGateway: 'http://localhost:3000',
  frontend: 'http://localhost:3001'
};

const testWallet = 'FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testService(name, url, endpoint = '/health') {
  try {
    log(`\n🔍 Testing ${name} at ${url}${endpoint}`, 'blue');
    const response = await axios.get(`${url}${endpoint}`, { timeout: 5000 });
    log(`✅ ${name}: ${response.status} - ${JSON.stringify(response.data)}`, 'green');
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    const status = error.response?.status || 'CONNECTION_FAILED';
    const message = error.response?.data || error.message;
    log(`❌ ${name}: ${status} - ${message}`, 'red');
    return { success: false, error: message, status };
  }
}

async function testUserLives() {
  log('\n🎯 Testing User Lives API Chain...', 'yellow');
  
  // Test 1: Direct User Service
  log('\n1️⃣ Testing User Service directly:', 'blue');
  const directTest = await testService('User Service Direct', services.userService, `/api/user/lives?wallet=${testWallet}`);
  
  // Test 2: Via API Gateway  
  log('\n2️⃣ Testing via API Gateway:', 'blue');
  const gatewayTest = await testService('API Gateway -> User Service', services.apiGateway, `/api/user/lives?wallet=${testWallet}`);
  
  // Test 3: Via Frontend API
  log('\n3️⃣ Testing via Frontend API:', 'blue');
  const frontendTest = await testService('Frontend API', services.frontend, `/api/user/lives?wallet=${testWallet}`);
  
  return { directTest, gatewayTest, frontendTest };
}

async function testAllHealthChecks() {
  log('🚀 GAMEFI PLATFORM API TESTING', 'blue');
  log('=====================================', 'blue');
  
  const results = {};
  
  for (const [name, url] of Object.entries(services)) {
    results[name] = await testService(name, url);
  }
  
  return results;
}

async function testDatabase() {
  log('\n🗄️ Testing Database Connectivity...', 'yellow');
  
  try {
    // Test a simple query via User Service
    const response = await axios.get(`${services.userService}/api/user/lives?wallet=test123`, { timeout: 5000 });
    log('✅ Database: Connected and responding', 'green');
    return true;
  } catch (error) {
    log(`❌ Database: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.clear();
  
  // Test 1: All health checks
  const healthResults = await testAllHealthChecks();
  
  // Test 2: Database connectivity
  await testDatabase();
  
  // Test 3: User Lives API chain
  const livesResults = await testUserLives();
  
  // Summary
  log('\n📊 SUMMARY REPORT', 'yellow');
  log('==================', 'yellow');
  
  const healthyServices = Object.entries(healthResults).filter(([_, result]) => result.success);
  const unhealthyServices = Object.entries(healthResults).filter(([_, result]) => !result.success);
  
  log(`✅ Healthy Services: ${healthyServices.length}/${Object.keys(services).length}`, 'green');
  healthyServices.forEach(([name]) => log(`   - ${name}`, 'green'));
  
  if (unhealthyServices.length > 0) {
    log(`❌ Unhealthy Services: ${unhealthyServices.length}`, 'red');
    unhealthyServices.forEach(([name, result]) => log(`   - ${name}: ${result.status}`, 'red'));
  }
  
  // Lives API Chain Analysis
  log('\n🎯 Lives API Chain Analysis:', 'yellow');
  if (livesResults.directTest.success) {
    log('✅ User Service: Working directly', 'green');
  } else {
    log('❌ User Service: Not responding', 'red');
  }
  
  if (livesResults.gatewayTest.success) {
    log('✅ API Gateway: Routing correctly', 'green');
  } else {
    log('❌ API Gateway: Routing failed', 'red');
  }
  
  if (livesResults.frontendTest.success) {
    log('✅ Frontend API: Working end-to-end', 'green');
  } else {
    log('❌ Frontend API: Integration failed', 'red');
  }
  
  // Recommendations
  log('\n💡 RECOMMENDATIONS:', 'yellow');
  if (!livesResults.directTest.success) {
    log('1. Fix User Service startup issues', 'yellow');
    log('2. Check database connection', 'yellow');
    log('3. Verify routes are registered', 'yellow');
  } else if (!livesResults.gatewayTest.success) {
    log('1. Fix API Gateway routing configuration', 'yellow');
    log('2. Check service URLs in gateway', 'yellow');
  } else if (!livesResults.frontendTest.success) {
    log('1. Fix frontend API route configuration', 'yellow');
    log('2. Check environment variables', 'yellow');
  } else {
    log('🎉 All systems appear to be working!', 'green');
  }
}

// Add axios dependency check
if (typeof require === 'undefined') {
  console.log('❌ This script requires Node.js to run');
  process.exit(1);
}

try {
  require('axios');
} catch (error) {
  console.log('❌ Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
  console.log('✅ Axios installed, restarting...');
  require('child_process').spawn(process.argv0, process.argv.slice(1), { stdio: 'inherit' });
  process.exit(0);
}

main().catch(console.error); 