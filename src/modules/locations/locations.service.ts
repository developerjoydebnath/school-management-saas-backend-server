import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import {
  CreateDistrictDto,
  CreateDivisionDto,
  CreateUnionDto,
  CreateUpazilaDto,
  UpdateDistrictDto,
  UpdateDivisionDto,
  UpdateUnionDto,
  UpdateUpazilaDto,
} from './dto/locations.dto';
import { LocationsSyncUtil } from './locations-sync.util';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================
  // DIVISIONS
  // ==========================

  async getDivisions() {
    const divisions = await this.prisma.division.findMany({
      orderBy: { id: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Divisions retrieved successfully',
      data: divisions,
      meta: null,
    };
  }

  async createDivision(data: CreateDivisionDto) {
    const division = await this.prisma.division.create({ data });
    LocationsSyncUtil.addRecord('divisions', division);
    return {
      success: true,
      statusCode: 201,
      message: 'Division created successfully',
      data: division,
      meta: null,
    };
  }

  async updateDivision(id: number, data: UpdateDivisionDto) {
    const division = await this.prisma.division.update({
      where: { id },
      data,
    });
    LocationsSyncUtil.updateRecord('divisions', id, division);
    return {
      success: true,
      statusCode: 200,
      message: 'Division updated successfully',
      data: division,
      meta: null,
    };
  }

  async deleteDivision(id: number) {
    await this.prisma.division.delete({ where: { id } });
    LocationsSyncUtil.deleteRecord('divisions', id);
    return {
      success: true,
      statusCode: 200,
      message: 'Division deleted successfully',
      data: null,
      meta: null,
    };
  }

  // ==========================
  // DISTRICTS
  // ==========================

  async getDistricts(divisionId: number) {
    const districts = await this.prisma.district.findMany({
      where: { divisionId },
      orderBy: { id: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Districts retrieved successfully',
      data: districts,
      meta: null,
    };
  }

  async createDistrict(data: CreateDistrictDto) {
    const district = await this.prisma.district.create({ data });
    LocationsSyncUtil.addRecord('districts', district);
    return {
      success: true,
      statusCode: 201,
      message: 'District created successfully',
      data: district,
      meta: null,
    };
  }

  async updateDistrict(id: number, data: UpdateDistrictDto) {
    const district = await this.prisma.district.update({
      where: { id },
      data,
    });
    LocationsSyncUtil.updateRecord('districts', id, district);
    return {
      success: true,
      statusCode: 200,
      message: 'District updated successfully',
      data: district,
      meta: null,
    };
  }

  async deleteDistrict(id: number) {
    await this.prisma.district.delete({ where: { id } });
    LocationsSyncUtil.deleteRecord('districts', id);
    return {
      success: true,
      statusCode: 200,
      message: 'District deleted successfully',
      data: null,
      meta: null,
    };
  }

  // ==========================
  // UPAZILAS
  // ==========================

  async getUpazilas(districtId: number) {
    const upazilas = await this.prisma.upazila.findMany({
      where: { districtId },
      orderBy: { id: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Upazilas retrieved successfully',
      data: upazilas,
      meta: null,
    };
  }

  async createUpazila(data: CreateUpazilaDto) {
    const upazila = await this.prisma.upazila.create({ data });
    LocationsSyncUtil.addRecord('upazilas', upazila);
    return {
      success: true,
      statusCode: 201,
      message: 'Upazila created successfully',
      data: upazila,
      meta: null,
    };
  }

  async updateUpazila(id: number, data: UpdateUpazilaDto) {
    const upazila = await this.prisma.upazila.update({
      where: { id },
      data,
    });
    LocationsSyncUtil.updateRecord('upazilas', id, upazila);
    return {
      success: true,
      statusCode: 200,
      message: 'Upazila updated successfully',
      data: upazila,
      meta: null,
    };
  }

  async deleteUpazila(id: number) {
    await this.prisma.upazila.delete({ where: { id } });
    LocationsSyncUtil.deleteRecord('upazilas', id);
    return {
      success: true,
      statusCode: 200,
      message: 'Upazila deleted successfully',
      data: null,
      meta: null,
    };
  }

  // ==========================
  // UNIONS
  // ==========================

  async getUnions(upazilaId: number) {
    const unions = await this.prisma.union.findMany({
      where: { upazilaId },
      orderBy: { id: 'asc' },
    });
    return {
      success: true,
      statusCode: 200,
      message: 'Unions retrieved successfully',
      data: unions,
      meta: null,
    };
  }

  async createUnion(data: CreateUnionDto) {
    const union = await this.prisma.union.create({ data });
    LocationsSyncUtil.addRecord('unions', union);
    return {
      success: true,
      statusCode: 201,
      message: 'Union created successfully',
      data: union,
      meta: null,
    };
  }

  async updateUnion(id: number, data: UpdateUnionDto) {
    const union = await this.prisma.union.update({
      where: { id },
      data,
    });
    LocationsSyncUtil.updateRecord('unions', id, union);
    return {
      success: true,
      statusCode: 200,
      message: 'Union updated successfully',
      data: union,
      meta: null,
    };
  }

  async deleteUnion(id: number) {
    await this.prisma.union.delete({ where: { id } });
    LocationsSyncUtil.deleteRecord('unions', id);
    return {
      success: true,
      statusCode: 200,
      message: 'Union deleted successfully',
      data: null,
      meta: null,
    };
  }
}
