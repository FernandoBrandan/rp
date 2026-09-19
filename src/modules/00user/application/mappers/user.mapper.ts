import { User } from '@user/domain/user.entity';
import { UserResponseDTO } from '../dto/response/user.response.dto';

export class UserMapper {
  static toResponse(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.email.getValue(),
      role: user.role,
    };
  }
}
