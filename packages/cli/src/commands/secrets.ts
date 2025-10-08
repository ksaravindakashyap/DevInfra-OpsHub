import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const secretsCommand = new Command('secrets')
  .description('Secret management commands')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .action(async (options) => {
    console.log(chalk.yellow('Secret commands:'));
    console.log('  opshub secrets rotate --project <id>');
  });

secretsCommand
  .command('rotate')
  .description('Rotate secrets for a project')
  .requiredOption('--project <id>', 'Project ID')
  .action(async (options) => {
    const spinner = ora('Rotating secrets...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/projects/${options.project}/rotate`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green(`Secrets rotated for project ${options.project}`));
      } else {
        spinner.fail('Failed to rotate secrets');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to rotate secrets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
