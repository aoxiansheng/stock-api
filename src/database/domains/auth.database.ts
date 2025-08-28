import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// 导入Auth相关Schema
import { User, UserSchema } from '../../auth/schemas/user.schema';
import { ApiKey, ApiKeySchema } from '../../auth/schemas/apikey.schema';

/**
 * 认证域数据库模块
 * 
 * 职责：
 * - 统一注册认证相关的Schema
 * - 提供认证数据模型访问能力
 * - 不包含业务逻辑，只负责数据层
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AuthDatabaseModule {}