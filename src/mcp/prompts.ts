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
            text: `I am a trading agent. I help trade on brokerage account ${accountId}`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}
