/**
 * Unit Test: Round Robin Assignment Logic
 * 
 * Tests the core round-robin algorithm that assigns leads
 * to pre-sales department users sequentially.
 * 
 * Run: node src/tests/roundRobin.test.js
 */

// ============================================================
// Mock Setup — simulate the DB models and connections
// ============================================================

let mockPreSalesUsers = [];
let mockState = null;

// Mock getOrganizationConnection
const mockOrgConnection = {
    models: {},
    model: function (name, schema) {
        this.models[name] = { name, schema };
        return this.models[name];
    }
};

// We'll test the pure logic by extracting it into a testable function
// that mirrors RoundRobinService.getNextPreSalesUser

/**
 * Pure round-robin function (extracted logic from RoundRobinService)
 * @param {Array} users - List of pre-sales users sorted by _id
 * @param {number} lastIndex - The last assigned index (-1 if none)
 * @returns {{ nextIndex: number, userId: string } | null}
 */
function roundRobinAssign(users, lastIndex) {
    if (!users || users.length === 0) return null;

    const nextIndex = (lastIndex + 1) % users.length;
    return {
        nextIndex,
        userId: users[nextIndex]._id,
    };
}

// ============================================================
// Test Runner
// ============================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
        console.log(`  ✅ ${message}`);
    } else {
        failed++;
        console.log(`  ❌ FAIL: ${message}`);
    }
}

// ============================================================
// Test Cases
// ============================================================

console.log('\n🧪 Round Robin Assignment Tests\n');

// --- Test 1: Empty user list ---
console.log('Test 1: Empty user list returns null');
{
    const result = roundRobinAssign([], -1);
    assert(result === null, 'Should return null when no users');
}

// --- Test 2: Single user ---
console.log('\nTest 2: Single user always gets assigned');
{
    const users = [{ _id: 'user-a' }];
    const r1 = roundRobinAssign(users, -1);
    assert(r1.userId === 'user-a', 'First assignment → user-a');
    assert(r1.nextIndex === 0, 'Index should be 0');

    const r2 = roundRobinAssign(users, r1.nextIndex);
    assert(r2.userId === 'user-a', 'Second assignment → still user-a (wraps)');
    assert(r2.nextIndex === 0, 'Index wraps back to 0');
}

// --- Test 3: Multiple users — sequential assignment ---
console.log('\nTest 3: Three users assigned sequentially');
{
    const users = [
        { _id: 'user-a' },
        { _id: 'user-b' },
        { _id: 'user-c' },
    ];

    let lastIndex = -1;

    const r1 = roundRobinAssign(users, lastIndex);
    assert(r1.userId === 'user-a', 'Lead 1 → user-a');
    lastIndex = r1.nextIndex;

    const r2 = roundRobinAssign(users, lastIndex);
    assert(r2.userId === 'user-b', 'Lead 2 → user-b');
    lastIndex = r2.nextIndex;

    const r3 = roundRobinAssign(users, lastIndex);
    assert(r3.userId === 'user-c', 'Lead 3 → user-c');
    lastIndex = r3.nextIndex;
}

// --- Test 4: Wrap-around after last user ---
console.log('\nTest 4: Wraps around after last user');
{
    const users = [
        { _id: 'user-a' },
        { _id: 'user-b' },
        { _id: 'user-c' },
    ];

    // Start from last user
    const r1 = roundRobinAssign(users, 2);
    assert(r1.userId === 'user-a', 'After user-c (index 2) → wraps to user-a');
    assert(r1.nextIndex === 0, 'Index resets to 0');
}

// --- Test 5: Large number of leads — fair distribution ---
console.log('\nTest 5: Fair distribution over 12 leads with 3 users');
{
    const users = [
        { _id: 'user-a' },
        { _id: 'user-b' },
        { _id: 'user-c' },
    ];

    const counts = { 'user-a': 0, 'user-b': 0, 'user-c': 0 };
    let lastIndex = -1;

    for (let i = 0; i < 12; i++) {
        const result = roundRobinAssign(users, lastIndex);
        counts[result.userId]++;
        lastIndex = result.nextIndex;
    }

    assert(counts['user-a'] === 4, `user-a gets 4 leads (got ${counts['user-a']})`);
    assert(counts['user-b'] === 4, `user-b gets 4 leads (got ${counts['user-b']})`);
    assert(counts['user-c'] === 4, `user-c gets 4 leads (got ${counts['user-c']})`);
}

// --- Test 6: Order is deterministic ---
console.log('\nTest 6: Order is deterministic (same sequence every time)');
{
    const users = [
        { _id: 'alpha' },
        { _id: 'beta' },
    ];

    const sequence1 = [];
    const sequence2 = [];

    let idx = -1;
    for (let i = 0; i < 6; i++) {
        const r = roundRobinAssign(users, idx);
        sequence1.push(r.userId);
        idx = r.nextIndex;
    }

    idx = -1;
    for (let i = 0; i < 6; i++) {
        const r = roundRobinAssign(users, idx);
        sequence2.push(r.userId);
        idx = r.nextIndex;
    }

    assert(
        JSON.stringify(sequence1) === JSON.stringify(sequence2),
        `Sequences match: ${sequence1.join(', ')}`
    );
}

// --- Test 7: null/undefined users ---
console.log('\nTest 7: Null/undefined input handling');
{
    assert(roundRobinAssign(null, -1) === null, 'null users → null');
    assert(roundRobinAssign(undefined, -1) === null, 'undefined users → null');
}

// ============================================================
// Summary
// ============================================================

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
