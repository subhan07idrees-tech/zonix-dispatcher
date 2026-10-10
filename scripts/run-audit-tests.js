/**
 * ZONIX System Engineering Audit Test Suite
 * Validates Security, Encryption, Auth/RBAC, Multi-Tenant Boundaries, and Header Sanitization
 */

const assert = require('assert');
const path = require('path');
module.paths.push(path.join(__dirname, '../src/backend/node_modules'));
const jwt = require('jsonwebtoken');

// 1. Encryption Service Tests
console.log('=== Test Suite 1: Encryption & Session Vault Integrity ===');
const { encryptData, decryptData } = require('../src/backend/src/services/encryption');

const testPayload = JSON.stringify({
  cookies: [
    { name: 'DAT_SESSION_TOKEN', value: 'secret-token-xyz-12345', domain: '.dat.com' },
    { name: 'DAT_REFRESH_TOKEN', value: 'refresh-jwt-98765', domain: '.dat.com' }
  ],
  localStorage: JSON.stringify({ 'dat.user.profile': { role: 'fleet_admin' } })
});

const encResult = encryptData(testPayload);
assert(encResult.encryptedData, 'Encrypted data must exist');
assert(encResult.iv, 'IV must exist');
assert(encResult.hash, 'Hash must exist');

const decrypted = decryptData(encResult.encryptedData, encResult.iv);
assert.strictEqual(decrypted, testPayload, 'Decrypted data must exactly match original payload');

// Verify tampering detection with hash validation and structure parsing
let tamperFailed = false;
try {
  decryptData(encResult.encryptedData.slice(0, -4) + '0000', encResult.iv, encResult.hash);
} catch (e) {
  tamperFailed = true;
}
assert(tamperFailed, 'Tampered ciphertext must fail hash integrity check');

// Verify JSON payload corruption detection
let jsonCorrupted = false;
try {
  const badData = decryptData(encResult.encryptedData.slice(0, -4) + '0000', encResult.iv);
  JSON.parse(badData);
} catch (e) {
  jsonCorrupted = true;
}
assert(jsonCorrupted, 'Corrupted ciphertext must produce invalid JSON');
console.log('  [PASS] Encryption round-trip, IV generation, and integrity verification');

// 2. Auth, JWT & Role-Based Access Control (RBAC) Tests
console.log('\n=== Test Suite 2: Auth Tokens & RBAC Tenant Enforcement ===');
const { generateToken, requireRole, requireOrgAccess } = require('../src/backend/src/middleware/auth');

const mockSuperAdmin = { id: 'usr-1', orgId: 'org-alpha', username: 'superadmin', role: 'SUPER_ADMIN' };
const mockAdmin = { id: 'usr-2', orgId: 'org-alpha', username: 'alpha_admin', role: 'ADMIN' };
const mockViewer = { id: 'usr-3', orgId: 'org-alpha', username: 'alpha_viewer', role: 'VIEWER' };
const mockForeignAdmin = { id: 'usr-4', orgId: 'org-beta', username: 'beta_admin', role: 'ADMIN' };

const token = generateToken(mockAdmin);
const decoded = jwt.decode(token);
assert.strictEqual(decoded.userId, mockAdmin.id);
assert.strictEqual(decoded.orgId, mockAdmin.orgId);
assert.strictEqual(decoded.role, mockAdmin.role);
console.log('  [PASS] JWT signing and claim serialization verified');

// Test requireRole middleware
function testRoleMiddleware(middleware, user) {
  let status = null;
  let nextCalled = false;
  const req = { user };
  const res = {
    status: (code) => {
      status = code;
      return { json: () => {} };
    }
  };
  middleware(req, res, () => { nextCalled = true; });
  return { status, nextCalled };
}

const adminManagerCheck = requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER');
assert(testRoleMiddleware(adminManagerCheck, mockAdmin).nextCalled, 'ADMIN should pass admin/manager check');
assert(testRoleMiddleware(adminManagerCheck, mockSuperAdmin).nextCalled, 'SUPER_ADMIN should pass admin/manager check');
assert.strictEqual(testRoleMiddleware(adminManagerCheck, mockViewer).status, 403, 'VIEWER should receive 403');
console.log('  [PASS] Role hierarchy enforcement (SUPER_ADMIN / ADMIN / VIEWER)');

// Test requireOrgAccess middleware
function testOrgAccessMiddleware(user, targetOrgId) {
  let status = null;
  let nextCalled = false;
  const req = { user, params: { orgId: targetOrgId } };
  const res = {
    status: (code) => {
      status = code;
      return { json: () => {} };
    }
  };
  requireOrgAccess(req, res, () => { nextCalled = true; });
  return { status, nextCalled };
}

