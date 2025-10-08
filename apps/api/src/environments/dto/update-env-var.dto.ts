import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateEnvVarDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}
