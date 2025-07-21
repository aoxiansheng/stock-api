import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../schemas/user.schema';
@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    userDto: Pick<
      User,
      'username' | 'email' | 'passwordHash' | 'role' | 'isActive'
    >,
  ): Promise<UserDocument> {
    const user = new this.userModel(userDto);
    return user.save();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByUsernameOrEmail(
    username: string,
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        $or: [{ username }, { email }],
      })
      .exec();
  }

  /**
   * 根据用户名列表查找用户
   * @param usernames - 用户名数组
   */
  async findByUsernames(usernames: string[]): Promise<UserDocument[]> {
    return this.userModel.find({ username: { $in: usernames } }).exec();
  }
} 