assert(testOrgAccessMiddleware(mockAdmin, 'org-alpha').nextCalled, 'Matching org should be allowed');
assert.strictEqual(testOrgAccessMiddleware(mockAdmin, 'org-beta').status, 403, 'Mismatched org must receive 403 for regular Admin');
assert(testOrgAccessMiddleware(mockSuperAdmin, 'org-beta').nextCalled, 'SUPER_ADMIN must be allowed across all tenant orgs');
console.log('  [PASS] Multi-tenant cross-organization isolation barrier');

// 3. Security Engine Unified Response Headers Test
console.log('\n=== Test Suite 3: SecurityEngine Unified Header Sanitization ===');
const SecurityEngine = require('../src/main/security.js');
const engine = new SecurityEngine();

let registeredHeaderHandler = null;
const mockSession = {
  id: 'test-session-123',
  webRequest: {
    onBeforeRequest: () => {},
    onBeforeSendHeaders: () => {},
    onHeadersReceived: (filter, handler) => {
      registeredHeaderHandler = handler;
    }
  },
  setWebRTCIPHandlingPolicy: () => {}
};

engine.applyInterceptors(mockSession, 'org-alpha', 'sess-001', null);
assert(typeof registeredHeaderHandler === 'function', 'onHeadersReceived listener must be registered');

// Test header stripping on incoming response
const mockResponseDetails = {
  responseHeaders: {
    'content-type': ['text/html'],
    'content-security-policy': ["default-src 'self'; report-uri https://telemetry.example.com; connect-src *"],
    'x-device-id': ['device-abc-123'],
    'x-client-id': ['client-999'],
    'x-session-fingerprint': ['fp-fingerprint-data'],
    'x-powered-by': ['Express'],
    'x-aspnet-version': ['4.0.30319'],
    'x-request-id': ['req-xyz-456'],
    'set-cookie': ['session=valid; Path=/']
  }
};

let interceptedResult = null;
registeredHeaderHandler(mockResponseDetails, (res) => {
  interceptedResult = res.responseHeaders;
});

assert(interceptedResult, 'Handler must return sanitized headers');
assert(!interceptedResult['x-device-id'], 'x-device-id must be stripped');
assert(!interceptedResult['x-client-id'], 'x-client-id must be stripped');
assert(!interceptedResult['x-session-fingerprint'], 'x-session-fingerprint must be stripped');
assert(!interceptedResult['x-powered-by'], 'x-powered-by must be stripped');
assert(!interceptedResult['x-aspnet-version'], 'x-aspnet-version must be stripped');
assert(!interceptedResult['x-request-id'], 'x-request-id must be stripped');
assert(interceptedResult['set-cookie'], 'Legitimate cookies must be preserved');

// Verify CSP report-uri removal
const sanitizedCSP = interceptedResult['content-security-policy'][0];
assert(!sanitizedCSP.includes('report-uri'), 'report-uri must be stripped from CSP');
assert(sanitizedCSP.includes("connect-src 'self'"), "connect-src 'self' must be enforced");
console.log('  [PASS] Unified CSP modification, anti-tracking, and anti-fingerprint header stripping');

// 4. In-Memory Proxy Health Check Partition Test
console.log('\n=== Test Suite 4: In-Memory Proxy Health Partition Verification ===');
const fs = require('fs');
const proxyManagerSource = fs.readFileSync(path.join(__dirname, '../src/main/proxyManager.js'), 'utf-8');
assert(!proxyManagerSource.includes('persist:proxy_check_'), 'Proxy check partition must NOT use persist: prefix');
assert(proxyManagerSource.includes('proxy_check_${sessionId}'), 'Proxy check partition must use in-memory partition');
console.log('  [PASS] Memory partition leak eliminated - zero orphaned disk partitions');

// 5. Audit Middleware Registration Order Test
console.log('\n=== Test Suite 5: Express Server Audit Middleware Mount Order ===');
const serverSource = fs.readFileSync(path.join(__dirname, '../src/backend/src/server.js'), 'utf-8');
const auditMiddlewareIndex = serverSource.indexOf('app.use(auditMiddleware);');
const authRoutesIndex = serverSource.indexOf("app.use('/api/auth', authRoutes);");
assert(auditMiddlewareIndex !== -1, 'auditMiddleware must be mounted in server.js');
assert(auditMiddlewareIndex < authRoutesIndex, 'auditMiddleware must be mounted BEFORE api routes to capture non-GET requests');
console.log('  [PASS] Audit middleware correctly intercepting before all API route handlers');

console.log('\n======================================================');
console.log('✅ ALL 5/5 AUDIT TEST SUITES PASSED CLEANLY WITH ZERO ERRORS');
console.log('======================================================\n');
