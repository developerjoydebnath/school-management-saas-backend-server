import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'admin@school.com' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'The 6-digit OTP sent to email',
  })
  otp: string;

  @ApiProperty({ example: 'newSecurePassword123' })
  newPassword: string;
}
