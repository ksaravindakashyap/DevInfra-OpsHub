import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsString()
  @IsNotEmpty()
  repoFullName: string;

  @IsString()
  @IsOptional()
  defaultBranch?: string;
}
