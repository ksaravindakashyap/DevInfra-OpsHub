import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const previewCommand = new Command('preview')
  .description('Preview deployment commands')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .action(async (options) => {
    console.log(chalk.yellow('Preview commands:'));
    console.log('  opshub preview open --repo <owner/repo> --pr <number> --branch <branch>');
    console.log('  opshub preview close --repo <owner/repo> --pr <number>');
  });

previewCommand
  .command('open')
  .description('Open a preview deployment')
  .requiredOption('--repo <repo>', 'Repository (owner/repo)')
  .requiredOption('--pr <number>', 'Pull request number')
  .requiredOption('--branch <branch>', 'Branch name')
  .action(async (options) => {
    const spinner = ora('Opening preview deployment...').start();
    
    try {
      // Simulate webhook payload
      const payload = {
        action: 'opened',
        number: parseInt(options.pr),
        pull_request: {
          number: parseInt(options.pr),
          head: { ref: options.branch, sha: 'abc123def456' },
          base: { ref: 'main', sha: 'def456ghi789' },
          merged: false,
          state: 'open',
        },
        repository: {
          full_name: options.repo,
          name: options.repo.split('/')[1],
          owner: { login: options.repo.split('/')[0] },
        },
      };

      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/webhooks/github`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=test-signature',
        },
      });
      
      if (response.status === 200) {
        spinner.succeed(chalk.green(`Preview deployment opened for ${options.repo}#${options.pr}`));
      } else {
        spinner.fail('Failed to open preview deployment');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to open preview deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

previewCommand
  .command('close')
  .description('Close a preview deployment')
  .requiredOption('--repo <repo>', 'Repository (owner/repo)')
  .requiredOption('--pr <number>', 'Pull request number')
  .action(async (options) => {
    const spinner = ora('Closing preview deployment...').start();
    
    try {
      // Simulate webhook payload
      const payload = {
        action: 'closed',
        number: parseInt(options.pr),
        pull_request: {
          number: parseInt(options.pr),
          head: { ref: 'feature/demo', sha: 'abc123def456' },
          base: { ref: 'main', sha: 'def456ghi789' },
          merged: false,
          state: 'closed',
        },
        repository: {
          full_name: options.repo,
          name: options.repo.split('/')[1],
          owner: { login: options.repo.split('/')[0] },
        },
      };

      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/webhooks/github`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=test-signature',
        },
      });
      
      if (response.status === 200) {
        spinner.succeed(chalk.green(`Preview deployment closed for ${options.repo}#${options.pr}`));
      } else {
        spinner.fail('Failed to close preview deployment');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to close preview deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
