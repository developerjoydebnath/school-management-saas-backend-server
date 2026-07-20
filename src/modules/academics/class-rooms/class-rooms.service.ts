import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { CreateClassRoomDto, UpdateClassRoomDto } from './dto/class-room.dto';

@Injectable()
export class ClassRoomsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private normalizeStatus(status?: string) {
    return status?.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
  }

  private async assertUniqueRoomNo(roomNo: string, currentId?: string) {
    const prisma = this.tenantConnection.getTenantClient();
    const existing = await prisma.classRoom.findFirst({
      where: {
        roomNo: { equals: roomNo, mode: 'insensitive' },
        deletedAt: null,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A class room with this room number already exists');
    }
  }

  private mapData(dto: CreateClassRoomDto | UpdateClassRoomDto) {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.roomNo !== undefined ? { roomNo: dto.roomNo } : {}),
      ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      ...(dto.floor !== undefined ? { floor: dto.floor || null } : {}),
      ...(dto.building !== undefined ? { building: dto.building || null } : {}),
      ...(dto.highBench !== undefined ? { highBench: dto.highBench } : {}),
      ...(dto.lowBench !== undefined ? { lowBench: dto.lowBench } : {}),
      ...(dto.chair !== undefined ? { chair: dto.chair } : {}),
      ...(dto.table !== undefined ? { table: dto.table } : {}),
      ...(dto.board !== undefined ? { board: dto.board } : {}),
      ...(dto.projector !== undefined ? { projector: dto.projector } : {}),
      ...(dto.fan !== undefined ? { fan: dto.fan } : {}),
      ...(dto.light !== undefined ? { light: dto.light } : {}),
      ...(dto.hasAc !== undefined ? { hasAc: dto.hasAc } : {}),
      ...(dto.hasCctv !== undefined ? { hasCctv: dto.hasCctv } : {}),
      ...(dto.status !== undefined ? { status: this.normalizeStatus(dto.status) } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
    };
  }

  private getListSelect() {
    return {
      id: true,
      name: true,
      roomNo: true,
      capacity: true,
      floor: true,
      building: true,
      highBench: true,
      lowBench: true,
      chair: true,
      table: true,
      status: true,
    };
  }

  private getActiveListSelect() {
    return {
      id: true,
      name: true,
      roomNo: true,
      capacity: true,
      status: true,
    };
  }

  async create(dto: CreateClassRoomDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.assertUniqueRoomNo(dto.roomNo);

    return prisma.classRoom.create({
      data: {
        name: dto.name,
        roomNo: dto.roomNo,
        capacity: dto.capacity,
        floor: dto.floor || null,
        building: dto.building || null,
        highBench: dto.highBench ?? 0,
        lowBench: dto.lowBench ?? 0,
        chair: dto.chair ?? 0,
        table: dto.table ?? 0,
        board: dto.board ?? 0,
        projector: dto.projector ?? 0,
        fan: dto.fan ?? 0,
        light: dto.light ?? 0,
        hasAc: dto.hasAc ?? false,
        hasCctv: dto.hasCctv ?? false,
        description: dto.description || null,
        status: this.normalizeStatus(dto.status),
      },
    });
  }

  async findActiveList() {
    const prisma = this.tenantConnection.getTenantClient();
    const items = await prisma.classRoom.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: this.getActiveListSelect(),
      orderBy: [{ roomNo: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      statusCode: 200,
      message: 'Active class rooms retrieved successfully',
      data: items,
      meta: null,
    };
  }

  async findAll(query: any = {}) {
    const prisma = this.tenantConnection.getTenantClient();
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.max(Number(query.limit) || 10, 1);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { roomNo: { contains: query.search, mode: 'insensitive' } },
        { building: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = {
        in: String(query.status)
          .split(',')
          .map((status) => status.trim().toUpperCase())
          .filter(Boolean),
      };
    }

    const [items, total] = await Promise.all([
      prisma.classRoom.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.getListSelect(),
        orderBy: [{ roomNo: 'asc' }, { name: 'asc' }],
      }),
      prisma.classRoom.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Class rooms retrieved successfully',
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
    const room = await prisma.classRoom.findFirst({
      where: { id, deletedAt: null },
    });
    if (!room) {
      throw new NotFoundException('Class room not found');
    }
    return room;
  }

  async update(id: string, dto: UpdateClassRoomDto) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    if (dto.roomNo) {
      await this.assertUniqueRoomNo(dto.roomNo, id);
    }

    return prisma.classRoom.update({
      where: { id },
      data: this.mapData(dto),
    });
  }

  async remove(id: string) {
    const prisma = this.tenantConnection.getTenantClient();
    await this.findOne(id);

    const used = await prisma.sessionClassSection.count({
      where: { roomId: id, deletedAt: null },
    });
    if (used > 0) {
      throw new BadRequestException('This class room is assigned to a class');
    }

    return prisma.classRoom.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }
}
