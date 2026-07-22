import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';

@Injectable()
export class ParentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantConnection: TenantConnectionService,
  ) {}

  private tenantPrisma() {
    return this.tenantConnection.getTenantClient();
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private schoolSchema() {
    const schema = this.tenantConnection.getTenantSchema();
    return schema === 'public' ? 'tenant' : schema;
  }

  private resolveSessionFilter(query: any = {}) {
    if (query.sessionId !== undefined && query.sessionId !== null) {
      const values = String(query.sessionId)
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value && value !== 'all');
      if (values.length > 1) return { in: values };
      if (values.length === 1) return values[0];
      return undefined;
    }
    return this.tenantConnection.getAcademicSessionId?.() || undefined;
  }

  private parentName(parent: any) {
    const profile = parent.profile;
    const fullName = [profile?.firstName, profile?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return fullName || parent.username || parent.phone || 'Parent';
  }

  private parentPhones(parent: any) {
    return Array.from(
      new Set(
        [parent.phone, parent.profile?.phone]
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private normalizeChild(student: any) {
    return {
      id: student.id,
      studentIdNo: student.studentIdNo,
      fullName: student.fullNameEn,
      rollNumber: student.rollNumber,
      status: student.status,
      classId: student.classId,
      className: student.class?.enName || null,
      sectionId: student.sectionId,
      sectionName: student.section?.name || null,
      currentSessionId: student.currentSessionId,
      fatherName: student.fatherName,
      fatherMobile: student.fatherMobile,
    };
  }

  private async childrenForParents(parents: any[], query: any = {}) {
    const phoneToParentIds = new Map<string, Set<string>>();
    const allPhones = new Set<string>();

    for (const parent of parents) {
      for (const phone of this.parentPhones(parent)) {
        allPhones.add(phone);
        const ids = phoneToParentIds.get(phone) || new Set<string>();
        ids.add(parent.id);
        phoneToParentIds.set(phone, ids);
      }
    }

    if (!allPhones.size) return new Map<string, any[]>();

    const phoneList = Array.from(allPhones);
    const where: any = {
      deletedAt: null,
      OR: [
        { fatherMobile: { in: phoneList } },
        { motherMobile: { in: phoneList } },
        { guardianMobile: { in: phoneList } },
      ],
    };
    const sessionFilter = this.resolveSessionFilter(query);
    if (sessionFilter) where.currentSessionId = sessionFilter;

    const students = await this.tenantPrisma().student.findMany({
      where,
      select: {
        id: true,
        studentIdNo: true,
        fullNameEn: true,
        rollNumber: true,
        status: true,
        classId: true,
        sectionId: true,
        currentSessionId: true,
        fatherName: true,
        fatherMobile: true,
        motherMobile: true,
        guardianMobile: true,
        class: { select: { id: true, enName: true, bnName: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { enName: 'asc' } }, { rollNumber: 'asc' }],
    });

    const parentChildren = new Map<string, any[]>();
    for (const student of students) {
      const matchingPhones = [
        student.fatherMobile,
        student.motherMobile,
        student.guardianMobile,
      ]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      const matchedParentIds = new Set<string>();
      for (const phone of matchingPhones) {
        for (const parentId of phoneToParentIds.get(phone) || []) {
          matchedParentIds.add(parentId);
        }
      }

      for (const parentId of matchedParentIds) {
        const children = parentChildren.get(parentId) || [];
        children.push(this.normalizeChild(student));
        parentChildren.set(parentId, children);
      }
    }

    return parentChildren;
  }

  private normalizeParent(parent: any, children: any[] = []) {
    return {
      id: parent.id,
      username: parent.username,
      name: this.parentName(parent),
      firstName: parent.profile?.firstName || null,
      lastName: parent.profile?.lastName || null,
      phone: parent.phone || parent.profile?.phone || null,
      email: parent.email || parent.profile?.email || null,
      isActive: parent.isActive,
      lastLogin: parent.lastLogin,
      createdAt: parent.createdAt,
      childCount: children.length,
      activeChildCount: children.filter(
        (child) => String(child.status || '').toLowerCase() === 'active',
      ).length,
      childrenPreview: children.slice(0, 3),
      children,
    };
  }

  private buildParentWhere(query: any = {}) {
    const where: any = {
      role: 'PARENT',
      schemaName: this.schoolSchema(),
      deletedAt: null,
    };

    if (query.status) {
      const statuses = String(query.status)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (statuses.includes('active') && !statuses.includes('inactive')) {
        where.isActive = true;
      }
      if (statuses.includes('inactive') && !statuses.includes('active')) {
        where.isActive = false;
      }
    }

    if (query.search) {
      const search = String(query.search).trim();
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        {
          profile: {
            is: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    return where;
  }

  async findAll(query: any = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where = this.buildParentWhere(query);

    const [parents, total] = await Promise.all([
      this.prismaService.client.user.findMany({
        where,
        include: { profile: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prismaService.client.user.count({ where }),
    ]);

    const childrenByParent = await this.childrenForParents(parents, query);
    const items = parents.map((parent) =>
      this.normalizeParent(parent, childrenByParent.get(parent.id) || []),
    );
    const totalPages = Math.ceil(total / limit);

    return this.response('Parents retrieved successfully', {
      items,
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

  async summary(query: any = {}) {
    const where = this.buildParentWhere(query);
    const parents = await this.prismaService.client.user.findMany({
      where,
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    const childrenByParent = await this.childrenForParents(parents, query);
    const activeParents = parents.filter((parent) => parent.isActive).length;
    const childIds = new Set<string>();
    for (const children of childrenByParent.values()) {
      for (const child of children) childIds.add(child.id);
    }

    return this.response('Parent summary retrieved successfully', {
      totalParents: parents.length,
      activeParents,
      inactiveParents: parents.length - activeParents,
      linkedStudents: childIds.size,
    });
  }

  async findOne(id: string, query: any = {}) {
    const parent = await this.prismaService.client.user.findFirst({
      where: {
        id,
        role: 'PARENT',
        schemaName: this.schoolSchema(),
        deletedAt: null,
      },
      include: { profile: true },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    const childrenByParent = await this.childrenForParents([parent], query);
    return this.response(
      'Parent retrieved successfully',
      this.normalizeParent(parent, childrenByParent.get(parent.id) || []),
    );
  }

  async updatePortalAccess(id: string, isActive: boolean) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    await this.findOne(id);
    const updated = await this.prismaService.client.user.update({
      where: { id },
      data: { isActive },
      include: { profile: true },
    });
    const childrenByParent = await this.childrenForParents([updated]);
    return this.response(
      isActive
        ? 'Parent portal access enabled successfully'
        : 'Parent portal access disabled successfully',
      this.normalizeParent(updated, childrenByParent.get(updated.id) || []),
    );
  }
}
