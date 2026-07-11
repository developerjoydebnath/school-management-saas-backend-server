import { Module } from '@nestjs/common';
import { StudentsDirectoryModule } from './directory/students.module';

@Module({
  imports: [StudentsDirectoryModule],
  exports: [StudentsDirectoryModule],
})
export class StudentsModule {}
