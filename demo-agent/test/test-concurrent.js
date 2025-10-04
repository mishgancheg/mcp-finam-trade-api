/**
 * Test concurrent request handling
 * Tests if the API can handle multiple requests with different accountIds in parallel
 */

const API_BASE = 'http://localhost:3002';

async function createSession(userId) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return res.json();
}

async function sendMessage(sessionId, message, accountId) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, accountId })
  });
  return res.json();
}

async function testConcurrentRequests() {
  console.log('🧪 Testing concurrent requests with different accountIds...\n');

  // Create 3 sessions
  const session1 = await createSession('user1');
  const session2 = await createSession('user2');
  const session3 = await createSession('user3');

  console.log('✅ Created 3 sessions');

  // Send concurrent requests with different accountIds
  const startTime = Date.now();

  const results = await Promise.all([
    sendMessage(session1.sessionId, 'Покажи мой аккаунт', '111111'),
    sendMessage(session2.sessionId, 'Покажи мой аккаунт', '222222'),
    sendMessage(session3.sessionId, 'Покажи мой аккаунт', '333333'),
  ]);

  const duration = Date.now() - startTime;

  console.log(`\n⏱️  All requests completed in ${duration}ms`);
  console.log('\n📊 Results:\n');

  results.forEach((result, idx) => {
    const expectedAccountId = `${(idx + 1).toString().repeat(6)}`;
    console.log(`Session ${idx + 1} (expected accountId: ${expectedAccountId}):`);
    console.log(`  Message: ${result.message.substring(0, 100)}...`);
    console.log(`  Tool calls: ${result.toolCalls?.length || 0}`);

    if (result.toolCalls?.length > 0) {
      const toolCall = result.toolCalls[0];
      console.log(`  First tool: ${toolCall.name}`);
      console.log(`  Params: ${JSON.stringify(toolCall.params)}`);
    }
    console.log('');
  });

  console.log('\n⚠️  WARNING: Check if each session received data for its own accountId!');
  console.log('If credentials are mixed, this is a race condition bug.\n');
}

// Run test
testConcurrentRequests().catch(console.error);
