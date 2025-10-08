#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { loginCommand } from './commands/login.js';
import { demoCommand } from './commands/demo.js';
import { previewCommand } from './commands/preview.js';
import { secretsCommand } from './commands/secrets.js';
import { healthCommand } from './commands/health.js';
import { digestCommand } from './commands/digest.js';

const program = new Command();

// Configuration file path
const configPath = join(homedir(), '.opshubrc.json');

interface Config {
  apiBaseUrl: string;
  cookie?: string;
}

// Load configuration
function loadConfig(): Config {
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error(chalk.red('Failed to load config file:'), error);
      process.exit(1);
    }
  }
  
  return {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  };
}

// Save configuration
function saveConfig(config: Config) {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Failed to save config file:'), error);
    process.exit(1);
  }
}

// Global options
program
  .name('opshub')
  .description('DevInfra OpsHub CLI')
  .version('0.1.0')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .option('--verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.verbose) {
      process.env.VERBOSE = '1';
    }
  });

// Add commands
program.addCommand(loginCommand);
program.addCommand(demoCommand);
program.addCommand(previewCommand);
program.addCommand(secretsCommand);
program.addCommand(healthCommand);
program.addCommand(digestCommand);

// Global error handler
program.configureOutput({
  writeErr: (str) => process.stderr.write(chalk.red(str)),
});

// Parse arguments
program.parse();

export { loadConfig, saveConfig };
