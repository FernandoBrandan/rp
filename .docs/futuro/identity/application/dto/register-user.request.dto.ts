// src/modules/identity/application/dto/register-user.request.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterUserDTO {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
