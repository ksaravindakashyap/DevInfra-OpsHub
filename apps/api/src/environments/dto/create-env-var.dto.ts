import { IsString, IsNotEmpty, Matches, IsOptional, IsObject } from 'class-validator';

export class CreateEnvVarDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Key must contain only uppercase letters, numbers, and underscores',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsObject()
  meta?: any;
}
