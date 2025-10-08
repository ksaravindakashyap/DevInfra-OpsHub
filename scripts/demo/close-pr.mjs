#!/usr/bin/env node

import { createHash, createHmac } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const repoIndex = args.indexOf('--repo');
const prIndex = args.indexOf('--pr');

if (repoIndex === -1 || prIndex === -1) {
  console.error('Usage: node close-pr.mjs --repo <repo> --pr <number>');
  process.exit(1);
}

const repoFullName = args[repoIndex + 1];
const prNumber = parseInt(args[prIndex + 1]);

if (!repoFullName || !prNumber) {
  console.error('Missing required arguments');
  process.exit(1);
}

// Get API base URL from environment
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

// Create webhook payload
const payload = {
  action: 'closed',
  number: prNumber,
  pull_request: {
    number: prNumber,
    head: {
      ref: 'feature/demo',
      sha: 'abc123def456'
    },
    base: {
      ref: 'main',
      sha: 'def456ghi789'
    },
    merged: false,
    state: 'closed'
  },
  repository: {
    full_name: repoFullName,
    name: repoFullName.split('/')[1],
    owner: {
      login: repoFullName.split('/')[0]
    }
  }
};

// Create webhook signature
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';
const payloadString = JSON.stringify(payload);
const signature = createHmac('sha256', webhookSecret)
  .update(payloadString)
  .digest('hex');

// Send webhook
async function sendWebhook() {
  try {
    console.log(`🗑️ Closing PR #${prNumber} for ${repoFullName}...`);
    
    const response = await fetch(`${API_BASE_URL}/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${signature}`,
        'User-Agent': 'GitHub-Hookshot/test'
      },
      body: payloadString
    });

    if (response.ok) {
      console.log('✅ Webhook sent successfully');
      console.log(`📊 Check the dashboard to see the deployment teardown`);
      console.log(`🔗 Visit: ${process.env.WEB_BASE_URL || 'http://localhost:3000'}`);
    } else {
      const errorText = await response.text();
      console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
      console.error(`Error: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ Failed to send webhook:', error.message);
  }
}

sendWebhook();
