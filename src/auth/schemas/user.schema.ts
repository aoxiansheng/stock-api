import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

import { UserRole } from "../enums/user-role.enum";
import { CommonStatus } from "../enums/common-status.enum";
import { PASSWORD_CONSTRAINTS, USERNAME_CONSTRAINTS } from "../constants/validation.constants";

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
    minlength: USERNAME_CONSTRAINTS.MIN_LENGTH,
    maxlength: USERNAME_CONSTRAINTS.MAX_LENGTH,
  })
  username: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ 
    required: true, 
    minlength: PASSWORD_CONSTRAINTS.MIN_LENGTH 
  })
  passwordHash: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.DEVELOPER,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: Object.values(CommonStatus),
    default: CommonStatus.ACTIVE
  })
  status: CommonStatus;

  @Prop()
  lastAccessedAt?: Date;

  @Prop()
  refreshToken?: string;

  // 时间戳字段由 @Schema({timestamps: true}) 自动管理，无需手动定义
}

export const UserSchema = SchemaFactory.createForClass(User);

// 创建索引 (unique字段已通过@Prop装饰器自动创建索引)
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

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
