import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  async create(createShiftDto: CreateShiftDto) {
    const prisma = this.tenantConnection.getTenantClient();

    const existing = await prisma.shift.findFirst({
      where: { name: createShiftDto.name, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('A shift with this name already exists');
    }

    return prisma.shift.create({
      data: createShiftDto,
    });
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.shift.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      orderBy: { startTime: 'asc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active shifts retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(
    page: string | number = 1,
    limit: string | number = 10,
    search?: string,
  ) {
    const prisma = this.tenantConnection.getTenantClient();
    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 10, 1);
    const where: any = { deletedAt: null };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        orderBy: { startTime: 'asc' },
      }),
      prisma.shift.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limitNumber);

    return {
      success: true,
      statusCode: 200,
      message: 'Shifts retrieved successfully',
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
    const prisma = this.tenantConnection.getTenantClient();
    const shift = await prisma.shift.findFirst({
      where: { id, deletedAt: null },
    });
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    const prisma = this.tenantConnection.getTenantClient();
    const shift = await this.findOne(id);

    if (updateShiftDto.name && updateShiftDto.name !== shift.name) {
      const existing = await prisma.shift.findFirst({
        where: { name: updateShiftDto.name, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('A shift with this name already exists');
      }
    }

    return prisma.shift.update({
      where: { id },
      data: updateShiftDto,
    });
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id); // Ensures it exists and is not deleted

    return prisma.shift.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }
}
