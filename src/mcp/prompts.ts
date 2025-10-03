/**
 * MCP Prompts Definitions for FINAM Trade API
 *
 * Defines prompt templates for LLM interactions.
 */

import type { Prompt, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';

// Define available prompts
export function createPrompts(defaultAccountId?: string): Prompt[] {
  return [
    {
      name: 'trading-agent',
      description: 'Introduces you as a trading agent helping with brokerage account operations',
      arguments: [
        {
          name: 'account_id',
          description: defaultAccountId
            ? `Account ID to work with (optional, default: ${defaultAccountId})`
            : 'Account ID to work with',
          required: !defaultAccountId,
        },
      ],
    },
    {
      name: 'how-much',
      description: 'Classic question about quantity or weight',
      arguments: [],
    },
  ];
}

// Handle prompt retrieval
export function handleGetPrompt(
  name: string,
  args?: Record<string, string>,
  defaultAccountId?: string
): GetPromptResult {
  if (name === 'trading-agent') {
    const accountId = args?.account_id || defaultAccountId || '{account_id}';
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `/ :@CB>9 B>@3>2K9 035=B, ?><>30N B>@3>20BL ?> 1@>:5@A:><C AG5BC ${accountId}`,
          },
        },
      ],
    };
  }

  if (name === 'how-much') {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: '!:>;L:> 25H0BL 3@0<<>2',
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}
