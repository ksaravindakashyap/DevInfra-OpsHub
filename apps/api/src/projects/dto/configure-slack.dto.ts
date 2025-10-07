import { IsString, IsNotEmpty } from 'class-validator';

export class ConfigureSlackDto {
  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  channel: string;
}
