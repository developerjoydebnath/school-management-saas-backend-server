import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  private parseCreatedDateFilter(value?: string, endOfDay = false) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid created date filter: ${value}`);
    }
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }

  async create(createDto: CreateVoucherDto, adminId?: string) {
    const existing = await this.prisma.voucher.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Voucher code "${createDto.code}" already exists.`,
      );
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        ...createDto,
        createdBy: adminId || null,
      },
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Voucher created successfully',
      data: voucher,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.isActive !== undefined && query.isActive !== '') {
      const activeArr = query.isActive.split(',');
      if (activeArr.length === 1) {
        where.isActive = activeArr[0] === 'true';
      }
    }

    if (query.discountType) {
      const discountTypeArr = query.discountType.split(',');
      where.discountType = { in: discountTypeArr };
    }
    const createdFrom = this.parseCreatedDateFilter(query.createdFrom);
    const createdTo = this.parseCreatedDateFilter(query.createdTo, true);
    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
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

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Vouchers retrieved successfully',
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id },
    });
    if (!voucher) {
      throw new NotFoundException(`Voucher with ID ${id} not found`);
    }
    return {
      success: true,
      statusCode: 200,
      message: 'Voucher retrieved successfully',
      data: voucher,
      meta: null,
    };
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

    const updated = await this.prisma.voucher.update({
      where: { id },
      data: updateDto,
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Voucher updated successfully',
      data: updated,
      meta: null,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await softDelete(this.prisma.raw.voucher, id);
    return {
      success: true,
      statusCode: 200,
      message: 'Voucher deleted successfully',
      data: null,
      meta: null,
    };
  }

  async updateIsActive(id: string, isActive: boolean) {
    await this.findOne(id);
    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { isActive },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Voucher status updated successfully',
      data: updated,
      meta: null,
    };
  }
}
