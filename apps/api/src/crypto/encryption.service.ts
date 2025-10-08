import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  iv: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyBase64 = this.configService.get<string>('ENCRYPTION_KEY_BASE64');
    if (!keyBase64) {
      throw new Error('ENCRYPTION_KEY_BASE64 environment variable is required');
    }
    
    try {
      this.key = Buffer.from(keyBase64, 'base64');
      if (this.key.length !== 32) {
        throw new Error('Encryption key must be 32 bytes (256 bits)');
      }
    } catch (error) {
      throw new Error(`Invalid ENCRYPTION_KEY_BASE64: ${error.message}`);
    }
  }

  encryptString(plaintext: string): EncryptedData {
    if (!plaintext) {
      throw new Error('Plaintext cannot be empty');
    }

    try {
      // Generate random 12-byte IV
      const iv = crypto.randomBytes(12);
      
      // Create cipher
      const cipher = crypto.createCipherGCM(this.algorithm, this.key, iv);
      cipher.setAAD(Buffer.from('opshub-env-var', 'utf8'));
      
      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8');
      ciphertext = Buffer.concat([ciphertext, cipher.final()]);
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      return {
        iv,
        ciphertext,
        tag,
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decryptToString(encryptedData: EncryptedData): string {
    try {
      // Create decipher
      const decipher = crypto.createDecipherGCM(this.algorithm, this.key, encryptedData.iv);
      decipher.setAAD(Buffer.from('opshub-env-var', 'utf8'));
      decipher.setAuthTag(encryptedData.tag);
      
      // Decrypt
      let plaintext = decipher.update(encryptedData.ciphertext);
      plaintext = Buffer.concat([plaintext, decipher.final()]);
      
      return plaintext.toString('utf8');
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Mask sensitive values for logging and audit trails
   * Shows last 4 characters for strings >= 8 chars, otherwise shows "••••"
   */
  maskValue(value: string): string {
    if (!value || value.length === 0) {
      return '••••';
    }
    
    if (value.length < 8) {
      return '••••';
    }
    
    return '••••••' + value.slice(-4);
  }

  /**
   * Validate that a key follows the expected pattern
   */
  validateKey(key: string): boolean {
    // Allow uppercase letters, numbers, and underscores
    const keyPattern = /^[A-Z0-9_]+$/;
    return keyPattern.test(key);
  }
}
