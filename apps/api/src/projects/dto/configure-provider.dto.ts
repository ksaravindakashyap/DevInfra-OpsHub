import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Provider } from '@prisma/client';

export class ConfigureProviderDto {
  @IsEnum(Provider)
  provider: Provider;

  @IsString()
  @IsOptional()
  vercelProjectId?: string;

  @IsString()
  @IsOptional()
  vercelToken?: string;

  @IsString()
  @IsOptional()
  netlifySiteId?: string;

  @IsString()
  @IsOptional()
  netlifyToken?: string;
}
