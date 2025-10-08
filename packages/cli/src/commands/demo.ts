import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

export const demoCommand = new Command('demo')
  .description('Demo mode commands')
  .option('--api <url>', 'API base URL', process.env.API_BASE_URL || 'http://localhost:4000')
  .action(async (options) => {
    console.log(chalk.yellow('Demo mode commands:'));
    console.log('  opshub demo reset     - Reset demo data');
    console.log('  opshub demo open-pr   - Open demo PR');
    console.log('  opshub demo close-pr  - Close demo PR');
    console.log('  opshub demo degrade   - Degrade health check');
    console.log('  opshub demo recover   - Recover health check');
  });

demoCommand
  .command('reset')
  .description('Reset demo data')
  .action(async () => {
    const spinner = ora('Resetting demo data...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/demo/reset`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green('Demo data reset successfully'));
      } else {
        spinner.fail('Failed to reset demo data');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to reset demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

demoCommand
  .command('open-pr')
  .description('Open demo pull request')
  .action(async () => {
    const spinner = ora('Opening demo PR...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/demo/open-pr`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green('Demo PR opened successfully'));
      } else {
        spinner.fail('Failed to open demo PR');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to open demo PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

demoCommand
  .command('close-pr')
  .description('Close demo pull request')
  .action(async () => {
    const spinner = ora('Closing demo PR...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/demo/close-pr`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green('Demo PR closed successfully'));
      } else {
        spinner.fail('Failed to close demo PR');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to close demo PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

demoCommand
  .command('degrade')
  .description('Degrade health check for demo')
  .action(async () => {
    const spinner = ora('Degrading health check...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/demo/degrade`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green('Health check degraded for demo'));
      } else {
        spinner.fail('Failed to degrade health check');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to degrade health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

demoCommand
  .command('recover')
  .description('Recover health check for demo')
  .action(async () => {
    const spinner = ora('Recovering health check...').start();
    
    try {
      const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/demo/recover`);
      
      if (response.status === 200) {
        spinner.succeed(chalk.green('Health check recovered for demo'));
      } else {
        spinner.fail('Failed to recover health check');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Failed to recover health check: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
