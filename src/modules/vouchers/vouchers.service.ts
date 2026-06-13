import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateVoucherDto, adminId?: string) {
    const existing = await this.prisma.voucher.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Voucher code "${createDto.code}" already exists.`,
      );
    }

    return this.prisma.voucher.create({
      data: {
        ...createDto,
        createdBy: adminId || null,
      },
    });
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [items, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return voucher;
  }

  async update(id: string, updateDto: UpdateVoucherDto) {
    await this.findOne(id); // Ensure it exists

    if (updateDto.code) {
      const existing = await this.prisma.voucher.findUnique({
        where: { code: updateDto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Voucher code "${updateDto.code}" is already in use.`,
        );
      }
    }

    return this.prisma.voucher.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.voucher.delete({
      where: { id },
    });
  }

  async updateIsActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.voucher.update({
      where: { id },
      data: { isActive },
    });
  }
}
