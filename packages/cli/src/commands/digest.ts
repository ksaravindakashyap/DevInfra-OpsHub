import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const digestCommand = new Command('digest')
  .description('Digest commands')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .action(async (options) => {
    console.log(chalk.yellow('Digest commands:'));
    console.log('  opshub digest weekly --project <id>');
  });

digestCommand
  .command('weekly')
  .description('Send weekly digest for a project')
  .requiredOption('--project <id>', 'Project ID')
  .action(async (options) => {
    const spinner = ora('Sending weekly digest...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/projects/${options.project}/metrics/deploy/weekly-digest`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green(`Weekly digest sent for project ${options.project}`));
      } else {
        spinner.fail('Failed to send weekly digest');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to send weekly digest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
