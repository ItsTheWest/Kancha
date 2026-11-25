import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefrescoDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  refreshToken: string;
}
