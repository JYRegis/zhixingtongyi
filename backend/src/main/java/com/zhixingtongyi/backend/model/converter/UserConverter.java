package com.zhixingtongyi.backend.model.converter;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.zhixingtongyi.backend.model.dto.RegisterRequest;
import com.zhixingtongyi.backend.model.dto.WechatLoginRequest;
import com.zhixingtongyi.backend.model.entity.User;
import com.zhixingtongyi.backend.model.vo.UserVO;
import org.mapstruct.Mapper;

// componentModel = "spring" 表示生成的实现类会加上 @Component 注解，可以被 Spring 直接注入
@Mapper(componentModel = "spring")
public interface UserConverter {

    User toEntity(RegisterRequest dto);

    User toEntity(WechatLoginRequest dto);

    UserVO toVO(User entity);

    Page<UserVO> toVO(Page<User> entityList);
}
