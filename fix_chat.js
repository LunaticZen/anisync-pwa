const fs = require('fs');
let content = fs.readFileSync('packages/server/src/chat/chat-service.ts', 'utf8');

content = content.replace(
  '  // Rate limit check\n  const allowed = await checkChatRateLimit(data.userId);\n  if (!allowed) return null;',
  '  // Rate limit check\n  try {\n    const allowed = await checkChatRateLimit(data.userId);\n    if (!allowed) return null;\n  } catch (err) {\n    console.log("[Chat] Rate limit check failed, allowing message");\n  }'
);

fs.writeFileSync('packages/server/src/chat/chat-service.ts', content);
console.log('Fixed chat-service.ts');
