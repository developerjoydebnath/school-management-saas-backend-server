import * as fs from 'fs';
import * as path from 'path';

export type LocationType = 'divisions' | 'districts' | 'upazilas' | 'unions';

export class LocationsSyncUtil {
  private static getFilePath(): string {
    return path.join(
      process.cwd(),
      'prisma',
      'seeders',
      'updated-locations.json',
    );
  }

  private static readData(): any {
    const filePath = this.getFilePath();
    if (!fs.existsSync(filePath)) {
      throw new Error(`Seed file not found at ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  private static writeData(data: any): void {
    const filePath = this.getFilePath();
    // Pretty-print the JSON to maintain readability
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  static addRecord(type: LocationType, record: any): void {
    const data = this.readData();
    if (!data[type]) {
      data[type] = [];
    }
    data[type].push(record);
    this.writeData(data);
  }

  static updateRecord(
    type: LocationType,
    id: number,
    updatedRecord: any,
  ): void {
    const data = this.readData();
    if (data[type]) {
      const index = data[type].findIndex((item: any) => item.id === id);
      if (index !== -1) {
        data[type][index] = { ...data[type][index], ...updatedRecord };
        this.writeData(data);
      }
    }
  }

  static deleteRecord(type: LocationType, id: number): void {
    const data = this.readData();
    if (data[type]) {
      const initialLength = data[type].length;
      data[type] = data[type].filter((item: any) => item.id !== id);
      if (data[type].length !== initialLength) {
        this.writeData(data);
      }
    }
  }
}
