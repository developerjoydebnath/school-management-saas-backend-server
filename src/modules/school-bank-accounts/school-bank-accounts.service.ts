import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolBankAccountDto } from './dto/create-school-bank-account.dto';
import { UpdateSchoolBankAccountDto } from './dto/update-school-bank-account.dto';

@Injectable()
export class SchoolBankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSchoolBankAccountDto) {
    return this.prisma.schoolBankAccount.create({
      data: createDto,
    });
  }

  async findAll(query: any = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null, // Filter out soft-deleted records
    };
    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    const [items, total] = await Promise.all([
      this.prisma.schoolBankAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.schoolBankAccount.count({ where }),
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
    const account = await this.prisma.schoolBankAccount.findFirst({
      where: { id, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException(`SchoolBankAccount with ID ${id} not found`);
    }
    return account;
  }

  async update(id: string, updateDto: UpdateSchoolBankAccountDto) {
    await this.findOne(id);

    return this.prisma.schoolBankAccount.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, adminId?: string) {
    await this.findOne(id);
    return this.prisma.schoolBankAccount.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: adminId || null,
      },
    });
  }

  async updateIsActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.schoolBankAccount.update({
      where: { id },
      data: { isActive },
    });
  }

  async updateIsPrimary(id: string, isPrimary: boolean) {
    const account = await this.findOne(id);

    // If setting to primary, we might want to unset other primary accounts for this school
    if (isPrimary) {
      await this.prisma.schoolBankAccount.updateMany({
        where: { schoolId: account.schoolId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.schoolBankAccount.update({
      where: { id },
      data: { isPrimary },
    });
  }
}
