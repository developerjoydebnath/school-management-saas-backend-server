import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/cores/prisma.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(createSessionDto: CreateSessionDto) {
    const existing = await this.prisma.academicSession.findUnique({
      where: { year: createSessionDto.year },
    });

    if (existing) {
      throw new ConflictException('A session for this year already exists');
    }

    return this.prisma.academicSession.create({
      data: createSessionDto,
    });
  }

  async findAll() {
    const items = await this.prisma.academicSession.findMany({
      orderBy: { year: 'desc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: {
        items,
        meta: {
          page: 1,
          limit: 100,
          total: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto) {
    if (updateSessionDto.year) {
      const existing = await this.prisma.academicSession.findUnique({
        where: { year: updateSessionDto.year },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A session for this year already exists');
      }
    }

    return this.prisma.academicSession.update({
      where: { id },
      data: updateSessionDto,
    });
  }

  async remove(id: string) {
    return await this.prisma.academicSession.delete({
      where: { id },
    });
  }
}
