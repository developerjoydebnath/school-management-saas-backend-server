import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolBankAccountDto } from './dto/create-school-bank-account.dto';
import { UpdateSchoolBankAccountDto } from './dto/update-school-bank-account.dto';

type FindAllSchoolBankAccountsQuery = {
  page?: string;
  limit?: string;
  search?: string;
  schoolId?: string;
  accountPurpose?: string;
  isActive?: string;
  isPrimary?: string;
  createdFrom?: string;
  createdTo?: string;
};

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseDateFilter(value?: string, endOfDay = false) {
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

@Injectable()
export class SchoolBankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSchoolBankAccountDto) {
    return this.prisma.schoolBankAccount.create({
      data: createDto,
    });
  }

  async findAll(query: FindAllSchoolBankAccountsQuery = {}) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SchoolBankAccountWhereInput = {
      deletedAt: null,
    };

    if (query.schoolId) {
      where.schoolId = query.schoolId;
    }
    if (query.accountPurpose) {
      where.accountPurpose = {
        in: query.accountPurpose
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.isPrimary !== undefined) {
      where.isPrimary = query.isPrimary === 'true';
    }
    const createdFrom = parseDateFilter(query.createdFrom);
    const createdTo = parseDateFilter(query.createdTo, true);
    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }
    if (query.search) {
      where.OR = [
        { accountLabel: { contains: query.search, mode: 'insensitive' } },
        { accountName: { contains: query.search, mode: 'insensitive' } },
        { accountNo: { contains: query.search, mode: 'insensitive' } },
        { bankName: { contains: query.search, mode: 'insensitive' } },
        { bankBranch: { contains: query.search, mode: 'insensitive' } },
        {
          school: {
            schoolName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.schoolBankAccount.findMany({
        where,
        select: {
          id: true,
          school: {
            select: { schoolName: true },
          },
          accountLabel: true,
          accountPurpose: true,
          bankName: true,
          bankBranch: true,
          accountNo: true,
          bankRoutingNo: true,
          isActive: true,
          isPrimary: true,
        },
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
    if (!uuidRegex.test(id)) {
      throw new NotFoundException('School bank account not found');
    }

    const account = await this.prisma.schoolBankAccount.findFirst({
      where: { id, deletedAt: null },
      include: {
        school: {
          select: {
            id: true,
            schoolName: true,
          },
        },
      },
    });
    if (!account) {
      throw new NotFoundException('School bank account not found');
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
