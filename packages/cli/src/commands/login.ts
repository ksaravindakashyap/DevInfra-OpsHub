import { Command } from 'commander';
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import chalk from 'chalk';
import ora from 'ora';

axiosCookieJarSupport(axios);

export const loginCommand = new Command('login')
  .description('Login to DevInfra OpsHub')
  .option('--email <email>', 'Email address for test login')
  .action(async (options) => {
    const spinner = ora('Logging in...').start();
    
    try {
      if (!options.email) {
        spinner.fail('Email is required for test login');
        process.exit(1);
      }

      const jar = new CookieJar();
      const client = axios.create({
        jar,
        withCredentials: true,
      });

      // Test login endpoint
      const response = await client.post(`${process.env.API_BASE_URL || 'http://localhost:4000'}/test/login-as`, {
        email: options.email,
      });

      if (response.status === 200) {
        // Extract cookie from jar
        const cookies = await jar.getCookies(process.env.API_BASE_URL || 'http://localhost:4000');
        const authCookie = cookies.find(cookie => cookie.key === 'opshub_token');
        
        if (authCookie) {
          // Save config
          const { saveConfig } = await import('../index.js');
          saveConfig({
            apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
            cookie: authCookie.value,
          });
          
          spinner.succeed(chalk.green(`Logged in as ${options.email}`));
        } else {
          spinner.fail('No authentication cookie received');
          process.exit(1);
        }
      } else {
        spinner.fail('Login failed');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });
