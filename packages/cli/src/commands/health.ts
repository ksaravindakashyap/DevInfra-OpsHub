import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const healthCommand = new Command('health')
  .description('Health check commands')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .action(async (options) => {
    console.log(chalk.yellow('Health commands:'));
    console.log('  opshub health run --check <id>');
  });

healthCommand
  .command('run')
  .description('Run a health check manually')
  .requiredOption('--check <id>', 'Health check ID')
  .action(async (options) => {
    const spinner = ora('Running health check...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/health-checks/${options.check}/run`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green(`Health check ${options.check} executed successfully`));
      } else {
        spinner.fail('Failed to run health check');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to run health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
