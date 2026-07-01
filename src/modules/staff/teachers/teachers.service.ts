import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto/teacher.dto';

@Injectable()
export class TeachersService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private prisma: PrismaService,
  ) {}

  private mapData(dto: CreateTeacherDto | UpdateTeacherDto) {
    const data: any = {};
    const fields = [
      'employeeCode',
      'fullName',
      'fullNameBn',
      'fatherName',
      'motherName',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'religion',
      'nationality',
      'maritalStatus',
      'photoMediaId',
      'photoUrl',
      'photoPlaceholder',
      'nid',
      'birthCertificateNo',
      'passportNo',
      'phone',
      'alternatePhone',
      'email',
      'divisionId',
      'districtId',
      'upazilaId',
      'postCode',
      'address',
      'permanentAddress',
      'latitude',
      'longitude',
      'designationId',
      'departmentId',
      'isHeadOfInstitution',
      'employmentType',
      'status',
      'joiningDate',
      'confirmationDate',
      'resignationDate',
      'retirementDate',
      'exitReason',
      'isMpoListed',
      'mpoIndexNo',
      'mpoIncludedAt',
      'mpoCategory',
      'ntrcaRegistered',
      'ntrcaRegNo',
      'ntrcaRegYear',
      'ntrcaCertificateMediaId',
      'ntrcaCertificateUrl',
      'ntrcaSubject',
      'banbeisTeacherId',
      'highestQualification',
      'qualificationDetails',
      'professionalQualifications',
      'primarySubjectId',
      'specializationSubjects',
      'salaryGrade',
      'basicSalary',
      'bankAccountNo',
      'bankName',
      'bankBranch',
      'mobileWalletNo',
      'mobileWalletType',
      'globalPersonId',
      'transferredFrom',
      'transferredTo',
      'transferDate',
      'yearsOfExperience',
      'previousInstitution',
      'documents',
      'isHafiz',
      'qiratGrade',
      'joiningSessionId',
      'notes',
    ];

    fields.forEach((field) => {
      if ((dto as any)[field] !== undefined) {
        data[field] = (dto as any)[field];
      }
    });

    return data;
  }

  private getListSelect() {
    return {
      id: true,
      employeeCode: true,
      fullName: true,
      phone: true,
      status: true,
      designation: {
        select: {
          id: true,
          name: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private getShortListSelect() {
    return {
      id: true,
      fullName: true,
      employeeCode: true,
      designation: {
        select: {
          name: true,
        },
      },
    };
  }

  async create(dto: CreateTeacherDto) {
    const tenantClient = this.tenantConnection.getTenantClient();
    const publicClient = this.prisma.client;
    const schemaName = this.tenantConnection.getTenantSchema();

    // 1. Generate unique employeeCode
    let employeeCode = '';
    let isUnique = false;
    let counter = (await tenantClient.teacher.count()) + 1;

    while (!isUnique) {
      employeeCode = `TCH-${String(counter).padStart(3, '0')}`;
      const existing = await tenantClient.teacher.findFirst({
        where: { employeeCode },
      });
      if (!existing) {
        isUnique = true;
      } else {
        counter++;
      }
    }

    // 2. Create User in public schema
    const defaultPassword = dto.phone || 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await publicClient.user.create({
      data: {
        email: dto.email || null,
        phone: dto.phone,
        password: hashedPassword,
        schemaName: schemaName,
        role: Role.TEACHER,
      },
    });

    // 3. Create UserProfile in public schema
    const nameParts = dto.fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    await publicClient.userProfile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        gender: dto.gender,
        dob: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        bloodGroup: dto.bloodGroup,
        religion: dto.religion,
        nationality: dto.nationality,
        phone: dto.phone,
      },
    });

    // 4. Map data and create Teacher in tenant schema
    const data = this.mapData(dto);
    data.employeeCode = employeeCode;
    data.userId = user.id;

    return tenantClient.teacher.create({
      data,
    });
  }

  async findShortList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.teacher.findMany({
      where: { deletedAt: null, status: 'active' },
      select: this.getShortListSelect(),
      orderBy: { fullName: 'asc' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Teachers short list retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };
    const splitFilter = (value?: string) =>
      value
        ?.split(',')
        .map((item) => item.trim())
        .filter(Boolean) || [];

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const statuses = splitFilter(query.status);
    if (statuses.length) {
      where.status = { in: statuses };
    }

    const designationIds = splitFilter(query.designationId);
    if (designationIds.length) {
      where.designationId = { in: designationIds };
    }

    const departmentIds = splitFilter(query.departmentId);
    if (departmentIds.length) {
      where.departmentId = { in: departmentIds };
    }

    if (query.divisionId) {
      where.divisionId = parseInt(query.divisionId);
    }

    if (query.districtId) {
      where.districtId = parseInt(query.districtId);
    }

    if (query.upazilaId) {
      where.upazilaId = parseInt(query.upazilaId);
    }

    const bloodGroups = splitFilter(query.bloodGroup);
    if (bloodGroups.length) {
      where.bloodGroup = { in: bloodGroups };
    }

    const genders = splitFilter(query.gender);
    if (genders.length) {
      where.gender = { in: genders };
    }

    const employmentTypes = splitFilter(query.employmentType);
    if (employmentTypes.length) {
      where.employmentType = { in: employmentTypes };
    }

    const primarySubjectIds = splitFilter(query.primarySubjectId);
    if (primarySubjectIds.length) {
      where.primarySubjectId = { in: primarySubjectIds };
    }

    if (query.isMpoListed !== undefined && query.isMpoListed !== '') {
      where.isMpoListed = query.isMpoListed === 'true';
    }

    if (query.ntrcaRegistered !== undefined && query.ntrcaRegistered !== '') {
      where.ntrcaRegistered = query.ntrcaRegistered === 'true';
    }

    if (query.joiningDateStart && query.joiningDateEnd) {
      where.joiningDate = {
        gte: new Date(query.joiningDateStart),
        lte: new Date(query.joiningDateEnd),
      };
    }

    const [items, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Teachers retrieved successfully',
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
    const prisma = this.tenantConnection.getTenantClient();
    const teacher = await prisma.teacher.findFirst({
      where: { id, deletedAt: null },
      include: {
        designation: true,
        department: true,
        division: true,
        district: true,
        upazila: true,
        primarySubject: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    const specializationSubjectIds = Array.isArray(teacher.specializationSubjects)
      ? teacher.specializationSubjects.filter(
          (subjectId: unknown): subjectId is string => typeof subjectId === 'string',
        )
      : [];
    const specializationSubjectItems = specializationSubjectIds.length
      ? await prisma.subject.findMany({
          where: {
            id: { in: specializationSubjectIds },
            deletedAt: null,
          },
          select: {
            id: true,
            enName: true,
            bnName: true,
            code: true,
          },
          orderBy: { enName: 'asc' },
        })
      : [];

    return {
      success: true,
      statusCode: 200,
      message: 'Teacher retrieved successfully',
      data: {
        ...teacher,
        specializationSubjectItems,
      },
      meta: null,
    };
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const tenantClient = this.tenantConnection.getTenantClient();
    const publicClient = this.prisma.client;
    const teacherResponse = await this.findOne(id);
    const teacher = teacherResponse.data as any;

    const updatedTeacher = await tenantClient.teacher.update({
      where: { id },
      data: this.mapData(dto),
    });

    if (teacher.userId) {
      if (dto.email !== undefined || dto.phone !== undefined) {
        const userData: any = {};
        if (dto.email !== undefined) userData.email = dto.email || null;
        if (dto.phone !== undefined) userData.phone = dto.phone;

        await publicClient.user.update({
          where: { id: teacher.userId },
          data: userData,
        });
      }

      if (
        dto.fullName !== undefined ||
        dto.gender !== undefined ||
        dto.dateOfBirth !== undefined ||
        dto.bloodGroup !== undefined ||
        dto.religion !== undefined ||
        dto.nationality !== undefined ||
        dto.phone !== undefined
      ) {
        const profileData: any = {};

        if (dto.fullName !== undefined) {
          const nameParts = dto.fullName.trim().split(' ');
          profileData.firstName = nameParts[0];
          profileData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        }
        if (dto.gender !== undefined) profileData.gender = dto.gender;
        if (dto.dateOfBirth !== undefined) profileData.dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
        if (dto.bloodGroup !== undefined) profileData.bloodGroup = dto.bloodGroup;
        if (dto.religion !== undefined) profileData.religion = dto.religion;
        if (dto.nationality !== undefined) profileData.nationality = dto.nationality;
        if (dto.phone !== undefined) profileData.phone = dto.phone;

        await publicClient.userProfile.updateMany({
          where: { userId: teacher.userId },
          data: profileData,
        });
      }
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Teacher updated successfully',
      data: updatedTeacher,
      meta: null,
    };
  }

  async updateEmploymentStatus(id: string, status: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    const teacher = await prisma.teacher.update({
      where: { id },
      data: { status },
      select: this.getListSelect(),
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Teacher employment status updated successfully',
      data: teacher,
      meta: null,
    };
  }

  async removeDocument(id: string, documentId: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const teacherResponse = await this.findOne(id);
    const teacher = teacherResponse.data as any;
    const documents = Array.isArray(teacher.documents) ? teacher.documents : [];

    const updatedDocuments = documents.filter((doc: any, index: number) => {
      const key = doc?.mediaId || doc?.id || String(index);
      return key !== documentId;
    });

    if (updatedDocuments.length === documents.length) {
      throw new NotFoundException('Teacher document not found');
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id },
      data: { documents: updatedDocuments },
      include: {
        designation: true,
        department: true,
        division: true,
        district: true,
        upazila: true,
        primarySubject: true,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Teacher document deleted successfully',
      data: updatedTeacher,
      meta: null,
    };
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    const teacher = await prisma.teacher.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'terminated' },
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Teacher deleted successfully',
      data: teacher,
      meta: null,
    };
  }
}
