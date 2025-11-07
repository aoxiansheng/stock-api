import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ApiKeyDocument = ApiKey & Document;

export type ApiKeyProfile = "READ" | "ADMIN";

@Schema({ timestamps: true, collection: "api_keys" })
export class ApiKey {
  @Prop({ required: true, unique: true })
  appKey: string;

  @Prop({ required: true, unique: true })
  accessToken: string;

  // 极简：直接存档位即可（默认 READ）
  @Prop({ type: String, enum: ["READ", "ADMIN"], default: "READ" })
  profile: ApiKeyProfile;

  // 可选轻量限速（默认不启用）
  @Prop({ type: Object, required: false })
  rateLimit?: { limit: number; window: string };

  @Prop({ type: String, default: "active" })
  status: string;

  @Prop({})
  expiresAt?: Date;

  @Prop({})
  deletedAt?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

