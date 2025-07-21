import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ApiKey, ApiKeyDocument } from '../schemas/apikey.schema';

@Injectable()
export class ApiKeyRepository {
  constructor(
    @InjectModel(ApiKey.name) private readonly apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  /**
   * 查找所有活跃的 API Key
   */
  async findAllActive(): Promise<ApiKeyDocument[]> {
    return this.apiKeyModel.find({ isActive: true }).exec();
  }
} 