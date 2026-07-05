import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  duration: number;
  error?: string;
}

const BASE_URL = 'http://localhost:3737';
const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const duration = Date.now() - start;
    
    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      duration,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runTests() {
  console.log('🧪 CopyCloud API Test Suite\n');
  console.log(`Testing: ${BASE_URL}\n`);
  
  // Health check
  console.log('1. Health Check');
  results.push(await testEndpoint('/health'));
  
  // API info
  console.log('2. API Info');
  results.push(await testEndpoint('/api'));
  
  // Auth endpoints
  console.log('3. Auth Endpoints');
  results.push(await testEndpoint('/api/auth/register', 'POST', {
    email: 'test@example.com',
    password: 'password123',
  }));
  results.push(await testEndpoint('/api/auth/login', 'POST', {
    email: 'test@example.com',
    password: 'password123',
  }));
  
  // Get token for authenticated endpoints
  let token = '';
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    const loginData = await loginResponse.json();
    token = loginData.token || '';
  } catch {}
  
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  
  // Clipboard endpoints
  console.log('4. Clipboard Endpoints');
  results.push(await testEndpoint('/api/clipboard', 'GET', undefined, authHeaders));
  results.push(await testEndpoint('/api/clipboard', 'POST', {
    content_type: 'text',
    preview: 'Test clip',
    metadata: { size: 9 },
  }, authHeaders));
  
  // Device endpoints
  console.log('5. Device Endpoints');
  results.push(await testEndpoint('/api/devices', 'GET', undefined, authHeaders));
  results.push(await testEndpoint('/api/devices/register', 'POST', {
    device_id: 'test-device-123',
    name: 'Test Device',
    platform: 'web',
  }, authHeaders));
  
  // Print results
  console.log('\n📊 Test Results:\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const statusColor = result.success ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    
    console.log(
      `${status} ${result.method.padEnd(6)} ${result.endpoint.padEnd(30)} ` +
      `${statusColor}${result.status}${resetColor} ${result.duration}ms` +
      (result.error ? ` (${result.error})` : '')
    );
  });
  
  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log(`⏱️  Total duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
  
  // Save results
  const reportPath = path.join(__dirname, '../test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Results saved to: ${reportPath}`);
}

runTests().catch(console.error);
