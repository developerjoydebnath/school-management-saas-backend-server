import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { UpdateStudentDto, UpdateStudentStatusDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private listSelect() {
    return {
      id: true,
      studentIdNo: true,
      fullNameEn: true,
      fullNameBn: true,
      rollNumber: true,
      gender: true,
      fatherName: true,
      fatherMobile: true,
      status: true,
      class: { select: { id: true, enName: true, bnName: true } },
      section: { select: { id: true, name: true } },
      currentSessionId: true,
    };
  }

  private detailsInclude() {
    return {
      class: true,
      section: true,
      admissionApplication: {
        select: {
          id: true,
          applicationNo: true,
          status: true,
          source: true,
          approvedAt: true,
        },
      },
      presentDivision: true,
      presentDistrict: true,
      presentUpazila: true,
      permanentDivision: true,
      permanentDistrict: true,
      permanentUpazila: true,
    };
  }

  private normalizeStudent(item: any) {
    if (!item) return item;
    return {
      ...item,
      fullName: item.fullNameEn,
      studentId: item.studentIdNo,
      roll: item.rollNumber,
      class: item.class?.id || item.classId,
      section: item.section?.name || item.sectionId,
      mobile: item.fatherMobile,
      className: item.class?.enName || null,
      sectionName: item.section?.name || null,
      contact: item.fatherMobile,
    };
  }

  private buildWhere(query: any = {}) {
    const where: any = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { studentIdNo: { contains: query.search, mode: 'insensitive' } },
        { fullNameEn: { contains: query.search, mode: 'insensitive' } },
        { fatherName: { contains: query.search, mode: 'insensitive' } },
        { fatherMobile: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.sessionId) where.currentSessionId = query.sessionId;
    if (query.classId) where.classId = query.classId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.gender) {
      where.gender = {
        in: String(query.gender)
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      };
    }
    if (query.status) {
      where.status = {
        in: String(query.status)
          .split(',')
          .map((value) => value.trim().toLowerCase())
          .filter(Boolean),
      };
    }
    return where;
  }

  async findAll(query: any = {}) {
    const prisma = this.prisma();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: this.listSelect(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.student.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);

    return this.response('Students retrieved successfully', {
      items: items.map((item) => this.normalizeStudent(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  }

  async classesSummary(query: any = {}) {
    const prisma = this.prisma();
    const where = this.buildWhere(query);
    delete where.classId;
    const [classes, groupedCounts] = await Promise.all([
      prisma.class.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          enName: true,
          bnName: true,
          sections: {
            where: { deletedAt: null },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { enName: 'asc' },
      }),
      prisma.student.groupBy({
        by: ['classId', 'sectionId'],
        where,
        _count: { _all: true },
      }),
    ]);

    const countByClass = new Map<string, number>();
    const countBySection = new Map<string, number>();
    groupedCounts.forEach((item) => {
      countByClass.set(
        item.classId,
        (countByClass.get(item.classId) || 0) + item._count._all,
      );
      if (item.sectionId) {
        countBySection.set(item.sectionId, item._count._all);
      }
    });

    return this.response(
      'Student class summary retrieved successfully',
      classes.map((item) => ({
        id: item.id,
        name: item.enName,
        bnName: item.bnName,
        totalStudents: countByClass.get(item.id) || 0,
        sections: item.sections.map((section) => ({
          id: section.id,
          name: section.name,
          count: countBySection.get(section.id) || 0,
        })),
      })),
    );
  }

  async byClass(classId: string, query: any = {}) {
    return this.findAll({ ...query, classId });
  }

  async findOne(id: string) {
    const student = await this.prisma().student.findFirst({
      where: { id, deletedAt: null },
      include: this.detailsInclude(),
    });
    if (!student) throw new NotFoundException('Student not found');
    return this.response(
      'Student retrieved successfully',
      this.normalizeStudent(student),
    );
  }

  async update(id: string, dto: UpdateStudentDto, userId?: string) {
    await this.findOne(id);
    const updated = await this.prisma().student.update({
      where: { id },
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
        transferDate: dto.transferDate ? new Date(dto.transferDate) : undefined,
        updatedBy: userId || null,
      },
      include: this.detailsInclude(),
    });
    return this.response('Student updated successfully', this.normalizeStudent(updated));
  }

  async updateStatus(id: string, dto: UpdateStudentStatusDto, userId?: string) {
    if (!dto.status) throw new BadRequestException('Status is required');
    await this.findOne(id);
    const updated = await this.prisma().student.update({
      where: { id },
      data: {
        status: dto.status.toLowerCase(),
        statusReason: dto.statusReason || null,
        statusChangedAt: new Date(),
        updatedBy: userId || null,
      },
      include: this.detailsInclude(),
    });
    return this.response('Student status updated successfully', this.normalizeStudent(updated));
  }

  async remove(id: string, userId?: string) {
    await this.findOne(id);
    await this.prisma().student.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return this.response('Student deleted successfully', null);
  }

  async options(query: any = {}) {
    const students = await this.prisma().student.findMany({
      where: this.buildWhere(query),
      select: { id: true, studentIdNo: true, fullNameEn: true },
      orderBy: [{ fullNameEn: 'asc' }, { id: 'asc' }],
      take: Math.min(Number(query.limit) || 50, 100),
    });
    return this.response(
      'Student options retrieved successfully',
      students.map((student) => ({
        label: `${student.fullNameEn} - ${student.studentIdNo}`,
        value: student.id,
      })),
    );
  }
}
