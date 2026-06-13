import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'super_admin@school.com' })
  email: string;

  @ApiProperty({ example: 'password123' })
  password: string;

  @ApiProperty({ example: 'Admin User', required: false })
  name?: string;

  @ApiProperty({
    example: 'SUPER_ADMIN',
    required: false,
    enum: [
      'DEVELOPER',
      'SUPER_ADMIN',
      'SCHOOL_ADMIN',
      'SCHOOL_STAFF',
      'TEACHER',
      'STUDENT',
      'PARENT',
      'USER',
    ],
  })
  role?: string;
}
