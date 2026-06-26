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

  async findActiveList() {
    const items = await this.prisma.academicSession.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { year: 'desc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active sessions retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(page: string | number = 1, limit: string | number = 10, search?: string) {
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            ...(Number.isNaN(Number(search))
              ? []
              : [{ year: Number(search) }]),
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.academicSession.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { year: 'desc' },
      }),
      this.prisma.academicSession.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    return {
      success: true,
      statusCode: 200,
      message: 'Sessions retrieved successfully',
      data: {
        items,
        meta: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages,
          hasNextPage: pageNumber < totalPages,
          hasPreviousPage: pageNumber > 1,
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
