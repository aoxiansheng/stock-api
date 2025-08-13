import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({
  timestamps: true,
  collection: "stored_data",
})
export class StoredData {
  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  data: any;

  @Prop({ required: true, index: true })
  storageClassification: string;

  @Prop({ required: true, index: true })
  provider: string;

  @Prop({ required: true, index: true })
  market: string;

  @Prop({ type: Number })
  dataSize: number;

  @Prop({ type: Boolean, default: false })
  compressed: boolean;

  @Prop({ type: Object })
  tags?: Record<string, string>;

  @Prop({ type: Date, index: true })
  expiresAt?: Date;

  @Prop({ type: Date, default: Date.now, index: true })
  storedAt: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export type StoredDataDocument = StoredData & Document;
export const StoredDataSchema = SchemaFactory.createForClass(StoredData);

// 自定义JSON序列化 - 统一输出格式
StoredDataSchema.methods.toJSON = function () {
  const storedData = this.toObject();
  // 转换_id为id，统一API响应格式
  storedData.id = storedData._id.toString();
  delete storedData._id;
  delete storedData.__v;
  return storedData;
};

// Add compound indexes for better query performance
StoredDataSchema.index({ storageClassification: 1, provider: 1, market: 1 });
StoredDataSchema.index({ storedAt: -1 });
StoredDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Add text index for key search
StoredDataSchema.index({ key: "text" });
