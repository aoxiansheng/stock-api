import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { UserRole } from "../enums/user-role.enum";

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: "users",
})
export class User {
  id?: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, minlength: 6 })
  passwordHash: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.DEVELOPER,
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastLoginAt: Date;

  @Prop()
  refreshToken?: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 创建索引
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

// 自定义JSON序列化 - 遵循开发规范
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  // 转换_id为id
  user.id = user._id.toString();
  delete user._id;
  delete user.__v;
  // 移除敏感字段
  delete user.passwordHash;
  delete user.refreshToken;
  return user;
};
