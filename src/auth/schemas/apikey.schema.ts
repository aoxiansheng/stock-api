import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

import { Permission } from "../enums/user-role.enum";
import { OperationStatus } from "@common/types/enums/shared-base.enum";

export type ApiKeyDocument = ApiKey & Document;

/**
 * 速率限制配置
 */
@Schema({ _id: false })
export class RateLimit {
  @Prop({ type: Number, required: true, min: 1 })
  requestLimit: number;

  @Prop({ type: String, required: true })
  window: string; // 时间窗口，如 '1h', '1d', '1m'
}

const RateLimitSchema = SchemaFactory.createForClass(RateLimit);

@Schema({
  timestamps: true,
  collection: "api_keys",
})
export class ApiKey {
  @Prop({ required: true, unique: true })
  appKey: string;

  @Prop({ required: true, unique: true })
  accessToken: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  @Prop({
    type: [String],
    enum: Object.values(Permission),
    default: [
      Permission.DATA_READ,
      Permission.QUERY_EXECUTE,
      Permission.PROVIDERS_READ,
    ],
  })
  permissions: Permission[];

  @Prop({ type: RateLimitSchema, required: true })
  rateLimit: RateLimit;

  @Prop({
    type: String,
    enum: Object.values(OperationStatus),
    default: OperationStatus.ACTIVE,
  })
  status: OperationStatus;

  @Prop({ index: true })
  expiresAt?: Date;

  @Prop({ default: 0 })
  totalRequestCount: number;

  @Prop()
  lastAccessedAt?: Date;

  @Prop()
  deletedAt?: Date;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  // 时间戳字段由 @Schema({timestamps: true}) 自动管理，无需手动定义
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// 创建索引 (unique字段已通过@Prop装饰器自动创建索引)
ApiKeySchema.index({ userId: 1 });
ApiKeySchema.index({ status: 1 });
ApiKeySchema.index({ createdAt: 1 });

// 组合索引用于验证
ApiKeySchema.index({ appKey: 1, accessToken: 1 });

// 自定义JSON序列化 - 遵循开发规范
ApiKeySchema.methods.toJSON = function () {
  const apiKey = this.toObject();
  // 转换_id为id
  apiKey.id = apiKey._id.toString();
  delete apiKey._id;
  delete apiKey.__v;
  return apiKey;
};
