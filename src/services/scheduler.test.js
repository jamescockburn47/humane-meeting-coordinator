/**
 * Scheduler Test Suite
 * Run this in the browser console or import it to verify the scheduling logic.
 * 
 * To run in browser console:
 * 1. Open humanecalendar.com
 * 2. Open DevTools (F12) → Console
 * 3. Copy and paste this entire file
 * 4. Call: runSchedulerTests()
 */

import { findCommonHumaneSlots } from './scheduler.js';

// Test helper
function test(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        return true;
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`   ${e.message}`);
        return false;
    }
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg} Expected ${expected}, got ${actual}`);
    }
}

function assertTrue(condition, msg = '') {
    if (!condition) {
        throw new Error(msg || 'Assertion failed');
    }
}

// ============ TEST CASES ============

export function runSchedulerTests() {
    console.log('\n========== SCHEDULER TEST SUITE ==========\n');
    
    let passed = 0;
    let failed = 0;

    // Test 1: Two users with same 9-5 window, no busy slots
    if (test('Same timezone, same windows, no conflicts', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }]
            },
            { 
                email: 'user2@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }]
            }
        ];
        const busySlots = [];
        
        // Search for Monday Jan 6, 2025 (a weekday)
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // Should find slots between 9:00-17:00 (8 hours = 16 slots at 30min intervals for 1hr meetings)
        assertTrue(results.length > 0, 'Should find at least one slot');
        
        // Check first slot is at 9:00
        const firstSlot = new Date(results[0].start);
        assertEqual(firstSlot.getUTCHours(), 9, 'First slot should be at 9:00');
    })) passed++; else failed++;

    // Test 2: Two users with non-overlapping windows
    if (test('Non-overlapping windows should return no slots', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '12:00', type: 'weekday' }]
            },
            { 
                email: 'user2@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '14:00', end: '17:00', type: 'weekday' }]
            }
        ];
        const busySlots = [];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        assertEqual(results.length, 0, 'Should find no overlapping slots');
    })) passed++; else failed++;

    // Test 3: User with 8-9am window only
    if (test('Narrow window (8-9am) should only return slots in that window', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '08:00', end: '09:00', type: 'weekday' }]
            },
            { 
                email: 'user2@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '08:00', end: '17:00', type: 'weekday' }]
            }
        ];
        const busySlots = [];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // With 8-9am window and 1hr meeting, only one slot should fit: 8:00-9:00
        assertTrue(results.length <= 1, `Should find at most 1 slot, found ${results.length}`);
        
        if (results.length > 0) {
            const slotStart = new Date(results[0].start);
            assertEqual(slotStart.getUTCHours(), 8, 'Slot should be at 8:00');
        }
    })) passed++; else failed++;

    // Test 4: Weekend should not return slots for weekday-only windows
    if (test('Weekday windows should not match on weekends', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }]
            }
        ];
        const busySlots = [];
        
        // Jan 4, 2025 is a Saturday
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-04', '2025-01-04', 60);
        
        assertEqual(results.length, 0, 'Should find no slots on weekend for weekday windows');
    })) passed++; else failed++;

    // Test 5: Weekend windows should match on weekends
    if (test('Weekend windows should match on weekends', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '10:00', end: '14:00', type: 'weekend' }]
            }
        ];
        const busySlots = [];
        
        // Jan 4, 2025 is a Saturday
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-04', '2025-01-04', 60);
        
        assertTrue(results.length > 0, 'Should find slots on weekend for weekend windows');
    })) passed++; else failed++;

    // Test 6: Busy slots should block otherwise valid times
    if (test('Busy slots should block valid times', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '11:00', type: 'weekday' }]
            }
        ];
        
        // User is busy 9:00-10:00
        const busySlots = [
            {
                profile_email: 'user1@test.com',
                start_time: '2025-01-06T09:00:00Z',
                end_time: '2025-01-06T10:00:00Z'
            }
        ];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // Only 10:00-11:00 should be available
        results.forEach(slot => {
            const start = new Date(slot.start);
            assertTrue(start.getUTCHours() >= 10, `Slot at ${start.getUTCHours()}:00 should not be before 10:00`);
        });
    })) passed++; else failed++;

    // Test 7: Different timezones
    if (test('Different timezones should correctly calculate overlap', () => {
        const members = [
            { 
                email: 'london@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '14:00', end: '17:00', type: 'weekday' }] // 2pm-5pm London
            },
            { 
                email: 'newyork@test.com', 
                timezone: 'America/New_York',
                humane_windows: [{ start: '09:00', end: '12:00', type: 'weekday' }] // 9am-12pm NYC = 2pm-5pm London
            }
        ];
        const busySlots = [];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // Should find overlap: 2pm-5pm London = 9am-12pm NYC
        assertTrue(results.length > 0, 'Should find overlapping slots across timezones');
    })) passed++; else failed++;

    // Test 8: Empty/null windows should fall back to legacy
    if (test('Empty windows should fall back to legacy 9-5', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [], // Empty array
                humane_start_local: '09:00',
                humane_end_local: '17:00'
            }
        ];
        const busySlots = [];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        assertTrue(results.length > 0, 'Should find slots using legacy fallback');
    })) passed++; else failed++;

    // Test 9: Null member data should be handled gracefully
    if (test('Null/undefined member data should not crash', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: null,
                humane_windows: null
            }
        ];
        const busySlots = [];
        
        // Should not throw
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // Should use defaults (UTC timezone, 9-5 weekday)
        assertTrue(Array.isArray(results), 'Should return an array');
    })) passed++; else failed++;

    // Test 10: 23:30 should NOT be valid for 9-17 window
    if (test('23:30 should NOT be valid for 9-17 window', () => {
        const members = [
            { 
                email: 'user1@test.com', 
                timezone: 'Europe/London',
                humane_windows: [{ start: '09:00', end: '17:00', type: 'weekday' }]
            }
        ];
        const busySlots = [];
        
        const results = findCommonHumaneSlots(members, busySlots, '2025-01-06', '2025-01-06', 60);
        
        // Check that no slot starts at 23:00 or later
        const lateSlots = results.filter(slot => {
            const hour = new Date(slot.start).getUTCHours();
            return hour >= 17 || hour < 9;
        });
        
        assertEqual(lateSlots.length, 0, `Found ${lateSlots.length} slots outside 9-17 window`);
    })) passed++; else failed++;

    // Summary
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n⚠️ Some tests failed. Check the scheduler logic.');
    }
    
    return { passed, failed };
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    window.runSchedulerTests = runSchedulerTests;
    console.log('Scheduler tests loaded. Run: runSchedulerTests()');
}
