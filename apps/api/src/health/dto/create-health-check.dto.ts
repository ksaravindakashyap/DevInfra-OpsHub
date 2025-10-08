import { IsString, IsNotEmpty, IsUrl, IsOptional, IsInt, Min, Max, IsBoolean, IsObject, ValidateIf } from 'class-validator';

export class CreateHealthCheckDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedMin?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedMax?: number;

  @IsOptional()
  @IsString()
  responseContains?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(3600)
  intervalSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(15000)
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  failureThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  recoveryThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  alertCooldownMin?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  environmentId?: string;
}
