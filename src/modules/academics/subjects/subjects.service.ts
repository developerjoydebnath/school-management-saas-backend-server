import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import {
  CreateSubjectDto,
  SubjectMarkDivisionEnum,
  UpdateSubjectDto,
} from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private getInclude() {
    return {
      classes: {
        include: {
          class: true,
        },
        orderBy: { class: { enName: 'asc' as const } },
      },
    };
  }

  private getListSelect() {
    return {
      id: true,
      enName: true,
      bnName: true,
      code: true,
      type: true,
      group: true,
      fullMarks: true,
      passMarks: true,
      markDivision: true,
      status: true,
      classes: {
        select: {
          class: {
            select: {
              id: true,
              enName: true,
              bnName: true,
            },
          },
        },
        orderBy: { class: { enName: 'asc' as const } },
      },
    };
  }

  private getActiveListSelect() {
    return {
      id: true,
      enName: true,
      bnName: true,
      code: true,
      status: true,
    };
  }

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private normalizeCode(code?: string) {
    const trimmed = code?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeGroup(group?: string) {
    const trimmed = group?.trim();
    return trimmed ? trimmed.toLowerCase() : null;
  }

  private mapSubject(subject: any) {
    const classItems =
      subject.classes?.map((item: any) => item.class).filter(Boolean) || [];

    return {
      ...subject,
      classIds: classItems.map((item: any) => item.id),
      classes: classItems,
    };
  }

  private async assertUniqueCode(code?: string | null, currentId?: string) {
    if (!code) return;
    const prisma = this.tenantConnection.getTenantClient();
    const existing = await prisma.subject.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A subject with this code already exists');
    }
  }

  private async assertClassesExist(classIds?: string[]) {
    if (!classIds?.length) return;
    const prisma = this.tenantConnection.getTenantClient();
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds }, deletedAt: null },
      select: { id: true },
    });
    if (classes.length !== new Set(classIds).size) {
      throw new BadRequestException(
        'One or more assigned classes were not found',
      );
    }
  }

  private mapData(dto: CreateSubjectDto | UpdateSubjectDto) {
    const hasMcq =
      dto.markDivision === SubjectMarkDivisionEnum.WRITTEN_MCQ ||
      dto.markDivision === SubjectMarkDivisionEnum.WRITTEN_MCQ_PRACTICAL;
    const hasPractical =
      dto.markDivision === SubjectMarkDivisionEnum.WRITTEN_MCQ_PRACTICAL;

    return {
      ...(dto.enName !== undefined ? { enName: dto.enName } : {}),
      ...(dto.bnName !== undefined ? { bnName: dto.bnName || null } : {}),
      ...(dto.code !== undefined ? { code: this.normalizeCode(dto.code) } : {}),
      ...(dto.boardCode !== undefined
        ? { boardCode: this.normalizeCode(dto.boardCode) }
        : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.group !== undefined
        ? { group: this.normalizeGroup(dto.group) }
        : {}),
      ...(dto.paperCount !== undefined ? { paperCount: dto.paperCount } : {}),
      ...(dto.fullMarks !== undefined ? { fullMarks: dto.fullMarks } : {}),
      ...(dto.passMarks !== undefined ? { passMarks: dto.passMarks } : {}),
      ...(dto.markDivision !== undefined
        ? { markDivision: dto.markDivision }
        : {}),
      ...(dto.writtenMarks !== undefined
        ? { writtenMarks: dto.writtenMarks }
        : {}),
      ...(dto.writtenPassMarks !== undefined
        ? { writtenPassMarks: dto.writtenPassMarks }
        : {}),
      ...(dto.mcqMarks !== undefined ? { mcqMarks: dto.mcqMarks } : {}),
      ...(dto.mcqPassMarks !== undefined
        ? { mcqPassMarks: dto.mcqPassMarks }
        : {}),
      ...(dto.practicalMarks !== undefined
        ? { practicalMarks: dto.practicalMarks }
        : {}),
      ...(dto.practicalPassMarks !== undefined
        ? { practicalPassMarks: dto.practicalPassMarks }
        : {}),
      ...(dto.markDivision !== undefined && !hasMcq
        ? { mcqMarks: 0, mcqPassMarks: 0 }
        : {}),
      ...(dto.markDivision !== undefined && !hasPractical
        ? { practicalMarks: 0, practicalPassMarks: 0 }
        : {}),
      ...(dto.theoryMarks !== undefined
        ? { theoryMarks: dto.theoryMarks }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.status !== undefined
        ? { status: this.normalizeStatus(dto.status) }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description || null }
        : {}),
    };
  }

  private validateMarkBreakdown(
    dto: CreateSubjectDto | UpdateSubjectDto,
    existing?: any,
  ) {
    const markDivision =
      dto.markDivision ?? existing?.markDivision ?? 'WRITTEN';
    const fullMarks = dto.fullMarks ?? existing?.fullMarks ?? 100;
    const passMarks = dto.passMarks ?? existing?.passMarks ?? 33;
    const writtenMarks =
      dto.writtenMarks ??
      existing?.writtenMarks ??
      dto.theoryMarks ??
      existing?.theoryMarks ??
      fullMarks;
    const writtenPassMarks =
      dto.writtenPassMarks ?? existing?.writtenPassMarks ?? passMarks;
    const hasMcq =
      markDivision === 'WRITTEN_MCQ' ||
      markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const hasPractical = markDivision === 'WRITTEN_MCQ_PRACTICAL';
    const mcqMarks = hasMcq ? (dto.mcqMarks ?? existing?.mcqMarks ?? 0) : 0;
    const mcqPassMarks = hasMcq
      ? (dto.mcqPassMarks ?? existing?.mcqPassMarks ?? 0)
      : 0;
    const practicalMarks = hasPractical
      ? (dto.practicalMarks ?? existing?.practicalMarks ?? 0)
      : 0;
    const practicalPassMarks = hasPractical
      ? (dto.practicalPassMarks ?? existing?.practicalPassMarks ?? 0)
      : 0;
    const totalPartMarks =
      writtenMarks +
      (hasMcq ? mcqMarks : 0) +
      (hasPractical ? practicalMarks : 0);
    const totalPartPassMarks =
      writtenPassMarks +
      (hasMcq ? mcqPassMarks : 0) +
      (hasPractical ? practicalPassMarks : 0);

    if (writtenMarks <= 0) {
      throw new BadRequestException('Written marks must be greater than zero');
    }
    if (writtenPassMarks > writtenMarks) {
      throw new BadRequestException(
        'Written pass marks cannot exceed written marks',
      );
    }
    if (hasMcq && mcqMarks <= 0) {
      throw new BadRequestException(
        'MCQ marks are required for this mark division',
      );
    }
    if (hasMcq && mcqPassMarks > mcqMarks) {
      throw new BadRequestException('MCQ pass marks cannot exceed MCQ marks');
    }
    if (hasPractical && practicalMarks <= 0) {
      throw new BadRequestException(
        'Practical marks are required for this mark division',
      );
    }
    if (hasPractical && practicalPassMarks > practicalMarks) {
      throw new BadRequestException(
        'Practical pass marks cannot exceed practical marks',
      );
    }
    if (totalPartMarks !== fullMarks) {
      throw new BadRequestException(
        'Written, MCQ, and practical marks must equal total full marks',
      );
    }
    if (totalPartPassMarks !== passMarks) {
      throw new BadRequestException(
        'Written, MCQ, and practical pass marks must equal total pass marks',
      );
    }
  }

  private hasMarkBreakdownChanges(dto: UpdateSubjectDto) {
    return [
      'fullMarks',
      'passMarks',
      'markDivision',
      'writtenMarks',
      'writtenPassMarks',
      'mcqMarks',
      'mcqPassMarks',
      'practicalMarks',
      'practicalPassMarks',
      'theoryMarks',
    ].some((key) => dto[key as keyof UpdateSubjectDto] !== undefined);
  }

  async create(dto: CreateSubjectDto) {
    const prisma = this.tenantConnection.getTenantClient();
    const code = this.normalizeCode(dto.code);

    await Promise.all([
      this.assertUniqueCode(code),
      this.assertClassesExist(dto.classIds),
    ]);
    this.validateMarkBreakdown(dto);

    const data: any = {
      enName: dto.enName,
      bnName: dto.bnName || null,
      code,
      boardCode: this.normalizeCode(dto.boardCode),
      type: dto.type || 'MANDATORY',
      group: this.normalizeGroup(dto.group),
      paperCount: dto.paperCount ?? 1,
      fullMarks: dto.fullMarks ?? 100,
      passMarks: dto.passMarks ?? 33,
      markDivision: dto.markDivision ?? 'WRITTEN',
      writtenMarks: dto.writtenMarks ?? dto.theoryMarks ?? dto.fullMarks ?? 100,
      writtenPassMarks: dto.writtenPassMarks ?? dto.passMarks ?? 33,
      mcqMarks: dto.mcqMarks ?? 0,
      mcqPassMarks: dto.mcqPassMarks ?? 0,
      practicalMarks: dto.practicalMarks ?? null,
      practicalPassMarks: dto.practicalPassMarks ?? 0,
      theoryMarks: dto.theoryMarks ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status: this.normalizeStatus(dto.status),
      description: dto.description || null,
      ...(dto.classIds?.length
        ? {
            classes: {
              create: dto.classIds.map((classId) => ({ classId })),
            },
          }
        : {}),
    };

    const subject = await prisma.subject.create({
      data,
      include: this.getInclude(),
    });

    return {
      success: true,
      statusCode: 201,
      message: 'Subject created successfully',
      data: this.mapSubject(subject),
      meta: null,
    };
  }

  async findActiveList(query: { classId?: string } = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const classIds = String(query.classId || '')
      .split(',')
      .map((classId) => classId.trim())
      .filter(Boolean);

    const items = await prisma.subject.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(classIds.length
          ? { classes: { some: { classId: { in: classIds } } } }
          : {}),
      },
      select: this.getActiveListSelect(),
      orderBy: [{ sortOrder: 'asc' }, { enName: 'asc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active subjects retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };
    const andFilters: any[] = [];

    if (query.search) {
      andFilters.push({
        OR: [
          { enName: { contains: query.search, mode: 'insensitive' } },
          { bnName: { contains: query.search, mode: 'insensitive' } },
          { code: { contains: query.search, mode: 'insensitive' } },
          { boardCode: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.status) {
      where.status = {
        in: String(query.status)
          .split(',')
          .map((status) => status.trim().toUpperCase())
          .filter(Boolean),
      };
    }

    if (query.type) {
      where.type = {
        in: String(query.type)
          .split(',')
          .map((type) => type.trim().toUpperCase())
          .filter(Boolean),
      };
    }

    if (query.group) {
      where.group = {
        in: String(query.group)
          .split(',')
          .map((group) => group.trim().toLowerCase())
          .filter(Boolean),
      };
    }

    if (query.classId) {
      const classIds = String(query.classId)
        .split(',')
        .map((classId) => classId.trim())
        .filter(Boolean);
      andFilters.push({
        classes: { some: { classId: { in: classIds } } },
      });
    }

    if (andFilters.length) {
      where.AND = andFilters;
    }

    const [items, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ sortOrder: 'asc' }, { enName: 'asc' }],
      }),
      prisma.subject.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Subjects retrieved successfully',
      data: {
        items: items.map((item) => this.mapSubject(item)),
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
    const prisma = this.tenantConnection.getTenantClient();
    const subject = await prisma.subject.findFirst({
      where: { id, deletedAt: null },
      include: this.getInclude(),
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return this.mapSubject(subject);
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const prisma = this.tenantConnection.getTenantClient();
    const existing = await this.findOne(id);

    if (dto.code !== undefined) {
      await this.assertUniqueCode(this.normalizeCode(dto.code), id);
    }
    if (dto.classIds !== undefined) {
      await this.assertClassesExist(dto.classIds);
    }
    if (this.hasMarkBreakdownChanges(dto)) {
      this.validateMarkBreakdown(dto, existing);
    }

    const subject = await prisma.$transaction(async (tx) => {
      if (dto.classIds !== undefined) {
        await tx.subjectClass.deleteMany({ where: { subjectId: id } });
      }

      return tx.subject.update({
        where: { id },
        data: {
          ...(this.mapData(dto) as any),
          ...(dto.classIds !== undefined && dto.classIds.length
            ? {
                classes: {
                  create: dto.classIds.map((classId) => ({ classId })),
                },
              }
            : {}),
        },
        include: this.getInclude(),
      });
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Subject updated successfully',
      data: this.mapSubject(subject),
      meta: null,
    };
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    return prisma.$transaction(async (tx) => {
      await tx.subjectClass.deleteMany({ where: { subjectId: id } });
      return tx.subject.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      });
    });
  }
}
