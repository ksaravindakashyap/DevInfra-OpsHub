import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateSecretPolicyDto {
  @IsString()
  @IsNotEmpty()
  keyPattern: string;

  @IsNumber()
  @Min(0)
  rotateEveryDays: number;
}
